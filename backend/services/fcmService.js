// services/fcmService.js
const admin = require('../lib/firebaseAdmin');
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');
const logger = createLogger('FCMService');

/**
 * Send FCM push notification to specific users
 * @param {Array<string>} userIds - Array of user IDs to send notification to
 * @param {Object} notification - Notification object
 * @param {string} notification.title - Notification title
 * @param {Object} data - Additional data to send with notification
 * @param {string} data.postId - Post ID for navigation
 * @param {string} data.type - Notification type (like, comment, etc.)
 * @returns {Promise<Object>} Result of sending notifications
 */
async function sendFCMNotification(userIds, notification, data = {}) {
  try {
    logger.info('FCM notification request', {
      userIds,
      notificationTitle: notification.title,
      notificationBody: notification.body,
      dataType: data.type
    });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn('No user IDs provided for FCM notification');
      return { success: false, message: 'No user IDs provided' };
    }

    // Get FCM tokens for the users
    logger.info('Searching FCM tokens', { userIds });
    const fcmTokens = await prisma.fcmToken.findMany({
      where: {
        userId: {
          in: userIds
        },
        isActive: true
      },
      select: {
        token: true,
        userId: true,
        platform: true,
        lastUsed: true
      }
    });

    logger.info('FCM tokens found', {
      tokenCount: fcmTokens.length,
      tokens: fcmTokens.map(t => ({ userId: t.userId, platform: t.platform, tokenPreview: t.token.substring(0, 20) + '...' }))
    });

    if (fcmTokens.length === 0) {
      logger.warn('No FCM tokens found for users');
      return { success: false, message: 'No FCM tokens found' };
    }

    const tokens = fcmTokens.map(tokenRecord => tokenRecord.token);
    
    logger.info('Sending FCM notification', { deviceCount: tokens.length });

    // Prepare the message payload with enhanced configuration for reliable delivery
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        postId: data.postId?.toString() || '',
        type: data.type?.toString() || '',
        userId: data.userId?.toString() || '',
        chatId: data.chatId?.toString() || '',
        timestamp: Date.now().toString()
        // Removed click_action - React Native Firebase handles navigation automatically
      },
      android: {
        notification: {
          channelId: data.type === 'message' ? 'nexeed_messages' : 'nexeed_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          color: '#00d4ff',
          icon: 'ic_notification',
          tag: data.type || 'nexeed',
          visibility: 'public'
          // Removed clickAction and autoCancel - React Native Firebase handles this automatically
        },
        // Enhanced Android message configuration
        priority: 'high',
        ttl: 3600000, // 1 hour TTL
        restrictedPackageName: 'com.mycompany.nexeed1',
        collapseKey: data.type === 'message' ? `chat_${data.chatId}` : `${data.type}_${data.postId || data.userId}`,
        data: {
          ...data,
          postId: data.postId?.toString() || '',
          type: data.type?.toString() || '',
          userId: data.userId?.toString() || '',
          chatId: data.chatId?.toString() || '',
          timestamp: Date.now().toString()
          // Removed click_action - React Native Firebase handles this automatically
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            badge: 1,
            sound: 'default',
            category: 'NEXEED_NOTIFICATION',
            'content-available': 1,
            // Enhanced iOS settings for background delivery
            'mutable-content': 1,
            'thread-id': data.type === 'message' ? `chat_${data.chatId}` : `${data.type}_notification`
          },
          postId: data.postId?.toString() || '',
          type: data.type?.toString() || '',
          userId: data.userId?.toString() || '',
          chatId: data.chatId?.toString() || '',
          timestamp: Date.now().toString(),
        },
        headers: {
          'apns-priority': '10', // High priority for immediate delivery
          'apns-push-type': 'alert',
          'apns-expiration': (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour expiration - convert to string
          'apns-collapse-id': data.type === 'message' ? `chat_${data.chatId}` : `${data.type}_${data.postId || data.userId}`
        }
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: data.type || 'nexeed',
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: data.type === 'message' ? 'Reply' : 'View Post',
            }
          ]
        },
        data: {
          ...data,
          postId: data.postId?.toString() || '',
          type: data.type?.toString() || '',
          userId: data.userId?.toString() || '',
          chatId: data.chatId?.toString() || '',
          timestamp: Date.now().toString(),
        },
        headers: {
          TTL: '3600', // 1 hour TTL for web push
          Urgency: 'high'
        }
      }
    };

    // Send to multiple tokens
    logger.info('Sending FCM notification with payload', {
      tokenCount: tokens.length,
      notificationTitle: message.notification.title,
      notificationBody: message.notification.body,
      dataKeys: Object.keys(message.data)
    });

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...message
    });

    logger.info('FCM notification result', { successCount: response.successCount, failureCount: response.failureCount });
    
    if (response.responses) {
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          logger.debug('FCM message sent successfully', { tokenIndex: idx + 1 });
        } else {
          logger.warn('FCM message failed', { tokenIndex: idx + 1, code: resp.error?.code, message: resp.error?.message });
        }
      });
    }

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          logger.error('Failed to send FCM notification to token', { token: tokens[idx], code: error.code, message: error.message });
          
          // Remove invalid tokens from database
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      // Remove invalid tokens from database
      if (failedTokens.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: {
            token: {
              in: failedTokens
            }
          }
        });
        logger.info('Removed invalid FCM tokens', { count: failedTokens.length });
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: `Notification sent to ${response.successCount} devices`
    };

  } catch (error) {
    logger.error('Error sending FCM notification', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message,
      message: 'Failed to send FCM notification'
    };
  }
}

