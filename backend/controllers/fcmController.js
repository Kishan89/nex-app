// controllers/fcmController.js
const { saveFCMToken, removeFCMToken, getUserFCMTokens, sendMessageNotification } = require('../services/fcmService');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

class FCMController {
  /**
   * Save FCM token for a user
   */
  async saveToken(req, res, next) {
    try {
      const { token, platform } = req.body;
      const { userId } = req.user || {};

      if (!token || !userId) {
        return res.status(400).json(errorResponse('FCM token and authentication are required.'));
      }

      const result = await saveFCMToken(userId, token, platform);

      if (result.success) {
        res.status(200).json(successResponse(null, 'FCM token saved successfully.'));
      } else {
        res.status(500).json(errorResponse(result.error || 'Failed to save FCM token.'));
      }
    } catch (error) {
      logger.error('Error in saveToken', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Remove FCM token
   */
  async removeToken(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json(errorResponse('FCM token is required.'));
      }

      const result = await removeFCMToken(token);

      if (result.success) {
        res.status(200).json(successResponse(null, 'FCM token removed successfully.'));
      } else {
        res.status(500).json(errorResponse(result.error || 'Failed to remove FCM token.'));
      }
    } catch (error) {
      logger.error('Error in removeToken', { error: error.message });
      next(error);
    }
  }

  /**
   * Get user's FCM tokens
   */
  async getUserTokens(req, res, next) {
    try {
      const { userId } = req.user || {};

      if (!userId) {
        return res.status(401).json(errorResponse('Authentication required.'));
      }

      const tokens = await getUserFCMTokens(userId);
      res.status(200).json(successResponse(tokens, 'FCM tokens retrieved successfully.'));
    } catch (error) {
      logger.error('Error in getUserTokens', { error: error.message, userId: req.user?.userId });
      next(error);
    }
  }

  /**
   * Test notification endpoint (for development/testing)
   */
  async testNotification(req, res, next) {
    try {
      const { targetUserId, title, body, postId, type } = req.body;
      const { sendFCMNotification } = require('../services/fcmService');

      if (!targetUserId || !title || !body) {
        return res.status(400).json(errorResponse('targetUserId, title, and body are required.'));
      }

      const result = await sendFCMNotification(
        [targetUserId], 
        { title, body }, 
        { postId: postId || 'test', type: type || 'test' }
      );

      res.status(200).json(successResponse(result, 'Test notification sent successfully.'));
    } catch (error) {
      logger.error('Error in testNotification', { error: error.message });
      next(error);
    }
  }

  /**
   * Test message notification endpoint
   */
  async testMessageNotification(req, res, next) {
    try {
      const { recipientUserId, senderUsername, messageContent, chatId } = req.body;
      const { userId } = req.user || {};

      if (!recipientUserId || !senderUsername || !messageContent || !chatId) {
        return res.status(400).json(errorResponse('recipientUserId, senderUsername, messageContent, and chatId are required.'));
      }

      const result = await sendMessageNotification(
        [recipientUserId],
        userId || 'test-sender',
        senderUsername,
        messageContent,
        chatId
      );

      res.status(200).json(successResponse(result, 'Test message notification sent successfully.'));
    } catch (error) {
      logger.error('Error in testMessageNotification', { error: error.message });
      next(error);
    }
  }

  /**
   * Debug FCM tokens for a user
   */
  async debugTokens(req, res, next) {
    try {
      const { userId } = req.params;
      const { prisma } = require('../config/database');

      logger.info('Debugging FCM tokens', { userId });

      // Get all FCM tokens for this user
      const tokens = await prisma.fcmToken.findMany({
        where: { userId },
        select: {
          id: true,
          token: true,
          platform: true,
          isActive: true,
          createdAt: true,
          lastUsed: true
        }
      });

      logger.info('Found FCM tokens', { userId, tokenCount: tokens.length });

      res.status(200).json(successResponse({
        userId,
        tokenCount: tokens.length,
        tokens: tokens.map(t => ({
          id: t.id,
          platform: t.platform,
          isActive: t.isActive,
          tokenPreview: t.token.substring(0, 20) + '...',
          createdAt: t.createdAt,
          lastUsed: t.lastUsed
        }))
      }, 'FCM tokens debug info'));
    } catch (error) {
      logger.error('Error in debugTokens', { error: error.message, userId: req.params.userId });
      next(error);
    }
  }
}

module.exports = new FCMController();
