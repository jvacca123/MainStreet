const express = require('express');
const crypto = require('crypto');
const { query, queryOne } = require('../db');
const { requireAuth } = require('../middleware/auth');
const emailService = require('../services/email');

const router = express.Router();

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT id, email, full_name FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    // Soft delete + anonymize
    const anonEmail = `deleted_${crypto.randomBytes(8).toString('hex')}@deleted.invalid`;
    await query(
      `UPDATE users SET
        deleted_at = NOW(),
        email = $1,
        full_name = '[deleted]',
        password_hash = '[deleted]'
      WHERE id = $2`,
      [anonEmail, user.id],
    );
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await query('DELETE FROM email_verifications WHERE user_id = $1', [user.id]);

    emailService.sendAccountDeletionEmail(user).catch(() => {});
    res.clearCookie('mainstreet_refresh', { path: '/api/auth' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me/export', requireAuth, async (req, res, next) => {
  try {
    const user = await queryOne(
      'SELECT id, email, full_name, role, email_verified, terms_accepted_at, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    const sellerProfile = await queryOne('SELECT * FROM seller_profiles WHERE user_id = $1', [user.id]);
    const buyerProfile = await queryOne('SELECT * FROM buyer_profiles WHERE user_id = $1', [user.id]);
    const { rows: connections } = await query(
      'SELECT id, buyer_id, seller_id, status, message, created_at FROM connections WHERE buyer_id = $1 OR seller_id = $1',
      [user.id],
    );

    res.json({
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        emailVerified: user.email_verified,
        termsAcceptedAt: user.terms_accepted_at,
        createdAt: user.created_at,
      },
      sellerProfile: sellerProfile || null,
      buyerProfile: buyerProfile ? { ...buyerProfile, password_hash: undefined } : null,
      connections,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
