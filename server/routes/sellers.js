const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requireVerifiedEmail } = require('../middleware/auth');
const v = require('../validators');
const { invalidateMatchesCache } = require('../matching');
const {
  computeTransferabilityScore,
  transferabilityRecommendations,
  estimatedValuation,
  defaultSellerRoadmap,
  gradeFor,
} = require('../scoring');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

const FIELDS = [
  'business_name', 'industry', 'years_in_operation', 'location', 'revenue_range', 'employee_count',
  'retirement_timeline', 'reason_for_selling', 'has_successor',
  'q_personal_relationships', 'q_documented_procedures', 'q_runs_without_owner',
  'q_management_team', 'q_clean_financials',
  'preferred_buyer_type', 'mentorship_willing',
];

router.post('/profile', requireAuth, requireVerifiedEmail, requireRole('seller'), v.sellerProfile, async (req, res, next) => {
  try {
    const data = {};
    for (const k of FIELDS) data[k] = req.body[k];
    data.has_successor = !!data.has_successor;
    data.mentorship_willing = !!data.mentorship_willing;

    const existing = await db.prepare('SELECT user_id FROM seller_profiles WHERE user_id = ?').get(req.user.id);
    if (existing) {
      const setClauses = FIELDS.map((k) => `${k} = ?`).join(', ');
      const values = FIELDS.map((k) => data[k]);
      await db.prepare(
        `UPDATE seller_profiles SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      ).run(...values, req.user.id);
    } else {
      const roadmap = JSON.stringify(defaultSellerRoadmap());
      const cols = ['user_id', ...FIELDS, 'roadmap_json'];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [req.user.id, ...FIELDS.map((k) => data[k]), roadmap];
      await db.prepare(
        `INSERT INTO seller_profiles (${cols.join(', ')}) VALUES (${placeholders})`
      ).run(...values);
    }

    invalidateMatchesCache(req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/profile', requireAuth, requireVerifiedEmail, requireRole('seller'), async (req, res, next) => {
  try {
    const row = await db.prepare(
      'SELECT u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL'
    ).get(req.user.id);
    if (!row) throw new NotFoundError('Profile not found. Complete onboarding first.');

    const score = computeTransferabilityScore(row);
    let roadmap = [];
    try { roadmap = JSON.parse(row.roadmap_json || '[]'); } catch { roadmap = defaultSellerRoadmap(); }
    if (!roadmap.length) roadmap = defaultSellerRoadmap();

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
      recommendations: transferabilityRecommendations(row),
      valuation: estimatedValuation(row),
      roadmap,
    });
  } catch (err) { next(err); }
});

router.put('/roadmap', requireAuth, requireVerifiedEmail, requireRole('seller'), v.sellerRoadmap, async (req, res, next) => {
  try {
    const { id, status } = req.body;
    const row = await db.prepare('SELECT roadmap_json FROM seller_profiles WHERE user_id = ?').get(req.user.id);
    if (!row) throw new NotFoundError('Profile not found.');
    let roadmap = [];
    try { roadmap = JSON.parse(row.roadmap_json); } catch { roadmap = defaultSellerRoadmap(); }
    if (!roadmap.length) roadmap = defaultSellerRoadmap();
    const updated = roadmap.map((t) => (t.id === id ? { ...t, status } : t));
    await db.prepare(
      'UPDATE seller_profiles SET roadmap_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).run(JSON.stringify(updated), req.user.id);
    res.json({ roadmap: updated });
  } catch (err) { next(err); }
});

router.get('/mentors', requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const real = await db.prepare(
      `SELECT u.full_name, s.business_name, s.industry, s.years_in_operation, s.location
       FROM users u JOIN seller_profiles s ON s.user_id = u.id
       WHERE s.mentorship_willing = ? AND u.deleted_at IS NULL
       LIMIT 6`
    ).all(true);

    const mentors = real.map((r) => ({
      name: r.full_name,
      industry: r.industry,
      yearsInBusiness: r.years_in_operation,
      soldBusiness: r.business_name,
      location: r.location,
    }));
    res.json({ mentors });
  } catch (err) { next(err); }
});

module.exports = router;
