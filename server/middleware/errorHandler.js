const logger = require('../services/logger');

const IS_PROD = process.env.NODE_ENV === 'production';

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  logger.error('Request error', {
    status,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: IS_PROD ? undefined : err.stack,
  });
  res.status(status).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: IS_PROD && status >= 500 ? 'Internal server error' : err.message,
    },
  });
}

module.exports = errorHandler;
