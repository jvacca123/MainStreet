const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  computeReadinessScore,
  readinessChecklist,
  gradeFor,
} = require('../scoring');

const router = express.Router();

const ALLOWED_FIELDS = [
  'background_type', 'location', 'experience_summary',
  'capital_range', 'sba_eligible', 'credit_score_range', 'business_experience',
  'preferred_industries', 'preferred_size', 'willing_to_relocate', 'wants_mentor',
  'motivation',
];

function normalize(input) {
  const out = {};
  for (const k of ALLOWED_FIELDS) out[k] = input[k];
  ['sba_eligible', 'willing_to_relocate', 'wants_mentor'].forEach((k) => { out[k] = out[k] ? 1 : 0; });
  if (Array.isArray(out.preferred_industries)) out.preferred_industries = JSON.stringify(out.preferred_industries);
  if (!out.preferred_industries) out.preferred_industries = '[]';
  if (out.motivation && out.motivation.length > 500) out.motivation = out.motivation.slice(0, 500);
  return out;
}

function validate(p) {
  const errs = [];
  if (!p.background_type) errs.push('background_type required');
  if (!p.location) errs.push('location required');
  if (!p.capital_range) errs.push('capital_range required');
  if (!p.credit_score_range) errs.push('credit_score_range required');
  if (!p.business_experience) errs.push('business_experience required');
  if (!p.motivation) errs.push('motivation required');
  return errs;
}

router.post('/profile', requireAuth, requireRole('buyer'), (req, res) => {
  const data = normalize(req.body || {});
  const errs = validate(data);
  if (errs.length) return res.status(400).json({ error: errs.join(', ') });

  const existing = db.prepare('SELECT user_id FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
  const checklist = JSON.stringify(readinessChecklist(data));

  if (existing) {
    const setClause = ALLOWED_FIELDS.map((k) => `${k} = @${k}`).join(', ');
    db.prepare(
      `UPDATE buyer_profiles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_id = @user_id`
    ).run({ ...data, user_id: req.user.id });
  } else {
    db.prepare(
      `INSERT INTO buyer_profiles (
        user_id, background_type, location, experience_summary,
        capital_range, sba_eligible, credit_score_range, business_experience,
        preferred_industries, preferred_size, willing_to_relocate, wants_mentor,
        motivation, checklist_json
      ) VALUES (
        @user_id, @background_type, @location, @experience_summary,
        @capital_range, @sba_eligible, @credit_score_range, @business_experience,
        @preferred_industries, @preferred_size, @willing_to_relocate, @wants_mentor,
        @motivation, @checklist_json
      )`
    ).run({ ...data, user_id: req.user.id, checklist_json: checklist });
  }

  res.json({ ok: true });
});

router.get('/profile', requireAuth, requireRole('buyer'), (req, res) => {
  const row = db
    .prepare('SELECT u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.id = ?')
    .get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });

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
    learningModules: [
      { id: 'valuation', title: 'Understanding Business Valuation', blurb: 'How sellers price businesses and where buyers add room.', progress: 0 },
      { id: 'sba', title: 'SBA Loans Explained for First-Time Buyers', blurb: 'Walk through the 7(a) program from pre-qualification to close.', progress: 0 },
      { id: 'dd', title: 'Due Diligence 101', blurb: 'The 30-day playbook for vetting financials, customers, and risk.', progress: 0 },
      { id: 'negotiation', title: 'Negotiating Your First Acquisition', blurb: 'Earn-outs, seller financing, and how to structure a fair deal.', progress: 0 },
    ],
  });
});

router.put('/checklist', requireAuth, requireRole('buyer'), (req, res) => {
  const { id, done } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required.' });
  const row = db.prepare('SELECT checklist_json FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Profile not found.' });
  let checklist = [];
  try { checklist = JSON.parse(row.checklist_json); } catch { checklist = []; }
  const updated = checklist.map((t) => (t.id === id ? { ...t, done: !!done } : t));
  db.prepare('UPDATE buyer_profiles SET checklist_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .run(JSON.stringify(updated), req.user.id);
  res.json({ checklist: updated });
});

module.exports = router;
