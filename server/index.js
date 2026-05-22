// Load .env in dev/staging (no-op if file doesn't exist)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { seedIfEmpty } = require('./db/seed');
const authRoutes = require('./routes/auth');
const sellerRoutes = require('./routes/sellers');
const buyerRoutes = require('./routes/buyers');
const matchRoutes = require('./routes/matches');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// In production the React build is served from this server — no CORS needed.
// In dev the Vite proxy handles /api calls, but allow localhost origins for tooling.
if (!IS_PROD) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
}

app.use(express.json({ limit: '256kb' }));

// ── API routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mainstreet-api', env: IS_PROD ? 'production' : 'development' }));
app.use('/api/auth', authRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api', matchRoutes);

// API 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ── Serve React build in production ─────────────────────────────────────────
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (IS_PROD) {
  if (!fs.existsSync(CLIENT_DIST)) {
    console.error('[mainstreet] ERROR: client/dist not found. Run "npm run build" before starting.');
    process.exit(1);
  }
  app.use(express.static(CLIENT_DIST));
  // SPA fallback — any non-API route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: IS_PROD ? 'Server error' : err.message });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
const seeded = seedIfEmpty();
if (seeded) console.log('[mainstreet] Database seeded.');

app.listen(PORT, () => {
  console.log(`[mainstreet] Running on http://localhost:${PORT}  (${IS_PROD ? 'production' : 'development'})`);
});
