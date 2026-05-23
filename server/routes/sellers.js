const express = require('express');
const { query, queryOne } = require('../db');
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

const VALID_INDUSTRIES = ['restaurant', 'auto repair', 'landscaping', 'bookkeeping', 'retail', 'hardware', 'manufacturing', 'professional services', 'service business', 'other'];
const VALID_REVENUE_RANGES = ['<500k', '500k-1m', '1m-3m', '3m-10m', '10m+'];
const VALID_TIMELINES = ['1-2', '3-5', '5-10'];
const VALID_BUYER_TYPES = ['employee', 'veteran', 'immigrant', 'community', 'open'];

function normalize(input) {
  const out = {};
  for (const k of ALLOWED_FIELDS) out[k] = input[k];
  out.has_successor = out.has_successor ? true : false;
  out.mentorship_willing = out.mentorship_willing ? true : false;
  ['years_in_operation', 'employee_count', 'q_personal_relationships', 'q_documented_procedures',
    'q_runs_without_owner', 'q_management_team', 'q_clean_financials'].forEach((k) => {
    out[k] = Math.max(0, parseInt(out[k] || 0, 10));
  });
  if (out.business_name) out.business_name = String(out.business_name).trim().slice(0, 200);
  if (out.location) out.location = String(out.location).trim().slice(0, 200);
  if (out.reason_for_selling) out.reason_for_selling = String(out.reason_for_selling).replace(/<[^>]*>/g, '').trim().slice(0, 1000);
  return out;
}

function validate(p) {
  const errs = [];
  if (!p.business_name) errs.push('business_name required');
  if (!p.industry || !VALID_INDUSTRIES.includes(p.industry)) errs.push('valid industry required');
  if (!p.location) errs.push('location required');
  if (!p.revenue_range || !VALID_REVENUE_RANGES.includes(p.revenue_range)) errs.push('valid revenue_range required');
  if (!p.retirement_timeline || !VALID_TIMELINES.includes(p.retirement_timeline)) errs.push('valid retirement_timeline required');
  if (!p.preferred_buyer_type || !VALID_BUYER_TYPES.includes(p.preferred_buyer_type)) errs.push('valid preferred_buyer_type required');
  if (p.q_personal_relationships < 1 || p.q_personal_relationships > 5) errs.push('q_personal_relationships must be 1-5');
  if (p.q_documented_procedures < 0 || p.q_documented_procedures > 2) errs.push('q_documented_procedures must be 0-2');
  if (p.q_runs_without_owner < 0 || p.q_runs_without_owner > 2) errs.push('q_runs_without_owner must be 0-2');
  if (p.q_management_team < 0 || p.q_management_team > 2) errs.push('q_management_team must be 0-2');
  if (p.q_clean_financials < 0 || p.q_clean_financials > 2) errs.push('q_clean_financials must be 0-2');
  return errs;
}

router.post('/profile', requireAuth, requireRole('seller'), async (req, res, next) => {
  try {
    const data = normalize(req.body || {});
    const errs = validate(data);
    if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errs.join(', ') } });

    const existing = await queryOne('SELECT user_id FROM seller_profiles WHERE user_id = $1', [req.user.id]);
    const roadmap = JSON.stringify(defaultSellerRoadmap());

    if (existing) {
      await query(
        `UPDATE seller_profiles SET
          business_name=$1, industry=$2, years_in_operation=$3, location=$4, revenue_range=$5, employee_count=$6,
          retirement_timeline=$7, reason_for_selling=$8, has_successor=$9,
          q_personal_relationships=$10, q_documented_procedures=$11, q_runs_without_owner=$12,
          q_management_team=$13, q_clean_financials=$14, preferred_buyer_type=$15, mentorship_willing=$16,
          updated_at=NOW()
        WHERE user_id=$17`,
        [
          data.business_name, data.industry, data.years_in_operation, data.location, data.revenue_range, data.employee_count,
          data.retirement_timeline, data.reason_for_selling, data.has_successor,
          data.q_personal_relationships, data.q_documented_procedures, data.q_runs_without_owner,
          data.q_management_team, data.q_clean_financials, data.preferred_buyer_type, data.mentorship_willing,
          req.user.id,
        ],
      );
    } else {
      await query(
        `INSERT INTO seller_profiles (
          user_id, business_name, industry, years_in_operation, location, revenue_range, employee_count,
          retirement_timeline, reason_for_selling, has_successor,
          q_personal_relationships, q_documented_procedures, q_runs_without_owner,
          q_management_team, q_clean_financials, preferred_buyer_type, mentorship_willing, roadmap_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          req.user.id, data.business_name, data.industry, data.years_in_operation, data.location, data.revenue_range, data.employee_count,
          data.retirement_timeline, data.reason_for_selling, data.has_successor,
          data.q_personal_relationships, data.q_documented_procedures, data.q_runs_without_owner,
          data.q_management_team, data.q_clean_financials, data.preferred_buyer_type, data.mentorship_willing, roadmap,
        ],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', requireAuth, requireRole('seller'), async (req, res, next) => {
  try {
    const row = await queryOne(
      'SELECT u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.id = $1',
      [req.user.id],
    );
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found. Complete onboarding first.' } });

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
  } catch (err) {
    next(err);
  }
});

router.put('/roadmap', requireAuth, requireRole('seller'), async (req, res, next) => {
  try {
    const { id, status } = req.body || {};
    if (!id || !['not_started', 'in_progress', 'complete'].includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id and valid status required.' } });
    }
    const row = await queryOne('SELECT roadmap_json FROM seller_profiles WHERE user_id = $1', [req.user.id]);
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
    let roadmap = [];
    try { roadmap = JSON.parse(row.roadmap_json); } catch { roadmap = defaultSellerRoadmap(); }
    if (!roadmap.length) roadmap = defaultSellerRoadmap();
    const updated = roadmap.map((t) => (t.id === id ? { ...t, status } : t));
    await query('UPDATE seller_profiles SET roadmap_json = $1, updated_at = NOW() WHERE user_id = $2', [JSON.stringify(updated), req.user.id]);
    res.json({ roadmap: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/mentors', requireAuth, async (req, res, next) => {
  try {
    const real = await query(
      `SELECT u.full_name, s.business_name, s.industry, s.years_in_operation, s.location
       FROM users u JOIN seller_profiles s ON s.user_id = u.id
       WHERE s.mentorship_willing = $1 AND u.deleted_at IS NULL LIMIT 3`,
      [true],
    );
    const mentors = real.rows.map((r) => ({
      name: r.full_name,
      industry: r.industry,
      yearsInBusiness: r.years_in_operation,
      soldBusiness: r.business_name,
      location: r.location,
    }));
    res.json({ mentors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
