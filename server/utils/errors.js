// Domain error classes — thrown anywhere, caught by the global error handler.

class AppError extends Error {
  constructor(message, { status = 500, code = 'internal_error', meta = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', meta = null) {
    super(message, { status: 400, code: 'validation_error', meta });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { status: 401, code: 'unauthorized' });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, { status: 403, code: 'forbidden' });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, { status: 404, code: 'not_found' });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', meta = null) {
    super(message, { status: 409, code: 'conflict', meta });
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, { status: 429, code: 'rate_limited' });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
