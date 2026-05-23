const rateLimit = require('express-rate-limit');

const sharedHandler = (req, res, next, options) => {
  res.status(429).json({
    error: { code: 'rate_limited', message: options.message },
  });
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.',
  handler: sharedHandler,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                       // login + register + refresh combined
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many auth attempts. Try again in 15 minutes.',
  handler: sharedHandler,
  skipSuccessfulRequests: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Try again in 15 minutes.',
  handler: sharedHandler,
  skipSuccessfulRequests: true,  // only count failures
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many resend attempts. Try again in an hour.',
  handler: sharedHandler,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset requests. Try again in an hour.',
  handler: sharedHandler,
});

module.exports = {
  globalLimiter,
  authLimiter,
  loginLimiter,
  resendLimiter,
  passwordResetLimiter,
};
