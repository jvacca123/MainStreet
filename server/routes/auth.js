const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, role, fullName } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }
  if (!['seller', 'buyer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be seller or buyer.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
    .run(email, hash, role, fullName || null);
  const user = { id: info.lastInsertRowid, email, role, full_name: fullName || null };
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email, role, fullName: user.full_name } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = signToken(user);
  // Has the user finished onboarding?
  const profileTable = user.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
  const hasProfile = !!db.prepare(`SELECT 1 FROM ${profileTable} WHERE user_id = ?`).get(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, hasProfile },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, role, full_name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profileTable = user.role === 'seller' ? 'seller_profiles' : 'buyer_profiles';
  const hasProfile = !!db.prepare(`SELECT 1 FROM ${profileTable} WHERE user_id = ?`).get(user.id);
  res.json({ user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, hasProfile } });
});

module.exports = router;
