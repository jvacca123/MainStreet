const express = require('express');
const db = require('../db');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const v = require('../validators');
const { topMatchesForUser } = require('../matching');
const email = require('../services/email');
const logger = require('../utils/logger');
const { ForbiddenError, NotFoundError, ValidationError } = require('../utils/errors');

const router = express.Router();

router.get('/matches/:userId', requireAuth, requireVerifiedEmail, v.intIdParam, async (req, res, next) => {
  try {
    const requestedId = req.params.userId;
    if (req.user.id !== requestedId) throw new ForbiddenError('You can only view your own matches.');
    const result = await topMatchesForUser(requestedId, 5);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/connections', requireAuth, requireVerifiedEmail, v.connectionRequest, async (req, res, next) => {
  try {
    const { targetUserId, message } = req.body;
    const target = await db.prepare('SELECT id, email, role, full_name FROM users WHERE id = ? AND deleted_at IS NULL').get(targetUserId);
    if (!target) throw new NotFoundError('Target user not found.');
    if (target.role === req.user.role) {
      throw new ValidationError('Connections must be between a buyer and a seller.');
    }

    const buyerId  = req.user.role === 'buyer'  ? req.user.id : target.id;
    const sellerId = req.user.role === 'seller' ? req.user.id : target.id;
    const initiatedBy = req.user.role;

    const existing = await db.prepare(
      'SELECT id, status FROM connections WHERE buyer_id = ? AND seller_id = ?'
    ).get(buyerId, sellerId);
    if (existing) {
      return res.json({ id: existing.id, status: existing.status, alreadyExists: true });
    }

    const ins = await db.prepare(
      'INSERT INTO connections (buyer_id, seller_id, initiated_by, message) VALUES (?, ?, ?, ?)'
    ).run(buyerId, sellerId, initiatedBy, message || null);

    const newId = ins.lastInsertRowid
      || (await db.prepare('SELECT id FROM connections WHERE buyer_id = ? AND seller_id = ?').get(buyerId, sellerId)).id;

    // Notify the target (best-effort)
    try {
      const recipient = req.user.role === 'buyer' ? target : await db.prepare('SELECT * FROM users WHERE id = ?').get(buyerId);
      const sender    = req.user.role === 'buyer' ? await db.prepare('SELECT * FROM users WHERE id = ?').get(buyerId) : target;
      if (req.user.role === 'buyer') {
        await email.sendConnectionRequestEmail(recipient, sender);
      }
    } catch (e) { logger.warn('[email] connection notify failed', { error: e.message }); }

    res.status(201).json({ id: newId, status: 'pending' });
  } catch (err) { next(err); }
});

router.get('/connections', requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const rows = await db.prepare(
      `SELECT c.id, c.buyer_id, c.seller_id, c.initiated_by, c.status, c.message, c.created_at,
              bu.full_name AS buyer_name, bu.email AS buyer_email,
              su.full_name AS seller_name, su.email AS seller_email,
              sp.business_name
       FROM connections c
       JOIN users bu ON bu.id = c.buyer_id
       JOIN users su ON su.id = c.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = c.seller_id
       WHERE (c.buyer_id = ? OR c.seller_id = ?)
         AND bu.deleted_at IS NULL AND su.deleted_at IS NULL
       ORDER BY c.created_at DESC`
    ).all(req.user.id, req.user.id);
    res.json({ connections: rows });
  } catch (err) { next(err); }
});

module.exports = router;
