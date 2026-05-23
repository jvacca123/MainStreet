// JWT auth middleware. Verifies the bearer access token and attaches req.user.

const { verifyAccessToken } = require('../services/tokens');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const db = require('../db');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedError('Missing access token');

    let payload;
    try { payload = verifyAccessToken(token); }
    catch { throw new UnauthorizedError('Invalid or expired access token'); }

    // Ensure the user still exists and isn't deleted
    const user = await db.prepare('SELECT id, email, role, full_name, email_verified, deleted_at FROM users WHERE id = ?').get(payload.id);
    if (!user || user.deleted_at) throw new UnauthorizedError('User no longer exists');

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      emailVerified: !!user.email_verified,
    };
    next();
  } catch (err) { next(err); }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.role !== role) return next(new ForbiddenError(`${role} role required`));
    next();
  };
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user) return next(new UnauthorizedError());
  if (!req.user.emailVerified) {
    return next(new ForbiddenError('Email verification required. Check your inbox for the verification link.'));
  }
  next();
}

module.exports = { requireAuth, requireRole, requireVerifiedEmail };
