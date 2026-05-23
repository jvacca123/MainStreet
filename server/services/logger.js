const winston = require('winston');

const IS_PROD = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: IS_PROD ? 'info' : 'debug',
  format: IS_PROD
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }),
      ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
