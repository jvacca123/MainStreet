require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const migrate = require('./db/migrate');
const db = require('./db');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes    = require('./routes/auth');
const sellerRoutes  = require('./routes/sellers');
const buyerRoutes   = require('./routes/buyers');
const matchRoutes   = require('./routes/matches');
const userRoutes    = require('./routes/users');

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.disable('x-powered-by');

// Behind Render's proxy
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      // Vite injects an inline style for runtime; allow 'unsafe-inline' for styles only.
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || (IS_PROD ? '' : 'http://localhost:5173,http://127.0.0.1:5173'))
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin / curl
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true); // single-process prod (same origin)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// ── Body / cookie parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// ── Compression + global rate limit ───────────────────────────────────────
app.use(compression());
app.use('/api', globalLimiter);

// ── Request logging (dev only — Render captures stdout) ───────────────────
if (!IS_PROD) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.debug(`${req.method} ${req.originalUrl} → ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
}

// ── Health check (always public, no rate limit interference for Render) ──
app.get('/api/health', async (req, res) => {
  const dbOk = await db.healthCheck();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'down',
    driver: db.driver,
    env: process.env.NODE_ENV || 'development',
    uptime: Math.round(process.uptime()),
    version: require('./package.json').version,
  });
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/buyers',  buyerRoutes);
app.use('/api/users',   userRoutes);
app.use('/api',         matchRoutes);

// ── API 404 ───────────────────────────────────────────────────────────────
app.use('/api', notFound);

// ── Serve React build in production ───────────────────────────────────────
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (IS_PROD) {
  if (!fs.existsSync(CLIENT_DIST)) {
    logger.error('client/dist not found. Run "npm run build" before starting.');
    process.exit(1);
  }
  app.use(express.static(CLIENT_DIST, { maxAge: '7d', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ── Boot sequence ─────────────────────────────────────────────────────────
async function start() {
  try {
    await migrate.run({ logger });
  } catch (err) {
    logger.error('Migration failed; refusing to start.', { error: err.message, stack: err.stack });
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`MainStreet listening on :${PORT}`, {
      env: IS_PROD ? 'production' : 'development',
      driver: db.driver,
      allowedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : 'same-origin',
    });
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  function shutdown(signal) {
    logger.info(`${signal} received — shutting down…`);
    server.close(async () => {
      try { await db.close?.(); } catch (e) { /* */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}

start();
