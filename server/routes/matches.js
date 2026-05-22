const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { topMatchesForUser } = require('../matching');

const router = express.Router();

router.get('/matches/:userId', requireAuth, (req, res) => {
  const requestedId = parseInt(req.params.userId, 10);
  if (req.user.id !== requestedId) {
    return res.status(403).json({ error: 'You can only view your own matches.' });
  }
  const result = topMatchesForUser(requestedId, 5);
  res.json(result);
});

router.post('/connections', requireAuth, (req, res) => {
  const { targetUserId, message } = req.body || {};
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required.' });

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetUserId);
  if (!target) return res.status(404).json({ error: 'Target user not found.' });
  if (target.role === req.user.role) {
    return res.status(400).json({ error: 'Connections must be between a buyer and a seller.' });
  }

  const buyerId = req.user.role === 'buyer' ? req.user.id : target.id;
  const sellerId = req.user.role === 'seller' ? req.user.id : target.id;
  const initiatedBy = req.user.role;

  const existing = db
    .prepare('SELECT id, status FROM connections WHERE buyer_id = ? AND seller_id = ?')
    .get(buyerId, sellerId);
  if (existing) {
    return res.status(200).json({ id: existing.id, status: existing.status, alreadyExists: true });
  }

  const info = db
    .prepare('INSERT INTO connections (buyer_id, seller_id, initiated_by, message) VALUES (?, ?, ?, ?)')
    .run(buyerId, sellerId, initiatedBy, message || null);
  res.json({ id: info.lastInsertRowid, status: 'pending' });
});

router.get('/connections', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
              bu.full_name AS buyer_name, bu.email AS buyer_email,
              su.full_name AS seller_name, su.email AS seller_email,
              sp.business_name
       FROM connections c
       JOIN users bu ON bu.id = c.buyer_id
       JOIN users su ON su.id = c.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id, req.user.id);
  res.json({ connections: rows });
});

module.exports = router;
