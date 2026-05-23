const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { query, queryOne } = require('../db');
const { signAccessToken, signRefreshToken, verifyRefreshToken, requireAuth } = require('../middleware/auth');
const emailService = require('../services/email');
const logger = require('../services/logger');

const router = express.Router();
const IS_PROD = process.env.NODE_ENV === 'production';
const BCRYPT_ROUNDS = 12;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many verification emails sent. Try again in 1 hour.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

function validatePasswordStrength(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}

async function issueRefreshToken(userId, res) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt.toISOString()],
  );
  res.cookie('mainstreet_refresh', rawToken, cookieOpts());
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, role, fullName, termsAccepted } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email, password, and role are required.' } });
    }
    if (!['seller', 'buyer'].includes(role)) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'Role must be seller or buyer.' } });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email address.' } });
    }
    const pwError = validatePasswordStrength(password);
    if (pwError) return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: pwError } });
    if (!termsAccepted) {
      return res.status(400).json({ error: { code: 'TERMS_REQUIRED', message: 'You must accept the Terms of Service.' } });
    }
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with that email already exists.' } });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const sanitizedName = fullName ? String(fullName).trim().slice(0, 100) : null;
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, role, full_name, terms_accepted_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [normalizedEmail, passwordHash, role, sanitizedName],
    );
    const userId = rows[0].id;

    // Issue email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, verifyToken, expiresAt.toISOString()],
    );
    emailService.sendVerificationEmail({ email: normalizedEmail, full_name: sanitizedName }, verifyToken).catch(() => {});

    const user = { id: userId, email: normalizedEmail, role };
    const accessToken = signAccessToken(user);
    await issueRefreshToken(userId, res);

    logger.info('User registered', { userId, role });
    res.json({
      token: accessToken,
      user: { id: userId, email: normalizedEmail, role, fullName: sanitizedName, hasProfile: false, emailVerified: false },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email and password are required.' } });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await queryOne('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [normalizedEmail]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      logger.warn('Failed login attempt', { email: normalizedEmail, ip: req.ip });
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const profileTable = user.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
    const hasProfile = !!(await queryOne(`SELECT 1 FROM ${profileTable} WHERE user_id = $1`, [user.id]));

    const accessToken = signAccessToken(user);
    await issueRefreshToken(user.id, res);

    logger.info('User logged in', { userId: user.id, role: user.role });
    res.json({
      token: accessToken,
      user: {
        id: user.id, email: user.email, role: user.role,
        fullName: user.full_name, hasProfile,
        emailVerified: !!user.email_verified,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.mainstreet_refresh;
    if (!rawToken) {
      return res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token missing.' } });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await queryOne(
      'SELECT rt.*, u.email, u.role, u.full_name, u.deleted_at FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = $1',
      [tokenHash],
    );
    if (!stored || stored.deleted_at || new Date(stored.expires_at) < new Date()) {
      res.clearCookie('mainstreet_refresh', { path: '/api/auth' });
      return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid or expired.' } });
    }

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    const user = { id: stored.user_id, email: stored.email, role: stored.role };
    const accessToken = signAccessToken(user);
    await issueRefreshToken(stored.user_id, res);

    const profileTable = stored.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
    const hasProfile = !!(await queryOne(`SELECT 1 FROM ${profileTable} WHERE user_id = $1`, [stored.user_id]));

    res.json({
      token: accessToken,
      user: { id: stored.user_id, email: stored.email, role: stored.role, fullName: stored.full_name, hasProfile },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.mainstreet_refresh;
    await revokeRefreshToken(rawToken);
    res.clearCookie('mainstreet_refresh', { path: '/api/auth' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT id, email, role, full_name, email_verified FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    const profileTable = user.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
    const hasProfile = !!(await queryOne(`SELECT 1 FROM ${profileTable} WHERE user_id = $1`, [user.id]));
    res.json({
      user: {
        id: user.id, email: user.email, role: user.role,
        fullName: user.full_name, hasProfile,
        emailVerified: !!user.email_verified,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Verification token required.' } });
    const record = await queryOne(
      'SELECT * FROM email_verifications WHERE token = $1 AND verified_at IS NULL',
      [String(token).slice(0, 100)],
    );
    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired.' } });
    }
    await query('UPDATE users SET email_verified = $1 WHERE id = $2', [true, record.user_id]);
    await query('UPDATE email_verifications SET verified_at = NOW() WHERE id = $1', [record.id]);
    const user = await queryOne('SELECT email, full_name FROM users WHERE id = $1', [record.user_id]);
    if (user) emailService.sendWelcomeEmail(user).catch(() => {});
    res.json({ ok: true, message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', resendLimiter, requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT id, email, full_name, email_verified FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    if (user.email_verified) return res.status(400).json({ error: { code: 'ALREADY_VERIFIED', message: 'Email already verified.' } });

    await query('DELETE FROM email_verifications WHERE user_id = $1 AND verified_at IS NULL', [user.id]);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, verifyToken, expiresAt.toISOString()],
    );
    emailService.sendVerificationEmail(user, verifyToken).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    // Always return 200 to prevent user enumeration
    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await queryOne('SELECT id, email, full_name FROM users WHERE email = $1 AND deleted_at IS NULL', [normalizedEmail]);
      if (user) {
        await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await query(
          'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
          [user.id, tokenHash, expiresAt.toISOString()],
        );
        emailService.sendPasswordResetEmail(user, rawToken).catch(() => {});
      }
    }
    res.json({ ok: true, message: 'If an account exists, a reset email was sent.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Token and new password are required.' } });
    }
    const pwError = validatePasswordStrength(password);
    if (pwError) return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: pwError } });

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const record = await queryOne(
      'SELECT * FROM password_resets WHERE token_hash = $1 AND used_at IS NULL',
      [tokenHash],
    );
    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Reset token invalid or expired.' } });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);
    await query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [record.id]);
    // Invalidate all refresh tokens
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [record.user_id]);
    res.json({ ok: true, message: 'Password updated. Please log in.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
