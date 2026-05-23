const express = require('express');
const { queryOne } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { topMatchesForUser } = require('../matching');

const router = express.Router();

router.get('/matches/:userId', requireAuth, async (req, res, next) => {
  try {
    const requestedId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(requestedId) || requestedId <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_PARAM', message: 'Invalid user ID.' } });
    }
    if (req.user.id !== requestedId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own matches.' } });
    }
    const result = await topMatchesForUser(requestedId, 5);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/connections', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId, message } = req.body || {};
    const targetId = parseInt(targetUserId, 10);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid targetUserId required.' } });
    }
    const sanitizedMessage = message ? String(message).replace(/<[^>]*>/g, '').trim().slice(0, 500) : null;

    const target = await queryOne('SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL', [targetId]);
    if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target user not found.' } });
    if (target.role === req.user.role) {
      return res.status(400).json({ error: { code: 'SAME_ROLE', message: 'Connections must be between a buyer and a seller.' } });
    }

    const buyerId = req.user.role === 'buyer' ? req.user.id : target.id;
    const sellerId = req.user.role === 'seller' ? req.user.id : target.id;
    const initiatedBy = req.user.role;

    const { query } = require('../db');
    const existing = await queryOne('SELECT id, status FROM connections WHERE buyer_id = $1 AND seller_id = $2', [buyerId, sellerId]);
    if (existing) {
      return res.status(200).json({ id: existing.id, status: existing.status, alreadyExists: true });
    }

    const { rows } = await query(
      'INSERT INTO connections (buyer_id, seller_id, initiated_by, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [buyerId, sellerId, initiatedBy, sanitizedMessage],
    );
    res.json({ id: rows[0].id, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

router.get('/connections', requireAuth, async (req, res, next) => {
  try {
    const { query } = require('../db');
    const { rows } = await query(
      `SELECT c.*,
              bu.full_name AS buyer_name, bu.email AS buyer_email,
              su.full_name AS seller_name, su.email AS seller_email,
              sp.business_name
       FROM connections c
       JOIN users bu ON bu.id = c.buyer_id
       JOIN users su ON su.id = c.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
       WHERE c.buyer_id = $1 OR c.seller_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id],
    );
    res.json({ connections: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
