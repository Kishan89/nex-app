// routes/debug.js
const express = require('express');
const router = express.Router();
const { sendMessageNotification } = require('../services/fcmService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('DebugRoutes');

/**
 * Test image message notification
 * POST /api/debug/test-image-notification
 */
router.post('/test-image-notification', async (req, res) => {
  try {
    const { recipientUserId, senderUserId, senderUsername, chatId, imageUrl, messageContent } = req.body;
    
    logger.info('🧪 [DEBUG] Testing image message notification', {
      recipientUserId,
      senderUserId,
      senderUsername,
      chatId,
      hasImage: !!imageUrl,
      hasText: !!messageContent
    });
    
    const result = await sendMessageNotification(
      [recipientUserId],
      senderUserId,
      senderUsername,
      messageContent || '',
      chatId,
      imageUrl
    );
    
    res.json({
      success: true,
      result,
      message: 'Test notification sent'
    });
    
  } catch (error) {
    logger.error('🧪 [DEBUG] Test notification failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test text message notification
 * POST /api/debug/test-text-notification
 */
router.post('/test-text-notification', async (req, res) => {
  try {
    const { recipientUserId, senderUserId, senderUsername, chatId, messageContent } = req.body;
    
    logger.info('🧪 [DEBUG] Testing text message notification', {
      recipientUserId,
      senderUserId,
      senderUsername,
      chatId,
      messageContent
    });
    
    const result = await sendMessageNotification(
      [recipientUserId],
      senderUserId,
      senderUsername,
      messageContent,
      chatId,
      null // No image
    );
    
    res.json({
      success: true,
      result,
      message: 'Test notification sent'
    });
    
  } catch (error) {
    logger.error('🧪 [DEBUG] Test notification failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;