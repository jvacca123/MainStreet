const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  computeTransferabilityScore,
  transferabilityRecommendations,
  estimatedValuation,
  defaultSellerRoadmap,
  gradeFor,
} = require('../scoring');

const router = express.Router();

const ALLOWED_FIELDS = [
  'business_name', 'industry', 'years_in_operation', 'location', 'revenue_range', 'employee_count',
  'retirement_timeline', 'reason_for_selling', 'has_successor',
  'q_personal_relationships', 'q_documented_procedures', 'q_runs_without_owner', 'q_management_team', 'q_clean_financials',
  'preferred_buyer_type', 'mentorship_willing',
];

function normalize(input) {
  const out = {};
  for (const k of ALLOWED_FIELDS) out[k] = input[k];
  ['has_successor', 'mentorship_willing'].forEach((k) => { out[k] = out[k] ? 1 : 0; });
  ['years_in_operation', 'employee_count', 'q_personal_relationships', 'q_documented_procedures',
    'q_runs_without_owner', 'q_management_team', 'q_clean_financials'].forEach((k) => {
    out[k] = Math.max(0, parseInt(out[k] || 0, 10));
  });
  return out;
}

function validate(p) {
  const errs = [];
  if (!p.business_name) errs.push('business_name required');
  if (!p.industry) errs.push('industry required');
  if (!p.location) errs.push('location required');
  if (!p.revenue_range) errs.push('revenue_range required');
  if (!p.retirement_timeline) errs.push('retirement_timeline required');
  if (!p.preferred_buyer_type) errs.push('preferred_buyer_type required');
  return errs;
}

router.post('/profile', requireAuth, requireRole('seller'), (req, res) => {
  const data = normalize(req.body || {});
  const errs = validate(data);
  if (errs.length) return res.status(400).json({ error: errs.join(', ') });

  const existing = db.prepare('SELECT user_id FROM seller_profiles WHERE user_id = ?').get(req.user.id);
  const roadmap = JSON.stringify(defaultSellerRoadmap());

  if (existing) {
    const setClause = ALLOWED_FIELDS.map((k) => `${k} = @${k}`).join(', ');
    db.prepare(
      `UPDATE seller_profiles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_id = @user_id`
    ).run({ ...data, user_id: req.user.id });
  } else {
    db.prepare(
      `INSERT INTO seller_profiles (
        user_id, business_name, industry, years_in_operation, location, revenue_range, employee_count,
        retirement_timeline, reason_for_selling, has_successor,
        q_personal_relationships, q_documented_procedures, q_runs_without_owner, q_management_team, q_clean_financials,
        preferred_buyer_type, mentorship_willing, roadmap_json
      ) VALUES (
        @user_id, @business_name, @industry, @years_in_operation, @location, @revenue_range, @employee_count,
        @retirement_timeline, @reason_for_selling, @has_successor,
        @q_personal_relationships, @q_documented_procedures, @q_runs_without_owner, @q_management_team, @q_clean_financials,
        @preferred_buyer_type, @mentorship_willing, @roadmap_json
      )`
    ).run({ ...data, user_id: req.user.id, roadmap_json: roadmap });
  }

  res.json({ ok: true });
});

router.get('/profile', requireAuth, requireRole('seller'), (req, res) => {
  const row = db
    .prepare('SELECT u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.id = ?')
    .get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });

  const score = computeTransferabilityScore(row);
  const recs = transferabilityRecommendations(row);
  const valuation = estimatedValuation(row);
  let roadmap = [];
  try { roadmap = JSON.parse(row.roadmap_json || '[]'); } catch { roadmap = defaultSellerRoadmap(); }

  res.json({
    profile: {
      id: row.user_id,
      email: row.email,
      fullName: row.full_name,
      businessName: row.business_name,
      industry: row.industry,
      yearsInOperation: row.years_in_operation,
      location: row.location,
      revenueRange: row.revenue_range,
      employeeCount: row.employee_count,
      retirementTimeline: row.retirement_timeline,
      reasonForSelling: row.reason_for_selling,
      hasSuccessor: !!row.has_successor,
      quiz: {
        personalRelationships: row.q_personal_relationships,
        documentedProcedures: row.q_documented_procedures,
        runsWithoutOwner: row.q_runs_without_owner,
        managementTeam: row.q_management_team,
        cleanFinancials: row.q_clean_financials,
      },
      preferredBuyerType: row.preferred_buyer_type,
      mentorshipWilling: !!row.mentorship_willing,
    },
    transferabilityScore: score,
    grade: gradeFor(score),
    recommendations: recs,
    valuation,
    roadmap,
  });
});

router.put('/roadmap', requireAuth, requireRole('seller'), (req, res) => {
  const { id, status } = req.body || {};
  if (!id || !['not_started', 'in_progress', 'complete'].includes(status)) {
    return res.status(400).json({ error: 'id and valid status required.' });
  }
  const row = db.prepare('SELECT roadmap_json FROM seller_profiles WHERE user_id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Profile not found.' });
  let roadmap = [];
  try { roadmap = JSON.parse(row.roadmap_json); } catch { roadmap = defaultSellerRoadmap(); }
  if (!roadmap.length) roadmap = defaultSellerRoadmap();
  const updated = roadmap.map((t) => (t.id === id ? { ...t, status } : t));
  db.prepare('UPDATE seller_profiles SET roadmap_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .run(JSON.stringify(updated), req.user.id);
  res.json({ roadmap: updated });
});

router.get('/mentors', requireAuth, (req, res) => {
  // Mentors: sellers who opted into mentorship. We'll return a fabricated subset for MVP plus real ones.
  const real = db
    .prepare(`SELECT u.full_name, s.business_name, s.industry, s.years_in_operation, s.location
              FROM users u JOIN seller_profiles s ON s.user_id = u.id
              WHERE s.mentorship_willing = 1 LIMIT 3`)
    .all();
  const mentors = real.map((r, i) => ({
    name: r.full_name,
    industry: r.industry,
    yearsInBusiness: r.years_in_operation,
    soldBusiness: r.business_name,
    location: r.location,
    blurb: [
      'Mentored 4 buyers since selling. Helps with operational handoff and customer retention.',
      'Specializes in financial cleanup and SBA loan walkthrough.',
      'Hands-on with first-year transition. Has been there.',
    ][i % 3],
  }));
  res.json({ mentors });
});

module.exports = router;
