const chatService = require('../services/chatService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendPushNotification } = require('../services/pushNotificationService');
const { sendMessageNotification } = require('../services/fcmService');
const { prisma } = require('../config/database');

class ChatController {
  /**
   * Get user's chats (OPTIMIZED for instant loading)
   */
  async getUserChats(req, res, next) {
    try {
      const { userId } = req.params;
      const requestUserId = req.user?.userId || userId;
      
      if (!requestUserId) {
        return res.status(400).json(errorResponse('User ID is required'));
      }
      
      // INSTANT RESPONSE: Get chats with optimized query
      const chats = await chatService.getUserChats(requestUserId);
      
      // Add response headers for caching
      res.set({
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        'ETag': `"chats-${requestUserId}-${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
      });
      
      // Return chats directly for frontend compatibility
      res.status(200).json(chats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(req, res, next) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user || {};
      
      if (!userId) {
        return res.status(400).json(errorResponse('Authentication required'));
      }
      
      if (!chatId) {
        return res.status(400).json(errorResponse('Chat ID is required'));
      }
      
      const markedCount = await chatService.markMessagesAsRead(chatId, userId);
      
      res.status(200).json(successResponse({ markedCount }, 'Messages marked as read'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread messages for banner
   */
  async getUnreadMessages(req, res, next) {
    try {
      const { chatId } = req.params;
      const { userId } = req.user || {};
      
      if (!userId) {
        return res.status(400).json(errorResponse('Authentication required'));
      }
      
      if (!chatId) {
        return res.status(400).json(errorResponse('Chat ID is required'));
      }
      
      const unreadMessages = await chatService.getUnreadMessages(chatId, userId);
      
      res.status(200).json(successResponse(unreadMessages, 'Unread messages retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat messages (OPTIMIZED for instant loading)
   */
  async getChatMessages(req, res, next) {
    try {
      const { chatId } = req.params;
      const { page, limit, cursor } = req.query;
      const userId = req.user?.userId || req.query.userId;
      
      if (!userId) {
        return res.status(400).json(errorResponse('User ID is required'));
      }
      
      // 🚀 INSTANT LOADING: Get messages with optimized query
      const messages = await chatService.getChatMessages(chatId, { 
        page: parseInt(page) || 1, 
        limit: parseInt(limit) || 50, // Smaller initial load for speed
        userId,
        cursor 
      });
      
      // Add caching headers for better performance
      res.set({
        'Cache-Control': 'private, max-age=10', // Short cache for real-time updates
        'ETag': `"messages-${chatId}-${messages.length}"`,
      });
      
      // Return messages directly for frontend compatibility
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message (OPTIMIZED for instant response)
   */
  async sendMessage(req, res, next) {
    try {
      const { chatId } = req.params;
      const { content } = req.body;
      const senderId = req.user?.userId || req.body.senderId;
      
      if (!content || !senderId) {
        return res.status(400).json(errorResponse('Content and senderId are required'));
      }

      // 🚀 FAST VALIDATION: Quick participant check
      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: { chatId, userId: senderId }
      });

      if (!chatParticipant) {
        return res.status(403).json(errorResponse('You are not a participant in this chat'));
      }
      
      // 🚀 INSTANT MESSAGE SAVE: Save message to database
      const message = await chatService.sendMessage({ content, chatId, senderId });
      
      // 🚀 INSTANT RESPONSE: Send success immediately
      res.status(201).json(message);
      
      // 🔄 BACKGROUND PROCESSING: Handle notifications and broadcasting
      setImmediate(async () => {
        try {
          // Broadcast message via socket to all chat participants
          const socketService = require('../services/socketService');
          if (socketService.io) {
            const socketMessage = {
              id: message.id,
              text: message.text,
              content: message.text,
              isUser: false, // Will be determined by receiver
              timestamp: message.timestamp,
              status: message.status,
              sender: message.sender,
              chatId
            };
            
            socketService.io.to(`chat:${chatId}`).emit('new_message', socketMessage);
          }
          
          // Send push notification to other participants (background)
          await this.sendMessageNotification(chatId, senderId, content);
        } catch (backgroundError) {
          console.error('❌ Background message processing failed:', backgroundError);
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send push notification for new message
   */
  async sendMessageNotification(chatId, senderId, content) {
    try {
      
      // Get chat participants (excluding sender)
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          }
        }
      });

      // Chat found

      if (!chat) {
        return;
      }

      // Get participant user IDs (excluding sender)
      const participantUserIds = chat.participants
        .filter(p => p.userId !== senderId)
        .map(p => p.userId);

      // Participants analysis completed

      if (participantUserIds.length === 0) {
        return;
      }

      // Check if this is a self-message (should not send notification)
      if (participantUserIds.length === 1 && participantUserIds[0] === senderId) {
        return;
      }

      // Get sender info
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true }
      });

      if (!sender) {
        return;
      }

      // Notification details prepared

      // Use the dedicated FCM message notification function with retry mechanism
      const result = await sendMessageNotification(
        participantUserIds,
        senderId,
        sender.username,
        content,
        chatId
      );

      // Message notification sent

      // If notification fails, retry once after a short delay
      if (!result.success && result.message !== 'No FCM tokens found') {
        setTimeout(async () => {
          try {
            await sendMessageNotification(
              participantUserIds,
              senderId,
              sender.username,
              content,
              chatId
            );
          } catch (retryError) {
            // Retry notification failed
          }
        }, 2000);
      }

    } catch (error) {
      // Error in sendMessageNotification
    }
  }

  /**
   * Create a new chat
   */
  async createChat(req, res, next) {
    try {
      const { name, isGroup, participantIds } = req.body;
      
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
        return res.status(400).json(errorResponse('At least 2 participants are required'));
      }
      
      const chat = await chatService.createChat({ name, isGroup, participantIds });
      
      res.status(201).json(successResponse(chat, 'Chat created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(req, res, next) {
    try {
      const { chatId } = req.params;
      
      await chatService.deleteChat(chatId);
      
      // All successful responses will now use the successResponse helper
      res.status(200).json(successResponse(null, 'Chat deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark chat as read (reset unread count)
   */
  async markChatAsRead(req, res, next) {
    try {
      const { chatId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }
      
      // Marking chat as read
      
      // Mark all messages in this chat as read for this user
      const result = await chatService.markChatAsRead(chatId, userId);
      
      res.status(200).json(successResponse(result, 'Chat marked as read'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();