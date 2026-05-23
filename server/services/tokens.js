// Token utilities — signing, verifying, refresh-token issuance/rotation/revocation.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const logger = require('../utils/logger');

const IS_PROD = process.env.NODE_ENV === 'production';

const JWT_SECRET = process.env.JWT_SECRET || (
  IS_PROD ? (() => { throw new Error('JWT_SECRET env var is required in production'); })()
          : 'mainstreet-dev-access-secret-CHANGE-ME'
);
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || (
  IS_PROD ? (() => { throw new Error('REFRESH_TOKEN_SECRET env var is required in production'); })()
          : 'mainstreet-dev-refresh-secret-CHANGE-ME'
);

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

function hashToken(token) {
  return crypto.createHmac('sha256', REFRESH_SECRET).update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('hex'); // 96 hex chars
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hash, expiresAt);
  return raw;
}

async function findRefreshToken(raw) {
  if (!raw) return null;
  const hash = hashToken(raw);
  const row = await db.prepare(
    'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?'
  ).get(hash);
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

async function revokeRefreshToken(raw) {
  if (!raw) return;
  const hash = hashToken(raw);
  await db.prepare('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?').run(hash);
}

async function revokeAllUserRefreshTokens(userId) {
  await db.prepare('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL').run(userId);
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

module.exports = {
  hashToken,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_TTL_DAYS,
};
