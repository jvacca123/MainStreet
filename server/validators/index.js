// express-validator chains for every input the API accepts.

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

// Run validation chains and throw if any failed.
function runValidations(chains) {
  return async (req, res, next) => {
    for (const c of chains) await c.run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const list = errors.array().map((e) => ({ field: e.path, message: e.msg }));
      return next(new ValidationError(list[0]?.message || 'Validation failed', list));
    }
    next();
  };
}

const STRONG_PASSWORD_MSG =
  'Password must be at least 8 characters and include uppercase, lowercase, and a number.';

function isStrongPassword(v) {
  if (typeof v !== 'string') return false;
  if (v.length < 8) return false;
  if (!/[a-z]/.test(v)) return false;
  if (!/[A-Z]/.test(v)) return false;
  if (!/\d/.test(v)) return false;
  return true;
}

// Enums
const ROLES = ['seller', 'buyer'];
const REVENUE_RANGES = ['<500k', '500k-1m', '1m-3m', '3m-10m', '10m+'];
const TIMELINES = ['1-2', '3-5', '5-10'];
const BUYER_TYPES = ['employee', 'veteran', 'immigrant', 'community', 'first_gen', 'other', 'open'];
const BG_TYPES = ['veteran', 'immigrant', 'employee', 'first_gen', 'other'];
const CAPITAL_RANGES = ['<100k', '100k-250k', '250k-500k', '500k-1m', '1m+'];
const CREDIT_RANGES = ['<600', '600-679', '680-739', '740+'];
const EXPERIENCE = ['none', 'employed', 'managed', 'owned'];
const SIZES = ['<500k', '500k-1m', '1m-3m', '3m-10m'];
const INDUSTRIES = [
  'restaurant','auto repair','landscaping','bookkeeping','retail','hardware',
  'manufacturing','professional services','service business','other',
];
const ROADMAP_STATUSES = ['not_started', 'in_progress', 'complete'];

const v = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  register: runValidations([
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail().isLength({ max: 254 }),
    body('password').custom(isStrongPassword).withMessage(STRONG_PASSWORD_MSG),
    body('role').isIn(ROLES).withMessage('Role must be seller or buyer'),
    body('fullName').isString().trim().isLength({ min: 1, max: 120 }).withMessage('Full name is required'),
    body('termsAccepted').equals('true').withMessage('You must accept the Terms of Service and Privacy Policy'),
  ]),
  login: runValidations([
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
    body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
  ]),
  forgotPassword: runValidations([
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  ]),
  resetPassword: runValidations([
    body('token').isString().isLength({ min: 32, max: 256 }),
    body('password').custom(isStrongPassword).withMessage(STRONG_PASSWORD_MSG),
  ]),
  verifyEmail: runValidations([
    query('token').isString().isLength({ min: 32, max: 256 }),
  ]),
  resendVerification: runValidations([
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  ]),

  // ── Seller profile ───────────────────────────────────────────────────────
  sellerProfile: runValidations([
    body('business_name').isString().trim().isLength({ min: 1, max: 200 }).escape(),
    body('industry').isString().trim().toLowerCase().isIn(INDUSTRIES),
    body('years_in_operation').toInt().isInt({ min: 0, max: 200 }),
    body('location').isString().trim().isLength({ min: 2, max: 120 }),
    body('revenue_range').isIn(REVENUE_RANGES),
    body('employee_count').toInt().isInt({ min: 0, max: 100000 }),
    body('retirement_timeline').isIn(TIMELINES),
    body('reason_for_selling').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }).escape(),
    body('has_successor').toBoolean(),
    body('q_personal_relationships').toInt().isInt({ min: 1, max: 5 }),
    body('q_documented_procedures').toInt().isInt({ min: 0, max: 2 }),
    body('q_runs_without_owner').toInt().isInt({ min: 0, max: 2 }),
    body('q_management_team').toInt().isInt({ min: 0, max: 2 }),
    body('q_clean_financials').toInt().isInt({ min: 0, max: 2 }),
    body('preferred_buyer_type').isIn(BUYER_TYPES),
    body('mentorship_willing').toBoolean(),
  ]),
  sellerRoadmap: runValidations([
    body('id').isString().trim().isLength({ min: 1, max: 64 }),
    body('status').isIn(ROADMAP_STATUSES),
  ]),

  // ── Buyer profile ────────────────────────────────────────────────────────
  buyerProfile: runValidations([
    body('background_type').isIn(BG_TYPES),
    body('location').isString().trim().isLength({ min: 2, max: 120 }),
    body('experience_summary').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }).escape(),
    body('capital_range').isIn(CAPITAL_RANGES),
    body('sba_eligible').toBoolean(),
    body('credit_score_range').isIn(CREDIT_RANGES),
    body('business_experience').isIn(EXPERIENCE),
    body('preferred_industries').isArray({ max: INDUSTRIES.length }),
    body('preferred_industries.*').isIn(INDUSTRIES),
    body('preferred_size').optional({ checkFalsy: true }).isIn(SIZES),
    body('willing_to_relocate').toBoolean(),
    body('wants_mentor').toBoolean(),
    body('motivation').isString().trim().isLength({ min: 20, max: 500 }).escape(),
  ]),
  buyerChecklist: runValidations([
    body('id').isString().trim().isLength({ min: 1, max: 64 }),
    body('done').toBoolean(),
  ]),

  // ── Connections ──────────────────────────────────────────────────────────
  connectionRequest: runValidations([
    body('targetUserId').toInt().isInt({ min: 1 }),
    body('message').optional({ checkFalsy: true }).isString().trim().isLength({ max: 1000 }).escape(),
  ]),

  // ── Params ───────────────────────────────────────────────────────────────
  intIdParam: runValidations([
    param('userId').toInt().isInt({ min: 1 }),
  ]),
};

module.exports = v;
