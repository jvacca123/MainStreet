const express = require('express');
const { query, queryOne } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeReadinessScore, readinessChecklist, gradeFor } = require('../scoring');

const router = express.Router();

const ALLOWED_FIELDS = [
  'background_type', 'location', 'experience_summary',
  'capital_range', 'sba_eligible', 'credit_score_range', 'business_experience',
  'preferred_industries', 'preferred_size', 'willing_to_relocate', 'wants_mentor',
  'motivation',
];

const VALID_BACKGROUND_TYPES = ['veteran', 'immigrant', 'employee', 'first_gen', 'other'];
const VALID_CAPITAL_RANGES = ['<100k', '100k-250k', '250k-500k', '500k-1m', '1m+'];
const VALID_CREDIT_RANGES = ['<600', '600-679', '680-739', '740+'];
const VALID_EXPERIENCE = ['none', 'employed', 'managed', 'owned'];
const VALID_SIZE_RANGES = ['<500k', '500k-1m', '1m-3m', '3m-10m'];

function normalize(input) {
  const out = {};
  for (const k of ALLOWED_FIELDS) out[k] = input[k];
  out.sba_eligible = out.sba_eligible ? true : false;
  out.willing_to_relocate = out.willing_to_relocate ? true : false;
  out.wants_mentor = out.wants_mentor !== undefined ? !!out.wants_mentor : true;
  if (Array.isArray(out.preferred_industries)) out.preferred_industries = JSON.stringify(out.preferred_industries);
  if (!out.preferred_industries) out.preferred_industries = '[]';
  if (out.motivation) out.motivation = String(out.motivation).replace(/<[^>]*>/g, '').trim().slice(0, 500);
  if (out.location) out.location = String(out.location).trim().slice(0, 200);
  if (out.experience_summary) out.experience_summary = String(out.experience_summary).replace(/<[^>]*>/g, '').trim().slice(0, 1000);
  return out;
}

function validate(p) {
  const errs = [];
  if (!p.background_type || !VALID_BACKGROUND_TYPES.includes(p.background_type)) errs.push('valid background_type required');
  if (!p.location) errs.push('location required');
  if (!p.capital_range || !VALID_CAPITAL_RANGES.includes(p.capital_range)) errs.push('valid capital_range required');
  if (!p.credit_score_range || !VALID_CREDIT_RANGES.includes(p.credit_score_range)) errs.push('valid credit_score_range required');
  if (!p.business_experience || !VALID_EXPERIENCE.includes(p.business_experience)) errs.push('valid business_experience required');
  if (!p.motivation) errs.push('motivation required');
  if (p.preferred_size && !VALID_SIZE_RANGES.includes(p.preferred_size)) errs.push('valid preferred_size required');
  return errs;
}

const LEARNING_MODULES = [
  { id: 'valuation', title: 'Understanding Business Valuation', blurb: 'How sellers price businesses and where buyers find room.', comingSoon: true },
  { id: 'sba', title: 'SBA Loans Explained for First-Time Buyers', blurb: 'Walk through the 7(a) program from pre-qualification to close.', comingSoon: true },
  { id: 'dd', title: 'Due Diligence 101', blurb: 'The 30-day playbook for vetting financials, customers, and risk.', comingSoon: true },
  { id: 'negotiation', title: 'Negotiating Your First Acquisition', blurb: 'Earn-outs, seller financing, and how to structure a fair deal.', comingSoon: true },
];

router.post('/profile', requireAuth, requireRole('buyer'), async (req, res, next) => {
  try {
    const data = normalize(req.body || {});
    const errs = validate(data);
    if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errs.join(', ') } });

    const existing = await queryOne('SELECT user_id FROM buyer_profiles WHERE user_id = $1', [req.user.id]);
    const checklist = JSON.stringify(readinessChecklist(data));

    if (existing) {
      await query(
        `UPDATE buyer_profiles SET
          background_type=$1, location=$2, experience_summary=$3,
          capital_range=$4, sba_eligible=$5, credit_score_range=$6, business_experience=$7,
          preferred_industries=$8, preferred_size=$9, willing_to_relocate=$10, wants_mentor=$11,
          motivation=$12, updated_at=NOW()
        WHERE user_id=$13`,
        [
          data.background_type, data.location, data.experience_summary,
          data.capital_range, data.sba_eligible, data.credit_score_range, data.business_experience,
          data.preferred_industries, data.preferred_size || null, data.willing_to_relocate, data.wants_mentor,
          data.motivation, req.user.id,
        ],
      );
    } else {
      await query(
        `INSERT INTO buyer_profiles (
          user_id, background_type, location, experience_summary,
          capital_range, sba_eligible, credit_score_range, business_experience,
          preferred_industries, preferred_size, willing_to_relocate, wants_mentor,
          motivation, checklist_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          req.user.id, data.background_type, data.location, data.experience_summary,
          data.capital_range, data.sba_eligible, data.credit_score_range, data.business_experience,
          data.preferred_industries, data.preferred_size || null, data.willing_to_relocate, data.wants_mentor,
          data.motivation, checklist,
        ],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', requireAuth, requireRole('buyer'), async (req, res, next) => {
  try {
    const row = await queryOne(
      'SELECT u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.id = $1',
      [req.user.id],
    );
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found. Complete onboarding first.' } });

    const score = computeReadinessScore(row);
    let checklist = [];
    try { checklist = JSON.parse(row.checklist_json || '[]'); } catch { checklist = readinessChecklist(row); }
    if (!checklist.length) checklist = readinessChecklist(row);

    let preferredIndustries = [];
    try { preferredIndustries = JSON.parse(row.preferred_industries || '[]'); } catch { /* */ }

    res.json({
      profile: {
        id: row.user_id,
        email: row.email,
        fullName: row.full_name,
        backgroundType: row.background_type,
        location: row.location,
        experienceSummary: row.experience_summary,
        capitalRange: row.capital_range,
        sbaEligible: !!row.sba_eligible,
        creditScoreRange: row.credit_score_range,
        businessExperience: row.business_experience,
        preferredIndustries,
        preferredSize: row.preferred_size,
        willingToRelocate: !!row.willing_to_relocate,
        wantsMentor: !!row.wants_mentor,
        motivation: row.motivation,
      },
      readinessScore: score,
      grade: gradeFor(score),
      checklist,
      learningModules: LEARNING_MODULES,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/checklist', requireAuth, requireRole('buyer'), async (req, res, next) => {
  try {
    const { id, done } = req.body || {};
    if (!id || typeof id !== 'string') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id required.' } });
    const row = await queryOne('SELECT checklist_json FROM buyer_profiles WHERE user_id = $1', [req.user.id]);
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
    let checklist = [];
    try { checklist = JSON.parse(row.checklist_json); } catch { checklist = []; }
    const updated = checklist.map((t) => (t.id === id ? { ...t, done: !!done } : t));
    await query('UPDATE buyer_profiles SET checklist_json = $1, updated_at = NOW() WHERE user_id = $2', [JSON.stringify(updated), req.user.id]);
    res.json({ checklist: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
