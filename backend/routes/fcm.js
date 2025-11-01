// routes/fcm.js
const express = require('express');
const fcmController = require('../controllers/fcmController');
const { verifyAuthToken } = require('../middleware/auth');

const router = express.Router();

// Save FCM token for authenticated user
router.post('/token', verifyAuthToken, fcmController.saveToken);

// Remove FCM token
router.delete('/token', fcmController.removeToken);

// Get user's FCM tokens
router.get('/tokens', verifyAuthToken, fcmController.getUserTokens);

// Test notification endpoint (for development/testing)
router.post('/test', verifyAuthToken, fcmController.testNotification);

// Test message notification endpoint
router.post('/test-message', verifyAuthToken, fcmController.testMessageNotification);

// Debug FCM tokens for a user
router.get('/debug/:userId', fcmController.debugTokens);

module.exports = router;
