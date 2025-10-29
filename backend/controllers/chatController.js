const chatService = require('../services/chatService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendMessageNotification } = require('../services/fcmService');
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, CACHE, PAGINATION, NOTIFICATION } = require('../constants');
const { BadRequestError, UnauthorizedError, ForbiddenError } = require('../utils/errors');

const logger = createLogger('ChatController');

class ChatController {
  /**
   * Get user's chats (OPTIMIZED for instant loading)
   */
  async getUserChats(req, res, next) {
    try {
      const { userId } = req.params;
      const requestUserId = req.user?.userId || userId;
      
      if (!requestUserId) {
        throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
      }
      
      const chats = await chatService.getUserChats(requestUserId);
      
      res.set({
        'Cache-Control': `private, max-age=${CACHE.CHATS_MAX_AGE}`,
        'ETag': `"chats-${requestUserId}-${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
      });
      
      res.status(HTTP_STATUS.OK).json(chats);
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
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      if (!chatId) {
        throw new BadRequestError(ERROR_MESSAGES.CHAT_ID_REQUIRED);
      }
      
      const markedCount = await chatService.markMessagesAsRead(chatId, userId);
      
      res.status(HTTP_STATUS.OK).json(successResponse({ markedCount }, SUCCESS_MESSAGES.MESSAGES_MARKED_READ));
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
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      if (!chatId) {
        throw new BadRequestError(ERROR_MESSAGES.CHAT_ID_REQUIRED);
      }
      
      const unreadMessages = await chatService.getUnreadMessages(chatId, userId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(unreadMessages, SUCCESS_MESSAGES.UNREAD_MESSAGES_RETRIEVED));
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
        throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
      }
      
      const messages = await chatService.getChatMessages(chatId, { 
        page: parseInt(page) || PAGINATION.DEFAULT_PAGE, 
        limit: parseInt(limit) || PAGINATION.DEFAULT_LIMIT,
        userId,
        cursor 
      });
      
      res.set({
        'Cache-Control': `private, max-age=${CACHE.MESSAGES_MAX_AGE}`,
        'ETag': `"messages-${chatId}-${messages.length}"`,
      });
      
      res.status(HTTP_STATUS.OK).json(messages);
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
        throw new BadRequestError(ERROR_MESSAGES.CONTENT_REQUIRED);
      }

      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: { chatId, userId: senderId }
      });

      if (!chatParticipant) {
        throw new ForbiddenError(ERROR_MESSAGES.NOT_PARTICIPANT);
      }
      
      const message = await chatService.sendMessage({ content, chatId, senderId });
      
      res.status(HTTP_STATUS.CREATED).json(message);
      
      setImmediate(async () => {
        try {
          const socketService = require('../services/socketService');
          if (socketService.io) {
            const socketMessage = {
              id: message.id,
              text: message.text,
              content: message.text,
              isUser: false,
              timestamp: message.timestamp,
              status: message.status,
              sender: message.sender,
              chatId
            };
            
            socketService.io.to(`chat:${chatId}`).emit('new_message', socketMessage);
          }
          
          await this.sendMessageNotification(chatId, senderId, content);
        } catch (backgroundError) {
          logger.error('Background message processing failed:', backgroundError);
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

      if (!chat) {
        return;
      }

      const participantUserIds = chat.participants
        .filter(p => p.userId !== senderId)
        .map(p => p.userId);

      if (participantUserIds.length === 0 || 
         (participantUserIds.length === 1 && participantUserIds[0] === senderId)) {
        return;
      }

      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true }
      });

      if (!sender) {
        return;
      }

      const result = await sendMessageNotification(
        participantUserIds,
        senderId,
        sender.username,
        content,
        chatId
      );

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
            logger.warn('Notification retry failed', retryError);
          }
        }, NOTIFICATION.RETRY_DELAY_MS);
      }

    } catch (error) {
      logger.error('Error in sendMessageNotification', error);
    }
  }

  /**
   * Create a new chat
   */
  async createChat(req, res, next) {
    try {
      const { name, isGroup, participantIds } = req.body;
      
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
        throw new BadRequestError(ERROR_MESSAGES.PARTICIPANTS_REQUIRED);
      }
      
      const chat = await chatService.createChat({ name, isGroup, participantIds });
      
      res.status(HTTP_STATUS.CREATED).json(successResponse(chat, SUCCESS_MESSAGES.CHAT_CREATED));
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
      
      res.status(HTTP_STATUS.OK).json(successResponse(null, SUCCESS_MESSAGES.CHAT_DELETED));
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
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED);
      }
      
      const result = await chatService.markChatAsRead(chatId, userId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(result, SUCCESS_MESSAGES.CHAT_MARKED_READ));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();