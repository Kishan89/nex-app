// services/notificationService.js
const { prisma } = require('../config/database');

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
      console.log('ℹ️ Skipping self-notification');
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
          console.log('ℹ️ Similar notification already exists, updating timestamp');
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
        console.error('❌ Error checking for existing notification:', error);
        // Continue to create a new notification
      }
    }

    console.log(`📣 Creating notification for user ${data.userId} from user ${data.fromUserId} of type ${data.type}`);
    
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

    console.log(`✅ Notification created successfully with ID: ${notification.id}`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of notifications
 */
async function getNotificationsForUser(userId, limit = 20, offset = 0) {
  try {
    console.log(`📋 Fetching notifications for user ${userId}, limit: ${limit}, offset: ${offset}`);
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            image: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
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

    console.log(`✅ Marked ${result.count} notifications as read for user ${userId}`);
    return result.count;
  } catch (error) {
    console.error('❌ Error marking notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of unread notifications
 */
async function getUnreadNotificationCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return count;
  } catch (error) {
    console.error('❌ Error counting unread notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  markNotificationsAsRead,
  getUnreadNotificationCount,
};
