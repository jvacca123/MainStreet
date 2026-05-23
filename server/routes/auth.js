const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, authLimiter, resendLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const v = require('../validators');
const logger = require('../utils/logger');
const email = require('../services/email');
const {
  signAccessToken,
  issueRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  hashToken,
} = require('../services/tokens');
const {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

// ── Audit helper ──────────────────────────────────────────────────────────
async function audit(userId, action, meta, req) {
  try {
    await db.prepare(
      'INSERT INTO audit_log (user_id, action, metadata, ip_address) VALUES (?, ?, ?, ?)'
    ).run(userId, action, meta ? JSON.stringify(meta) : null, req?.ip || null);
  } catch (e) {
    logger.warn('[audit] insert failed', { error: e.message });
  }
}

async function userResponseShape(user) {
  const profileTable = user.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
  const hp = await db.prepare(`SELECT 1 AS x FROM ${profileTable} WHERE user_id = ?`).get(user.id);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    emailVerified: !!user.email_verified,
    hasProfile: !!hp,
  };
}

async function issueAndRespond(res, user) {
  const accessToken = signAccessToken(user);
  const refreshRaw  = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshRaw);
  return { token: accessToken, user: await userResponseShape(user) };
}

// ── REGISTER ──────────────────────────────────────────────────────────────
router.post('/register', authLimiter, v.register, async (req, res, next) => {
  try {
    const { email: emailInput, password, role, fullName } = req.body;

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailInput);
    if (existing) throw new ConflictError('An account with that email already exists.');

    const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    const ins = await db.prepare(
      'INSERT INTO users (email, password_hash, role, full_name, terms_accepted_at) VALUES (?, ?, ?, ?, ?)'
    ).run(emailInput, password_hash, role, fullName, now);

    // Postgres doesn't return lastInsertRowid; fetch the user
    const user = ins.lastInsertRowid
      ? await db.prepare('SELECT * FROM users WHERE id = ?').get(ins.lastInsertRowid)
      : await db.prepare('SELECT * FROM users WHERE email = ?').get(emailInput);

    // Send verification email
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.prepare(
      'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, hashToken(token), expiresAt);
    try { await email.sendVerificationEmail(user, token); }
    catch (e) { logger.warn('[email] verification send failed', { error: e.message }); }

    await audit(user.id, 'register', { role }, req);

    const payload = await issueAndRespond(res, user);
    res.status(201).json(payload);
  } catch (err) { next(err); }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, v.login, async (req, res, next) => {
  try {
    const { email: emailInput, password } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(emailInput);
    if (!user) {
      logger.warn('[auth] login failed: user not found', { ip: req.ip, email: emailInput });
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      logger.warn('[auth] login failed: bad password', { ip: req.ip, userId: user.id });
      await audit(user.id, 'login_failed', null, req);
      throw new UnauthorizedError('Invalid email or password');
    }

    await audit(user.id, 'login', null, req);
    const payload = await issueAndRespond(res, user);
    res.json(payload);
  } catch (err) { next(err); }
});

// ── REFRESH ───────────────────────────────────────────────────────────────
router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    const row = await findRefreshToken(raw);
    if (!row) {
      clearRefreshCookie(res);
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    // Rotate: revoke old, issue new
    await revokeRefreshToken(raw);
    const user = await db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(row.user_id);
    if (!user) {
      clearRefreshCookie(res);
      throw new UnauthorizedError('Account no longer exists');
    }
    const payload = await issueAndRespond(res, user);
    res.json(payload);
  } catch (err) { next(err); }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (raw) await revokeRefreshToken(raw);
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── CURRENT USER ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(req.user.id);
    if (!user) throw new NotFoundError('User not found');
    res.json({ user: await userResponseShape(user) });
  } catch (err) { next(err); }
});

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────
router.get('/verify-email', v.verifyEmail, async (req, res, next) => {
  try {
    const token = req.query.token;
    const row = await db.prepare(
      'SELECT * FROM email_verifications WHERE token_hash = ?'
    ).get(hashToken(token));
    if (!row || row.verified_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new ValidationError('This verification link is invalid or has expired.');
    }
    await db.prepare('UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
    await db.prepare('UPDATE users SET email_verified = ? WHERE id = ?').run(true, row.user_id);
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    try { await email.sendWelcomeEmail(user); } catch (e) { logger.warn('[email] welcome send failed', { error: e.message }); }
    await audit(user.id, 'email_verified', null, req);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── RESEND VERIFICATION ───────────────────────────────────────────────────
router.post('/resend-verification', resendLimiter, v.resendVerification, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(req.body.email);
    // Always return ok to prevent enumeration
    if (user && !user.email_verified) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db.prepare(
        'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
      ).run(user.id, hashToken(token), expiresAt);
      try { await email.sendVerificationEmail(user, token); }
      catch (e) { logger.warn('[email] verification resend failed', { error: e.message }); }
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────
router.post('/forgot-password', passwordResetLimiter, v.forgotPassword, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(req.body.email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await db.prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
      ).run(user.id, hashToken(token), expiresAt);
      try { await email.sendPasswordResetEmail(user, token); }
      catch (e) { logger.warn('[email] reset send failed', { error: e.message }); }
      await audit(user.id, 'password_reset_requested', null, req);
    }
    // Always 200 to prevent enumeration
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────
router.post('/reset-password', passwordResetLimiter, v.resetPassword, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const row = await db.prepare(
      'SELECT * FROM password_resets WHERE token_hash = ?'
    ).get(hashToken(token));
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new ValidationError('This reset link is invalid or has expired.');
    }
    const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, row.user_id);
    await db.prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
    await revokeAllUserRefreshTokens(row.user_id);
    await audit(row.user_id, 'password_reset_completed', null, req);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports._audit = audit;
