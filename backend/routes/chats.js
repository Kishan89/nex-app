const express = require('express');
const chatController = require('../controllers/chatController');
const { verifyAuthToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get user's chats
// This route now correctly handles GET /api/chats/:userId
router.get('/:userId', optionalAuth, chatController.getUserChats);

// Get chat messages
router.get('/:chatId/messages', optionalAuth, chatController.getChatMessages);

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

// Get unread messages for banner
router.get('/:chatId/unread', verifyAuthToken, chatController.getUnreadMessages);

module.exports = router;