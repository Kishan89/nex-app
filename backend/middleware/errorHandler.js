const { createLogger } = require('../utils/logger');
const logger = createLogger('ErrorHandler');

/**
 * Global error handling middleware
 */
function errorHandler(error, req, res, next) {
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Prisma error handling
  if (error.code && error.code.startsWith('P')) {
    return res.status(400).json({
      error: 'Database error',
      message: 'A database error occurred',
      code: error.code,
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication error',
      message: 'Invalid token',
    });
  }

  // Default server error
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
