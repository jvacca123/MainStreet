const nodemailer = require('nodemailer');
const logger = require('./logger');

const IS_PROD = process.env.NODE_ENV === 'production';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Dev: log emails instead of sending
    transporter = { sendMail: async (opts) => { logger.info('Email (dev mode — not sent)', { to: opts.to, subject: opts.subject }); return {}; } };
  }
  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'MainStreet <noreply@mainstreet.com>';
const BASE_URL = process.env.APP_URL || 'http://localhost:5173';

async function send(opts) {
  try {
    await getTransporter().sendMail({ from: FROM, ...opts });
  } catch (err) {
    logger.error('Email send failed', { to: opts.to, subject: opts.subject, error: err.message });
  }
}

async function sendVerificationEmail(user, token) {
  const link = `${BASE_URL}/verify-email?token=${token}`;
  await send({
    to: user.email,
    subject: 'Verify your MainStreet account',
    html: `<p>Hi ${user.full_name || 'there'},</p>
<p>Click the link below to verify your email address. This link expires in 24 hours.</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't create an account, you can ignore this email.</p>`,
  });
}

async function sendWelcomeEmail(user) {
  await send({
    to: user.email,
    subject: 'Welcome to MainStreet',
    html: `<p>Hi ${user.full_name || 'there'},</p>
<p>Your email is verified. You're all set to start your MainStreet journey.</p>
<p><a href="${BASE_URL}/app">Go to your dashboard</a></p>`,
  });
}

async function sendConnectionRequestEmail(seller, buyer, message) {
  await send({
    to: seller.email,
    subject: `${buyer.full_name || 'A buyer'} expressed interest in your business`,
    html: `<p>Hi ${seller.full_name || 'there'},</p>
<p><strong>${buyer.full_name || 'A buyer'}</strong> expressed interest in your business on MainStreet.</p>
${message ? `<p>"${message}"</p>` : ''}
<p><a href="${BASE_URL}/seller/dashboard">View your dashboard</a></p>`,
  });
}

async function sendConnectionAcceptedEmail(buyer, seller) {
  await send({
    to: buyer.email,
    subject: `${seller.full_name || 'A seller'} accepted your introduction request`,
    html: `<p>Hi ${buyer.full_name || 'there'},</p>
<p><strong>${seller.full_name || 'The seller'}</strong> accepted your request. You can now connect directly.</p>
<p><a href="${BASE_URL}/buyer/dashboard">View your dashboard</a></p>`,
  });
}

async function sendPasswordResetEmail(user, token) {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  await send({
    to: user.email,
    subject: 'Reset your MainStreet password',
    html: `<p>Hi ${user.full_name || 'there'},</p>
<p>Click the link below to reset your password. This link expires in 1 hour.</p>
<p><a href="${link}">${link}</a></p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>`,
  });
}

async function sendAccountDeletionEmail(user) {
  await send({
    to: user.email,
    subject: 'Your MainStreet account has been deleted',
    html: `<p>Hi there,</p>
<p>Your MainStreet account and all associated data have been deleted as requested.</p>
<p>If this was a mistake, please contact us immediately.</p>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendPasswordResetEmail,
  sendAccountDeletionEmail,
};
