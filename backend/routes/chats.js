const express = require('express');
const chatController = require('../controllers/chatController');
const { verifyAuthToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// IMPORTANT: More specific routes must come before generic /:userId route

// Get chat messages (must be before /:userId to avoid conflict)
router.get('/:chatId/messages', optionalAuth, chatController.getChatMessages);

// Get unread messages for banner (must be before /:userId to avoid conflict)
router.get('/:chatId/unread', verifyAuthToken, chatController.getUnreadMessages);

// Get a single chat by ID (must be before /:userId to avoid conflict)
router.get('/chat/:chatId', optionalAuth, chatController.getChatById);

// Get user's chats
// This route now correctly handles GET /api/chats/:userId
router.get('/:userId', optionalAuth, chatController.getUserChats);

// Send a message
router.post('/:chatId/messages', verifyAuthToken, chatController.sendMessage);

// Create a new chat
router.post('/', chatController.createChat);

// Delete a chat
router.delete('/:chatId', chatController.deleteChat);

// Mark chat as read
router.post('/:chatId/mark-read', verifyAuthToken, chatController.markChatAsRead);

// Mark messages as read (new unread system)
router.post('/:chatId/mark-messages-read', verifyAuthToken, chatController.markMessagesAsRead);

module.exports = router;