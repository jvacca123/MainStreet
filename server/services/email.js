// Email service. If SMTP env vars are set, sends real emails via nodemailer.
// Otherwise falls back to a console transport that logs the email content — so
// development and the initial production rollout work end-to-end without SMTP.

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const FROM = process.env.EMAIL_FROM || 'MainStreet <noreply@mainstreet.local>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter = null;
let transportName = 'console';

function getTransport() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    transportName = `smtp:${process.env.SMTP_HOST}`;
    logger.info('[email] SMTP transport configured', { host: process.env.SMTP_HOST });
  } else {
    // Console-only transport — logs the email to stdout
    transporter = {
      sendMail: async (mail) => {
        logger.info('[email/console] Would have sent email', {
          to: mail.to,
          from: mail.from,
          subject: mail.subject,
          text: mail.text,
        });
        return { messageId: 'console-' + Date.now() };
      },
    };
    transportName = 'console';
    logger.warn('[email] SMTP not configured — using console transport (no real emails will send)');
  }
  return transporter;
}

async function send({ to, subject, text, html }) {
  const t = getTransport();
  return t.sendMail({ from: FROM, to, subject, text, html });
}

async function sendVerificationEmail(user, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  return send({
    to: user.email,
    subject: 'Verify your MainStreet email',
    text: `Welcome to MainStreet, ${user.full_name || ''}.\n\nVerify your email by visiting:\n${link}\n\nThis link expires in 24 hours.`,
    html: htmlWrap(`
      <h1 style="font-family:Georgia,serif;color:#1a3d2b">Welcome to MainStreet</h1>
      <p>Hi ${escapeHtml(user.full_name || '')},</p>
      <p>Confirm your email to activate your account.</p>
      <p><a href="${link}" style="display:inline-block;background:#1a3d2b;color:#faf8f4;padding:12px 22px;border-radius:8px;text-decoration:none">Verify email</a></p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser: ${link}</p>
      <p style="color:#666;font-size:13px">The link expires in 24 hours.</p>
    `),
  });
}

async function sendWelcomeEmail(user) {
  const link = `${APP_URL}/${user.role}/dashboard`;
  return send({
    to: user.email,
    subject: 'Your MainStreet account is ready',
    text: `Welcome aboard, ${user.full_name || ''}.\n\nGet started: ${link}`,
    html: htmlWrap(`
      <h1 style="font-family:Georgia,serif;color:#1a3d2b">You're in.</h1>
      <p>Your MainStreet account is verified and ready to use.</p>
      <p><a href="${link}" style="display:inline-block;background:#1a3d2b;color:#faf8f4;padding:12px 22px;border-radius:8px;text-decoration:none">Go to your dashboard</a></p>
    `),
  });
}

async function sendPasswordResetEmail(user, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return send({
    to: user.email,
    subject: 'Reset your MainStreet password',
    text: `A password reset was requested for your account. If this was you, visit:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: htmlWrap(`
      <h1 style="font-family:Georgia,serif;color:#1a3d2b">Reset your password</h1>
      <p>We received a request to reset your password.</p>
      <p><a href="${link}" style="display:inline-block;background:#1a3d2b;color:#faf8f4;padding:12px 22px;border-radius:8px;text-decoration:none">Reset password</a></p>
      <p style="color:#666;font-size:13px">Link expires in 1 hour. If you didn't ask for this, just ignore this email.</p>
    `),
  });
}

async function sendConnectionRequestEmail(seller, buyer) {
  const link = `${APP_URL}/seller/dashboard`;
  return send({
    to: seller.email,
    subject: `${buyer.full_name || 'A buyer'} expressed interest in your business`,
    text: `${buyer.full_name || 'A buyer'} sent an introduction request via MainStreet.\n\nReview it: ${link}`,
    html: htmlWrap(`
      <h1 style="font-family:Georgia,serif;color:#1a3d2b">New introduction request</h1>
      <p><strong>${escapeHtml(buyer.full_name || 'A buyer')}</strong> expressed interest in your business.</p>
      <p><a href="${link}" style="display:inline-block;background:#1a3d2b;color:#faf8f4;padding:12px 22px;border-radius:8px;text-decoration:none">Review request</a></p>
    `),
  });
}

function htmlWrap(inner) {
  return `<!doctype html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#faf8f4;padding:30px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e7e0cf">${inner}<hr style="border:none;border-top:1px solid #e7e0cf;margin:24px 0"/><p style="color:#888;font-size:12px">MainStreet · community business succession</p></div></body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

module.exports = {
  send,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendConnectionRequestEmail,
  get transportName() { return transportName; },
};
