// controllers/userAdminController.js
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

const logger = createLogger('UserAdminController');

/**
 * Ban a user
 * Admin only endpoint
 */
const banUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'userId is required'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, isBanned: true }
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      });
    }

    if (user.isBanned) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'User is already banned'
      });
    }

    // Ban the user
    const bannedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason || 'Violation of community guidelines',
        bannedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
        banReason: true,
        bannedAt: true
      }
    });

    logger.info(`User banned: ${userId} by admin`, { userId, reason });

    return res.status(HTTP_STATUS.OK).json({
      message: 'User banned successfully',
      user: bannedUser
    });

  } catch (error) {
    logger.error('Error banning user:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to ban user',
      error: error.message
    });
  }
};

/**
 * Unban a user
 * Admin only endpoint
 */
const unbanUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'userId is required'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isBanned: true }
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      });
    }

    if (!user.isBanned) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'User is not banned'
      });
    }

    // Unban the user
    const unbannedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true
      }
    });

    logger.info(`User unbanned: ${userId} by admin`, { userId });

    return res.status(HTTP_STATUS.OK).json({
      message: 'User unbanned successfully',
      user: unbannedUser
    });

  } catch (error) {
    logger.error('Error unbanning user:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to unban user',
      error: error.message
    });
  }
};

/**
 * Get all banned users
 * Admin only endpoint
 */
const getBannedUsers = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const bannedUsers = await prisma.user.findMany({
      where: {
        isBanned: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        banReason: true,
        bannedAt: true,
        createdAt: true
      },
      orderBy: {
        bannedAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const totalBanned = await prisma.user.count({
      where: { isBanned: true }
    });

    return res.status(HTTP_STATUS.OK).json({
      users: bannedUsers,
      total: totalBanned,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Error fetching banned users:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch banned users',
      error: error.message
    });
  }
};

/**
 * Check ban status of a user
 */
const checkBanStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'userId is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isBanned: true,
        banReason: true,
        bannedAt: true
      }
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      isBanned: user.isBanned || false,
      banReason: user.banReason,
      bannedAt: user.bannedAt
    });

  } catch (error) {
    logger.error('Error checking ban status:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to check ban status',
      error: error.message
    });
  }
};

module.exports = {
  banUser,
  unbanUser,
  getBannedUsers,
  checkBanStatus
};
