const winston = require('winston');

const IS_PROD = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (IS_PROD ? 'info' : 'debug'),
  format: IS_PROD
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
          return `${timestamp} ${level} ${message}${extra}`;
        }),
      ),
  transports: [new winston.transports.Console()],
});

// Drop forbidden fields from log metadata
const FORBIDDEN_KEYS = new Set(['password', 'password_hash', 'token', 'token_hash', 'refresh_token', 'jwt']);
function scrub(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = Array.isArray(meta) ? [] : {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) out[k] = '[REDACTED]';
    else if (v && typeof v === 'object') out[k] = scrub(v);
    else out[k] = v;
  }
  return out;
}

function wrap(level) {
  return (msg, meta) => logger[level](msg, scrub(meta));
}

module.exports = {
  error: wrap('error'),
  warn:  wrap('warn'),
  info:  wrap('info'),
  debug: wrap('debug'),
  raw: logger,
};