/**
 * Send notification when a post is liked
 * @param {string} postOwnerId - ID of the post owner
 * @param {string} likerUserId - ID of the user who liked the post
 * @param {string} postId - ID of the post
 * @param {string} likerUsername - Username of the liker
 */
async function sendLikeNotification(postOwnerId, likerUserId, postId, likerUsername) {
  if (postOwnerId === likerUserId) {
    logger.debug('Skipping like notification - user liked their own post', { userId: postOwnerId });
    return;
  }

  // Get liker's avatar
  let likerAvatar = '';
  try {
    const liker = await prisma.user.findUnique({
      where: { id: likerUserId },
      select: { avatar: true }
    });
    likerAvatar = liker?.avatar || '';
  } catch (error) {
    logger.error('Failed to get liker avatar', { error: error.message, likerUserId });
  }

  const notification = {
    title: `${likerUsername}`,
    body: 'liked your post'
  };

  const data = {
    type: 'like',
    postId: postId,
    userId: likerUserId,
    username: likerUsername,
    avatar: likerAvatar
  };

  return await sendFCMNotification([postOwnerId], notification, data);
}

/**
 * Send notification when a post is commented on
 * @param {string} postOwnerId - ID of the post owner
 * @param {string} commenterUserId - ID of the user who commented
 * @param {string} postId - ID of the post
 * @param {string} commenterUsername - Username of the commenter
 * @param {string} commentText - Text of the comment (truncated)
 */
async function sendCommentNotification(postOwnerId, commenterUserId, postId, commenterUsername, commentText) {
  if (postOwnerId === commenterUserId) {
    logger.debug('Skipping comment notification - user commented on their own post', { userId: postOwnerId });
    return;
  }

  // Get commenter's avatar
  let commenterAvatar = '';
  try {
    const commenter = await prisma.user.findUnique({
      where: { id: commenterUserId },
      select: { avatar: true }
    });
    commenterAvatar = commenter?.avatar || '';
  } catch (error) {
    logger.error('Failed to get commenter avatar', { error: error.message, commenterUserId });
  }

  // Truncate comment text for notification
  const truncatedComment = commentText.length > 50 
    ? commentText.substring(0, 50) + '...' 
    : commentText;

  const notification = {
    title: `${commenterUsername}`,
    body: `commented on your post`
  };

  const data = {
    type: 'comment',
    postId: postId,
    userId: commenterUserId,
    username: commenterUsername,
    avatar: commenterAvatar,
    scrollToComments: 'true' // Add this to auto-open comments modal
  };

  return await sendFCMNotification([postOwnerId], notification, data);
}

/**
 * Send notification when a user follows another user
 * @param {string} followedUserId - ID of the user being followed
 * @param {string} followerUserId - ID of the user who followed
 * @param {string} followerUsername - Username of the follower
 */
async function sendFollowNotification(followedUserId, followerUserId, followerUsername) {
  if (followedUserId === followerUserId) {
    logger.debug('Skipping follow notification - cannot follow yourself', { userId: followedUserId });
    return;
  }

  // Get follower's avatar
  let followerAvatar = '';
  try {
    const follower = await prisma.user.findUnique({
      where: { id: followerUserId },
      select: { avatar: true }
    });
    followerAvatar = follower?.avatar || '';
  } catch (error) {
    logger.error('Failed to get follower avatar', { error: error.message, followerUserId });
  }

  const notification = {
    title: `${followerUsername}`,
    body: 'started following you'
  };

  const data = {
    type: 'follow',
    userId: followerUserId,
    username: followerUsername,
    avatar: followerAvatar
  };

  return await sendFCMNotification([followedUserId], notification, data);
}

/**
 * Send notification when a message is sent
 * @param {Array} recipientUserIds - Array of recipient user IDs
 * @param {string} senderUserId - ID of the user who sent the message
 * @param {string} senderUsername - Username of the sender
 * @param {string} messageContent - Content of the message
 * @param {string} chatId - ID of the chat
 */
