const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requireVerifiedEmail } = require('../middleware/auth');
const v = require('../validators');
const { invalidateMatchesCache } = require('../matching');
const {
  computeReadinessScore,
  readinessChecklist,
  gradeFor,
} = require('../scoring');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

const FIELDS = [
  'background_type', 'location', 'experience_summary',
  'capital_range', 'sba_eligible', 'credit_score_range', 'business_experience',
  'preferred_industries', 'preferred_size', 'willing_to_relocate', 'wants_mentor',
  'motivation',
];

router.post('/profile', requireAuth, requireVerifiedEmail, requireRole('buyer'), v.buyerProfile, async (req, res, next) => {
  try {
    const data = {};
    for (const k of FIELDS) data[k] = req.body[k];
    if (Array.isArray(data.preferred_industries)) data.preferred_industries = JSON.stringify(data.preferred_industries);
    if (!data.preferred_industries) data.preferred_industries = '[]';
    data.sba_eligible = !!data.sba_eligible;
    data.willing_to_relocate = !!data.willing_to_relocate;
    data.wants_mentor = !!data.wants_mentor;

    const existing = await db.prepare('SELECT user_id FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
    if (existing) {
      const setClauses = FIELDS.map((k) => `${k} = ?`).join(', ');
      const values = FIELDS.map((k) => data[k]);
      await db.prepare(
        `UPDATE buyer_profiles SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      ).run(...values, req.user.id);
    } else {
      const checklist = JSON.stringify(readinessChecklist(data));
      const cols = ['user_id', ...FIELDS, 'checklist_json'];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [req.user.id, ...FIELDS.map((k) => data[k]), checklist];
      await db.prepare(
        `INSERT INTO buyer_profiles (${cols.join(', ')}) VALUES (${placeholders})`
      ).run(...values);
    }
    invalidateMatchesCache(req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/profile', requireAuth, requireVerifiedEmail, requireRole('buyer'), async (req, res, next) => {
  try {
    const row = await db.prepare(
      'SELECT u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL'
    ).get(req.user.id);
    if (!row) throw new NotFoundError('Profile not found. Complete onboarding first.');

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
        { id: 'valuation',   title: 'Understanding Business Valuation',          blurb: 'How sellers price businesses and where buyers add room.',  status: 'coming_soon' },
        { id: 'sba',         title: 'SBA Loans Explained for First-Time Buyers', blurb: 'The 7(a) program from pre-qualification to close.',        status: 'coming_soon' },
        { id: 'dd',          title: 'Due Diligence 101',                          blurb: 'A 30-day playbook for vetting financials and risk.',        status: 'coming_soon' },
        { id: 'negotiation', title: 'Negotiating Your First Acquisition',         blurb: 'Earn-outs, seller financing, structuring a fair deal.',    status: 'coming_soon' },
      ],
    });
  } catch (err) { next(err); }
});

router.put('/checklist', requireAuth, requireVerifiedEmail, requireRole('buyer'), v.buyerChecklist, async (req, res, next) => {
  try {
    const { id, done } = req.body;
    const row = await db.prepare('SELECT checklist_json FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
    if (!row) throw new NotFoundError('Profile not found.');
    let checklist = [];
    try { checklist = JSON.parse(row.checklist_json); } catch { checklist = []; }
    const updated = checklist.map((t) => (t.id === id ? { ...t, done: !!done } : t));
    await db.prepare(
      'UPDATE buyer_profiles SET checklist_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).run(JSON.stringify(updated), req.user.id);
    res.json({ checklist: updated });
  } catch (err) { next(err); }
});

module.exports = router;
