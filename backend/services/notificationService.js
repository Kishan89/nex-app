// services/notificationService.js
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('NotificationService');

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @param {string} data.userId - User ID who will receive the notification
 * @param {string} data.fromUserId - User ID who triggered the notification
 * @param {string} data.postId - Post ID related to the notification (optional)
 * @param {string} data.commentId - Comment ID related to the notification (optional)
 * @param {string} data.type - Notification type (LIKE, COMMENT, FOLLOW, etc.)
 * @param {string} data.message - Notification message
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(data) {
  try {
    // Don't create notification if it's from the same user
    if (data.userId === data.fromUserId && data.type !== 'SYSTEM') {
      logger.debug('Skipping self-notification');
      return null;
    }

    // Check if a similar notification already exists (to prevent duplicates)
    if (data.type === 'LIKE' && data.postId) {
      try {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: data.userId,
            fromUserId: data.fromUserId,
            postId: data.postId,
            type: data.type,
            createdAt: {
              // Only consider notifications from the last hour
              gte: new Date(Date.now() - 60 * 60 * 1000)
            }
          }
        });

        if (existingNotification) {
          logger.debug('Similar notification already exists, updating timestamp');
          // Update the existing notification instead of creating a new one
          const updatedNotification = await prisma.notification.update({
            where: { id: existingNotification.id },
            data: { 
              read: false,
              createdAt: new Date(),
              message: data.message
            }
          });
          return updatedNotification;
        }
      } catch (error) {
        logger.error('Error checking for existing notification:', error);
        // Continue to create a new notification
      }
    }

    logger.info('Creating notification', { userId: data.userId, fromUserId: data.fromUserId, type: data.type });
    
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        fromUserId: data.fromUserId,
        postId: data.postId,
        commentId: data.commentId,
        type: data.type,
        message: data.message,
        read: false,
      },
    });

    logger.info('Notification created successfully', { notificationId: notification.id });
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user (OPTIMIZED for instant loading)
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of notifications
 */
async function getNotificationsForUser(userId, limit = 20, offset = 0) {
  try {
    logger.debug('Fetching notifications for user', { userId, limit, offset });
    
    // OPTIMIZED QUERY: Minimal data selection for speed
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        type: true,
        message: true,
        read: true,
        createdAt: true,
        postId: true,
        fromUserId: true,
        // Only essential user data
        fromUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        // Minimal post data
        post: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    logger.debug('Found notifications for user', { userId, count: notifications.length });
    return notifications;
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Mark notifications as read
 * @param {string} userId - User ID
 * @param {Array<string>} notificationIds - List of notification IDs to mark as read
 * @returns {Promise<number>} Number of updated notifications
 */
async function markNotificationsAsRead(userId, notificationIds = []) {
  try {
    const whereClause = {
      userId,
      read: false,
    };

    // If notification IDs are provided, only mark those as read
    if (notificationIds.length > 0) {
      whereClause.id = {
        in: notificationIds,
      };
    }

    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: {
        read: true,
      },
    });

    logger.debug('Marked notifications as read', { userId, count: result.count });
    return result.count;
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user (excluding chat notifications)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of unread notifications (like, comment, follow only)
 */
async function getUnreadNotificationCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
        // Exclude chat/message notifications from count
        NOT: {
          type: {
            in: ['MESSAGE', 'CHAT']
          }
        }
      },
    });

    return count;
  } catch (error) {
    logger.error('Error counting unread notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  markNotificationsAsRead,
  getUnreadNotificationCount,
};
