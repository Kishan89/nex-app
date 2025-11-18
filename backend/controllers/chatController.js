const chatService = require('../services/chatService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendMessageNotification } = require('../services/fcmService');
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, CACHE, PAGINATION, NOTIFICATION } = require('../constants');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');

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
   * Get a single chat by ID or user chats
   */
  async getChatById(req, res, next) {
    try {
      const { chatId } = req.params;
      const userId = req.user?.userId || req.query.userId;
      
      logger.info('getChatById called', { chatId, userId, hasUser: !!req.user });
      
      if (!userId) {
        throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
      }
      
      // Try to get single chat first
      try {
        const chat = await chatService.getChatById(chatId, userId);
        logger.info('Found chat by ID', { chatId, chatName: chat.name });
        return res.status(HTTP_STATUS.OK).json(successResponse(chat, SUCCESS_MESSAGES.CHAT_RETRIEVED));
      } catch (chatError) {
        // If chat not found, maybe this is a user ID request for all chats
        logger.info('Chat not found, trying as user chats request', { chatId });
        const chats = await chatService.getUserChats(chatId);
        return res.status(HTTP_STATUS.OK).json(chats);
      }
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
      
      logger.info('📨 [CONTROLLER] getChatMessages request', { 
        chatId, 
        userId, 
        page, 
        limit,
        hasAuthUser: !!req.user,
        queryUserId: req.query.userId
      });
      
      if (!userId) {
        logger.error('❌ [CONTROLLER] No userId provided', { 
          chatId,
          hasAuthUser: !!req.user,
          queryParams: req.query
        });
        throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
      }
      
      // Use higher limit (1000) if not specified to get all messages
      // This ensures app reopen fetches all messages, not just 15
      const messageLimit = parseInt(limit) || 1000;
      
      const messages = await chatService.getChatMessages(chatId, { 
        page: parseInt(page) || PAGINATION.DEFAULT_PAGE, 
        limit: messageLimit,
        userId,
        cursor 
      });
      
      logger.info('✅ [CONTROLLER] Sending messages response', { 
        chatId, 
        messageCount: messages.length 
      });
      
      res.set({
        'Cache-Control': `private, max-age=${CACHE.MESSAGES_MAX_AGE}`,
        'ETag': `"messages-${chatId}-${messages.length}"`,
      });
      
      res.status(HTTP_STATUS.OK).json(messages);
    } catch (error) {
      logger.error('❌ [CONTROLLER] Error in getChatMessages', { 
        error: error.message,
        stack: error.stack,
        chatId: req.params.chatId
      });
      next(error);
    }
  }

  /**
   * Send a message (OPTIMIZED for instant response)
   */
  async sendMessage(req, res, next) {
    try {
      const { chatId } = req.params;
      const { content, imageUrl } = req.body;
      const senderId = req.user?.userId || req.body.senderId;
      
      // Allow messages with either content or imageUrl (or both)
      if ((!content || !content.trim()) && !imageUrl) {
        throw new BadRequestError('Message must have either text content or an image');
      }
      
      if (!senderId) {
        throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
      }

      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: { chatId, userId: senderId }
      });

      if (!chatParticipant) {
        throw new ForbiddenError(ERROR_MESSAGES.NOT_PARTICIPANT);
      }
      
      const message = await chatService.sendMessage({ content, chatId, senderId, imageUrl });
      
      // Send raw timestamp - let frontend format it in user's timezone
      res.status(HTTP_STATUS.CREATED).json(message);
      
      setImmediate(async () => {
        try {
          const socketService = require('../services/socketService');
          if (socketService.io) {
            // Send raw timestamp - let frontend format it
            const socketMessage = {
              id: message.id,
              text: message.text,
              content: message.text,
              isUser: false,
              timestamp: message.timestamp, // Send raw ISO timestamp
              status: message.status,
              sender: message.sender,
              chatId,
              imageUrl: message.imageUrl || undefined, // Include image URL for image messages
            };
            
            // Get sender's socket to use broadcast (excludes sender automatically)
            const senderSocketId = socketService.getUserSocketId(senderId);
            
            if (senderSocketId) {
              // Get the sender's socket instance
              const senderSocket = socketService.io.sockets.sockets.get(senderSocketId);
              if (senderSocket) {
                // Use broadcast to exclude sender's socket
                senderSocket.broadcast.to(`chat:${chatId}`).emit('new_message', socketMessage);
              } else {
                // Fallback: broadcast to all if socket not found
                socketService.io.to(`chat:${chatId}`).emit('new_message', socketMessage);
              }
            } else {
              // If sender not connected via socket, broadcast to all in the room
              socketService.io.to(`chat:${chatId}`).emit('new_message', socketMessage);
            }
            
            // Check if this is the first message in the chat
            const messageCount = await prisma.message.count({
              where: { chatId }
            });
            
            // If this is the first message, emit chat_created to other participants
            if (messageCount === 1) {
              const chat = await prisma.chat.findUnique({
                where: { id: chatId },
                include: {
                  participants: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          username: true,
                          avatar: true,
                        }
                      }
                    }
                  }
                }
              });
              
              if (chat) {
                // Emit chat_created only to other participants (not the sender)
                chat.participants.forEach(participant => {
                  if (participant.userId !== senderId) {
                    socketService.emitToUser(participant.userId, 'chat_created', {
                      chat: chat,
                      chatId: chat.id,
                      timestamp: new Date().toISOString()
                    });
                  }
                });
                logger.info('Chat created event emitted after first message', { chatId: chat.id });
              }
            }
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
      
      // 🚀 REAL-TIME: DO NOT emit chat_created event here
      // Chat will only appear in other user's list when first message is sent
      // This prevents empty chats from appearing in the chat list
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
      const userId = req.user?.userId;

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED || 'Unauthorized');
      }

      if (!chatId) {
        throw new BadRequestError(ERROR_MESSAGES.CHAT_ID_REQUIRED || 'Chat ID is required');
      }

      // Load chat with participants to enforce permissions
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: true
        }
      });

      if (!chat) {
        throw new NotFoundError(ERROR_MESSAGES.CHAT_NOT_FOUND || 'Chat not found');
      }

      // User must be a participant of the chat
      const participant = chat.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new ForbiddenError(ERROR_MESSAGES.UNAUTHORIZED || 'You are not a participant of this chat');
      }

      // For group chats, only admins can delete the chat for everyone
      if (chat.isGroup && !participant.isAdmin) {
        throw new ForbiddenError('Only group admins can delete this group');
      }

      const participantIds = chat.participants.map(p => p.userId) || [];

      await chatService.deleteChat(chatId);

      res.status(HTTP_STATUS.OK).json(successResponse(null, SUCCESS_MESSAGES.CHAT_DELETED));

      // 🚀 REAL-TIME: Emit socket event to all participants
      setImmediate(() => {
        try {
          const socketService = require('../services/socketService');
          if (socketService.io) {
            // Notify each participant about the deleted chat
            participantIds.forEach(userId => {
              socketService.emitToUser(userId, 'chat_deleted', {
                chatId: chatId,
                timestamp: new Date().toISOString()
              });
            });
            logger.info('Chat deleted event emitted to participants', { chatId, participantCount: participantIds.length });
          }
        } catch (socketError) {
          logger.error('Failed to emit chat_deleted event:', socketError);
        }
      });
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