async function sendMessageNotification(recipientUserIds, senderUserId, senderUsername, messageContent, chatId) {
  if (!recipientUserIds || recipientUserIds.length === 0) {
    logger.warn('No recipients for message notification', { chatId });
    return { success: false, message: 'No recipients provided' };
  }

  logger.info('Preparing message notification', {
    recipientCount: recipientUserIds.length,
    senderUsername,
    chatId,
    messagePreview: messageContent.substring(0, 20) + '...'
  });

  // Get sender's avatar
  let senderAvatar = '';
  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderUserId },
      select: { avatar: true }
    });
    senderAvatar = sender?.avatar || '';
  } catch (error) {
    logger.error('Failed to get sender avatar', { error: error.message, senderUserId });
  }

  // Truncate message content for notification
  const truncatedMessage = messageContent.length > 50 
    ? messageContent.substring(0, 50) + '...' 
    : messageContent;

  const notification = {
    title: `${senderUsername}`,
    body: truncatedMessage
  };

  const data = {
    type: 'message',
    chatId: chatId.toString(),
    senderId: senderUserId.toString(),
    username: senderUsername,
    avatar: senderAvatar,
    action: 'open_chat'
  };

  logger.info('Sending message notification', {
    recipientCount: recipientUserIds.length,
    senderUsername,
    chatId,
    messagePreview: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
    notificationTitle: `${senderUsername}`,
    notificationBody: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent
  });

  const result = await sendFCMNotification(recipientUserIds, notification, data);
  
  if (result.success) {
    logger.info('Message notification sent successfully', { chatId, successCount: result.successCount });
  } else {
    logger.error('Message notification failed', { chatId, message: result.message });
  }
  
  return result;
}

/**
 * Save or update FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} platform - Platform (android, ios, web)
 */
async function saveFCMToken(userId, token, platform = 'unknown') {
  try {
    // Use upsert to handle both create and update in a single atomic operation
    // This prevents race conditions and duplicate key errors
    const result = await prisma.fcmToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        isActive: true,
        lastUsed: new Date()
      },
      create: {
        token,
        userId,
        platform,
        isActive: true,
        lastUsed: new Date()
      }
    });

    logger.info('Upserted FCM token', { userId, action: result.id ? 'updated' : 'created' });
    return { success: true };
  } catch (error) {
    logger.error('Error saving FCM token', { error: error.message, userId });
    
    // Handle specific duplicate key error gracefully
    if (error.code === 'P2002' && error.meta?.target?.includes('token')) {
      logger.info('FCM token already exists, attempting to update', { userId });
      try {
        // Fallback: try to update the existing token
        await prisma.fcmToken.update({
          where: { token },
          data: {
            userId,
            platform,
            isActive: true,
            lastUsed: new Date()
          }
        });
        logger.info('Updated existing FCM token', { userId });
        return { success: true };
      } catch (updateError) {
        logger.error('Failed to update existing FCM token', { error: updateError.message, userId });
        return { success: false, error: updateError.message };
      }
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Remove FCM token (when user logs out or uninstalls app)
 * @param {string} token - FCM token to remove
 */
async function removeFCMToken(token) {
  try {
    await prisma.fcmToken.delete({
      where: { token }
    });
    logger.info('Removed FCM token', { tokenPreview: token.substring(0, 20) + '...' });
    return { success: true };
  } catch (error) {
    logger.error('Error removing FCM token', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all FCM tokens for a user
 * @param {string} userId - User ID
 */
async function getUserFCMTokens(userId) {
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        token: true,
        platform: true,
        lastUsed: true
      }
    });
    return tokens;
  } catch (error) {
    logger.error('Error getting user FCM tokens', { error: error.message, userId });
    return [];
  }
}

/**
 * Get FCM tokens for multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Array>} Array of FCM token records
 */
async function getFCMTokensByUserIds(userIds) {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn('No user IDs provided for FCM token lookup');
      return [];
    }

    const fcmTokens = await prisma.fcmToken.findMany({
      where: {
        userId: {
          in: userIds
        },
        isActive: true
      },
      select: {
        token: true,
        userId: true,
        platform: true,
        lastUsed: true
      }
    });

    logger.info('Found FCM tokens', { tokenCount: fcmTokens.length, userCount: userIds.length });
    return fcmTokens;
  } catch (error) {
    logger.error('Error getting FCM tokens by user IDs', { error: error.message, userCount: userIds.length });
    return [];
  }
}
/**
 * Send notification when a user is mentioned in a group chat
 * @param {string} mentionedUserId - ID of the mentioned user
 * @param {string} senderUsername - Username of the sender
 * @param {string} messageContent - Content of the message
 * @param {string} chatId - ID of the chat
 */
async function sendMentionNotification(mentionedUserId, senderUsername, messageContent, chatId) {
  const truncatedMessage = messageContent.length > 50 
    ? messageContent.substring(0, 50) + '...' 
    : messageContent;

  const notification = {
    title: `${senderUsername} mentioned you`,
    body: truncatedMessage
  };

  const data = {
    type: 'mention',
    chatId: chatId.toString(),
    username: senderUsername,
    action: 'open_chat'
  };

  return await sendFCMNotification([mentionedUserId], notification, data);
}

module.exports = {
  sendFCMNotification,
  sendLikeNotification,
  sendCommentNotification,
  sendFollowNotification,
  sendMessageNotification,
  sendMentionNotification,
  saveFCMToken,
  removeFCMToken,
  getFCMTokensByUserIds,
  getUserFCMTokens
};
