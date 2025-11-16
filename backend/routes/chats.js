const express = require('express');
const chatController = require('../controllers/chatController');
const { verifyAuthToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// IMPORTANT: More specific routes must come before generic /:userId route

// Get chat messages (must be before /:chatId to avoid conflict)
router.get('/:chatId/messages', optionalAuth, chatController.getChatMessages);

// Get unread messages for banner (must be before /:chatId to avoid conflict)
router.get('/:chatId/unread', verifyAuthToken, chatController.getUnreadMessages);

// Mark chat as read
router.post('/:chatId/mark-read', verifyAuthToken, chatController.markChatAsRead);

// Mark messages as read (new unread system)
router.post('/:chatId/mark-messages-read', verifyAuthToken, chatController.markMessagesAsRead);

// Send a message
router.post('/:chatId/messages', verifyAuthToken, chatController.sendMessage);

// Delete a chat
router.delete('/:chatId', chatController.deleteChat);

// Get a single chat by ID - MUST be after all other /:chatId routes
router.get('/:chatId', optionalAuth, chatController.getChatById);

// Create a new chat
router.post('/', chatController.createChat);

module.exports = router;