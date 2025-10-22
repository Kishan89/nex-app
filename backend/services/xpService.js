// services/xpService.js
const { prisma } = require('../config/database');

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
    console.error(`❌ Error awarding XP to user ${userId}:`, error);
    throw error;
  }
};

/**
 * Award XP for creating a post
 * @param {string} userId - User ID who created the post
 */
const awardPostCreationXP = async (userId) => {
  return await awardXP(userId, XP_RULES.POST_CREATED, 'Post created');
};

/**
 * Award XP for receiving a like on a post
 * @param {string} postOwnerId - User ID who owns the post that was liked
 */
const awardLikeReceivedXP = async (postOwnerId) => {
  return await awardXP(postOwnerId, XP_RULES.LIKE_RECEIVED, 'Like received on post');
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
    console.error(`❌ Error removing XP from user ${postOwnerId}:`, error);
    throw error;
  }
};

/**
 * Award XP for receiving a comment on a post
 * @param {string} postOwnerId - User ID who owns the post that was commented on
 */
const awardCommentReceivedXP = async (postOwnerId) => {
  return await awardXP(postOwnerId, XP_RULES.COMMENT_RECEIVED, 'Comment received on post');
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
    console.error(`❌ Error removing post deletion XP from user ${userId}:`, error);
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
    console.error(`❌ Error removing comment XP from user ${postOwnerId}:`, error);
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
    console.error(`❌ Error fetching XP for user ${userId}:`, error);
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
