const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('JWT_SECRET env var is required in production'); })()
  : 'mainstreet-dev-secret-change-me');

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('REFRESH_TOKEN_SECRET env var is required in production'); })()
  : 'mainstreet-dev-refresh-secret-change-me');

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' },
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authentication required' } });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    if (req.user.role !== role) return res.status(403).json({ error: { code: 'FORBIDDEN', message: `${role} role required` } });
    next();
  };
}

module.exports = { signAccessToken, signRefreshToken, verifyRefreshToken, requireAuth, requireRole, JWT_SECRET };
