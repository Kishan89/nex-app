class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

module.exports = {
  ApiError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
};