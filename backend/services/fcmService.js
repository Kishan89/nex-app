// services/fcmService.js
const admin = require('../lib/firebaseAdmin');
const { prisma } = require('../config/database');

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
    console.log('🔍 FCM Debug - Input:', {
      userIds,
      notificationTitle: notification.title,
      notificationBody: notification.body,
      dataType: data.type
    });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.log('❌ No user IDs provided. Skipping FCM notification.');
      return { success: false, message: 'No user IDs provided' };
    }

    // Get FCM tokens for the users
    console.log('🔍 Searching FCM tokens for users:', userIds);
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

    console.log('🔍 Found FCM tokens:', {
      tokenCount: fcmTokens.length,
      tokens: fcmTokens.map(t => ({ userId: t.userId, platform: t.platform, tokenPreview: t.token.substring(0, 20) + '...' }))
    });

    if (fcmTokens.length === 0) {
      console.log('❌ No FCM tokens found for users. Skipping notification.');
      return { success: false, message: 'No FCM tokens found' };
    }

    const tokens = fcmTokens.map(tokenRecord => tokenRecord.token);
    
    console.log(`📱 Sending FCM notification to ${tokens.length} devices`);

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
    console.log('🚀 Attempting to send FCM notification with payload:', {
      tokenCount: tokens.length,
      notificationTitle: message.notification.title,
      notificationBody: message.notification.body,
      dataKeys: Object.keys(message.data)
    });

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...message
    });

    console.log(`📊 FCM notification result: Success: ${response.successCount}, Failed: ${response.failureCount}`);
    
    if (response.responses) {
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          console.log(`✅ Token ${idx + 1}: Message sent successfully`);
        } else {
          console.log(`❌ Token ${idx + 1}: Failed - ${resp.error?.code} - ${resp.error?.message}`);
        }
      });
    }

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          console.error(`❌ Failed to send to token ${tokens[idx]}: ${error.code} - ${error.message}`);
          
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
        console.log(`🗑️ Removed ${failedTokens.length} invalid FCM tokens from database`);
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: `Notification sent to ${response.successCount} devices`
    };

  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
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
    console.log('ℹ️ Skipping like notification - user liked their own post');
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
    console.error('Failed to get liker avatar:', error);
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
    console.log('ℹ️ Skipping comment notification - user commented on their own post');
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
    console.error('Failed to get commenter avatar:', error);
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
    console.log('ℹ️ Skipping follow notification - cannot follow yourself');
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
    console.error('Failed to get follower avatar:', error);
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
    console.log('ℹ️ No recipients for message notification');
    return { success: false, message: 'No recipients provided' };
  }

  console.log('📱 Preparing message notification:', {
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
    console.error('Failed to get sender avatar:', error);
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

  console.log('📱 Sending FCM message notification...');
  console.log('📱 Message notification details:', {
    recipientCount: recipientUserIds.length,
    senderUsername,
    chatId,
    messagePreview: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
    notificationTitle: `${senderUsername}`,
    notificationBody: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
    dataPayload: {
      type: 'message',
      chatId: chatId.toString(),
      senderId: senderUserId.toString(),
      username: senderUsername,
      action: 'open_chat'
    }
  });

  const result = await sendFCMNotification(recipientUserIds, notification, data);
  
  if (result.success) {
    console.log('✅ Message notification sent successfully');
  } else {
    console.log('❌ Message notification failed:', result.message);
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

    console.log(`✅ Upserted FCM token for user ${userId} (${result.id ? 'updated' : 'created'})`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    
    // Handle specific duplicate key error gracefully
    if (error.code === 'P2002' && error.meta?.target?.includes('token')) {
      console.log('ℹ️ FCM token already exists, attempting to update...');
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
        console.log(`✅ Updated existing FCM token for user ${userId}`);
        return { success: true };
      } catch (updateError) {
        console.error('❌ Failed to update existing FCM token:', updateError);
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
    console.log(`✅ Removed FCM token: ${token.substring(0, 20)}...`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing FCM token:', error);
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
    console.error('❌ Error getting user FCM tokens:', error);
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
      console.log('ℹ️ No user IDs provided for FCM token lookup');
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

    console.log(`📱 Found ${fcmTokens.length} FCM tokens for ${userIds.length} users`);
    return fcmTokens;
  } catch (error) {
    console.error('❌ Error getting FCM tokens by user IDs:', error);
    return [];
  }
}
module.exports = {
  sendFCMNotification,
  sendLikeNotification,
  sendCommentNotification,
  sendFollowNotification,
  sendMessageNotification,
  saveFCMToken,
  removeFCMToken,
  getFCMTokensByUserIds,
  getUserFCMTokens
};
