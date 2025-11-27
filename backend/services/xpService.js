// services/xpService.js
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('XPService');

// XP Rules
const XP_RULES = {
  POST_CREATED: 5,
  LIKE_RECEIVED: 1,
  COMMENT_RECEIVED: 2,
};

/**
 * Award XP to a user
 * @param {string} userId - User ID to award XP to
 * @param {number} xpAmount - Amount of XP to award
 * @param {string} reason - Reason for XP award (for logging)
 */
const awardXP = async (userId, xpAmount, reason = 'Unknown') => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: {
          increment: xpAmount
        }
      },
      select: {
        id: true,
        username: true,
        xp: true
      }
    });

    return updatedUser;
  } catch (error) {
    logger.error('Error awarding XP to user', { userId, error: error.message });
    throw error;
  }
};

/**
 * Award XP for creating a post
 * @param {string} userId - User ID who created the post
 */
const awardPostCreationXP = async (userId) => {
  const updatedUser = await awardXP(userId, XP_RULES.POST_CREATED, 'Post created');
  
  // Trigger achievement checks
  try {
    const achievementService = require('./achievementService');
    await achievementService.handlePostCreated(userId);
    await achievementService.handleXPUpdated(userId, updatedUser.xp);
  } catch (error) {
    logger.error('Failed to trigger achievements:', error.message);
    // Don't fail XP award if achievement check fails
  }
  
  return updatedUser;
};

/**
 * Award XP for receiving a like on a post
 * @param {string} postOwnerId - User ID who owns the post that was liked
 */
const awardLikeReceivedXP = async (postOwnerId) => {
  const updatedUser = await awardXP(postOwnerId, XP_RULES.LIKE_RECEIVED, 'Like received on post');
  
  // Trigger achievement checks
  try {
    const achievementService = require('./achievementService');
    await achievementService.handleLikeReceived(postOwnerId);
    await achievementService.handleXPUpdated(postOwnerId, updatedUser.xp);
  } catch (error) {
    logger.error('Failed to trigger achievements:', error.message);
    // Don't fail XP award if achievement check fails
  }
  
  return updatedUser;
};

/**
 * Remove XP for losing a like on a post
 * @param {string} postOwnerId - User ID who owns the post that was unliked
 */
const removeLikeXP = async (postOwnerId) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: postOwnerId },
      data: {
        xp: {
          decrement: XP_RULES.LIKE_RECEIVED
        }
      },
      select: {
        id: true,
        username: true,
        xp: true
      }
    });

    // Ensure XP doesn't go below 0
    if (updatedUser.xp < 0) {
      await prisma.user.update({
        where: { id: postOwnerId },
        data: { xp: 0 }
      });
      updatedUser.xp = 0;
    }

    return updatedUser;
  } catch (error) {
    logger.error('Error removing XP from user', { userId: postOwnerId, error: error.message });
    throw error;
  }
};

/**
 * Award XP for receiving a comment on a post
 * @param {string} postOwnerId - User ID who owns the post that was commented on
 */
const awardCommentReceivedXP = async (postOwnerId) => {
  const updatedUser = await awardXP(postOwnerId, XP_RULES.COMMENT_RECEIVED, 'Comment received on post');
  
  // Trigger achievement checks for XP
  try {
    const achievementService = require('./achievementService');
    await achievementService.handleXPUpdated(postOwnerId, updatedUser.xp);
  } catch (error) {
    logger.error('Failed to trigger achievements:', error.message);
  }
  
  return updatedUser;
};

/**
 * Remove XP for deleting a post
 * @param {string} userId - User ID who deleted their post
 */
const removePostDeletionXP = async (userId) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: {
          decrement: XP_RULES.POST_CREATED
        }
      },
      select: {
        id: true,
        username: true,
        xp: true
      }
    });

    // Ensure XP doesn't go below 0
    if (updatedUser.xp < 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { xp: 0 }
      });
      updatedUser.xp = 0;
    }

    return updatedUser;
  } catch (error) {
    logger.error('Error removing post deletion XP from user', { userId, error: error.message });
    throw error;
  }
};

/**
 * Remove XP for losing a comment (when comment is deleted)
 * @param {string} postOwnerId - User ID who owns the post that lost a comment
 */
const removeCommentXP = async (postOwnerId) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: postOwnerId },
      data: {
        xp: {
          decrement: XP_RULES.COMMENT_RECEIVED
        }
      },
      select: {
        id: true,
        username: true,
        xp: true
      }
    });

    // Ensure XP doesn't go below 0
    if (updatedUser.xp < 0) {
      await prisma.user.update({
        where: { id: postOwnerId },
        data: { xp: 0 }
      });
      updatedUser.xp = 0;
    }

    return updatedUser;
  } catch (error) {
    logger.error('Error removing comment XP from user', { userId: postOwnerId, error: error.message });
    throw error;
  }
};

/**
 * Get user's current XP
 * @param {string} userId - User ID to get XP for
 * @returns {Promise<number>} - User's current XP
 */
const getUserXP = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true }
    });
    
    return user?.xp || 0;
  } catch (error) {
    logger.error('Error fetching XP for user', { userId, error: error.message });
    return 0;
  }
};


/**
 * Get XP rules for display
 */
const getXPRules = () => {
  return {
    rules: [
      {
        action: 'Create a post',
        xp: XP_RULES.POST_CREATED,
        description: 'Share your thoughts with the community'
      },
      {
        action: 'Receive a like',
        xp: XP_RULES.LIKE_RECEIVED,
        description: 'When someone likes your post'
      },
      {
        action: 'Receive a comment',
        xp: XP_RULES.COMMENT_RECEIVED,
        description: 'When someone comments on your post'
      }
    ],
    note: 'XP helps you level up and shows your engagement in the community!'
  };
};

module.exports = {
  awardXP,
  awardPostCreationXP,
  awardLikeReceivedXP,
  removeLikeXP,
  awardCommentReceivedXP,
  removePostDeletionXP,
  removeCommentXP,
  getUserXP,
  getXPRules,
  XP_RULES
};
