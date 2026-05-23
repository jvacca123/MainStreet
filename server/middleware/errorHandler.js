const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const IS_PROD = process.env.NODE_ENV === 'production';

function notFound(req, res, next) {
  res.status(404).json({ error: { code: 'not_found', message: 'Endpoint not found' } });
}

function errorHandler(err, req, res, next) {
  // express-validator and other libs throw plain Errors with status
  const status = err.status || err.statusCode || 500;
  const code   = err.code   || (status >= 500 ? 'internal_error' : 'error');
  const isAppError = err instanceof AppError;

  // Server-side: full log
  if (status >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else if (status >= 400) {
    logger.warn(`${status} ${err.message}`, { path: req.path, method: req.method, ip: req.ip });
  }

  const safeMessage =
    status >= 500 && IS_PROD ? 'Something went wrong on our end.' : (err.message || 'Error');

  const body = { error: { code, message: safeMessage } };
  if (isAppError && err.meta) body.error.meta = err.meta;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
