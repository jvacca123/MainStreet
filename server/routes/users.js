const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { revokeAllUserRefreshTokens, clearRefreshCookie } = require('../services/tokens');
const logger = require('../utils/logger');

const router = express.Router();

// GDPR-style data export — returns everything we have on the user.
router.get('/me/export', requireAuth, async (req, res, next) => {
  try {
    const id = req.user.id;
    const user = await db.prepare(
      'SELECT id, email, role, full_name, email_verified, terms_accepted_at, created_at FROM users WHERE id = ?'
    ).get(id);

    const sellerProfile = await db.prepare('SELECT * FROM seller_profiles WHERE user_id = ?').get(id);
    const buyerProfile  = await db.prepare('SELECT * FROM buyer_profiles WHERE user_id = ?').get(id);
    const connections   = await db.prepare(
      'SELECT id, buyer_id, seller_id, status, message, created_at FROM connections WHERE buyer_id = ? OR seller_id = ?'
    ).all(id, id);
    const audit         = await db.prepare(
      'SELECT action, metadata, created_at FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 500'
    ).all(id);

    res.setHeader('Content-Disposition', `attachment; filename="mainstreet-export-${id}.json"`);
    res.json({
      exported_at: new Date().toISOString(),
      user,
      sellerProfile: sellerProfile || null,
      buyerProfile: buyerProfile || null,
      connections,
      auditEntries: audit,
    });
  } catch (err) { next(err); }
});

// Soft-delete the current user. Anonymizes profile + revokes all sessions.
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const id = req.user.id;
    const anonEmail = `deleted-${id}-${Date.now()}@deleted.local`;
    await db.prepare(
      "UPDATE users SET email = ?, full_name = '[deleted]', deleted_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(anonEmail, id);
    // Wipe profile content
    await db.prepare(
      "UPDATE seller_profiles SET business_name = '[deleted]', reason_for_selling = NULL WHERE user_id = ?"
    ).run(id).catch(() => {});
    await db.prepare(
      "UPDATE buyer_profiles SET motivation = '[deleted]', experience_summary = NULL WHERE user_id = ?"
    ).run(id).catch(() => {});

    await revokeAllUserRefreshTokens(id);
    clearRefreshCookie(res);

    await db.prepare(
      'INSERT INTO audit_log (user_id, action, ip_address) VALUES (?, ?, ?)'
    ).run(id, 'account_deleted', req.ip || null);

    logger.info('[users] account deleted', { userId: id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
