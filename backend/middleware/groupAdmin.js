const { prisma } = require('../config/database');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const { createLogger } = require('../utils/logger');

const logger = createLogger('GroupAdminMiddleware');

/**
 * Middleware to check if user is a group admin
 */
async function requireGroupAdmin(req, res, next) {
  try {
    const { userId } = req.user || {};
    const { groupId } = req.params;

    logger.info('Checking group admin permission', { userId, groupId });

    if (!userId) {
      throw new ForbiddenError('Unauthorized');
    }

    if (!groupId) {
      throw new NotFoundError('Group ID is required');
    }

    // Check if chat exists and is a group
    const chat = await prisma.chat.findUnique({
      where: { id: groupId },
      include: {
        participants: true
      }
    });

    if (!chat) {
      throw new NotFoundError('Group not found');
    }

    if (!chat.isGroup) {
      throw new ForbiddenError('This is not a group chat');
    }

    // Find user's participant record
    const userParticipant = chat.participants.find(p => p.userId === userId);
    
    logger.info('User participant found', { 
      userId, 
      groupId, 
      isParticipant: !!userParticipant,
      isAdmin: userParticipant?.isAdmin 
    });
    
    if (!userParticipant) {
      throw new ForbiddenError('You are not a member of this group');
    }
    
    if (!userParticipant.isAdmin) {
      throw new ForbiddenError('Only group admins can perform this action');
    }

    logger.info('Admin check passed', { userId, groupId });

    // Attach chat to request for use in controller
    req.chat = chat;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user is group admin (returns boolean, doesn't throw)
 */
async function isGroupAdmin(userId, groupId) {
  try {
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId: groupId,
        userId,
        isAdmin: true
      }
    });
    return !!participant;
  } catch (error) {
    logger.error('Error checking group admin status', { error: error.message, userId, groupId });
    return false;
  }
}

module.exports = {
  requireGroupAdmin,
  isGroupAdmin
};
