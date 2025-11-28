// middleware/requireAdmin.js
const { UnauthorizedError } = require('../utils/errors');
const { createLogger } = require('../utils/logger');

const logger = createLogger('RequireAdmin');

/**
 * Middleware to check if user is an admin
 * Should be used after authenticate middleware
 */
const requireAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated (from auth middleware)
    if (!req.user) {
      logger.warn('Admin access attempted without authentication');
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      logger.warn('Non-admin user attempted to access admin endpoint:', {
        userId: req.user.userId,
        username: req.user.username
      });
      throw new UnauthorizedError('Admin privileges required');
    }

    logger.debug('Admin access granted:', {
      userId: req.user.userId,
      username: req.user.username
    });

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        message: error.message
      });
    }
    
    logger.error('Error in requireAdmin middleware:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

module.exports = { requireAdmin };
