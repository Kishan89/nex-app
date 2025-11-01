const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./chatService');
const notificationService = require('./notificationService');
const { sendMessageNotification } = require('./fcmService');
const { createLogger } = require('../utils/logger');
const logger = createLogger('SocketService');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
    
  }

  // Authenticate socket connection
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  }

  // Handle new socket connection
  async handleConnection(socket) {
    const userId = socket.userId;

    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);
    logger.info('User connected to socket', { userId, totalConnected: this.connectedUsers.size });

    // Auto-join user to all their chat rooms
    try {
      const userChats = await chatService.getUserChats(userId);
      if (userChats && Array.isArray(userChats)) {
        userChats.forEach(chat => {
          socket.join(`chat:${chat.id}`);
        });
        logger.info('User auto-joined chat rooms', { userId, chatCount: userChats.length });
      }
    } catch (error) {
      logger.error('Error auto-joining user chats', { error: error.message, userId });
    }

    // Broadcast online status to other users (limited to 20% to reduce spam)
    if (Math.random() < 0.2) {
      socket.broadcast.emit('user_online', { userId, isOnline: true });
    }

    // Handle joining chat rooms
    socket.on('join_chat', async (chatId) => {
      socket.join(`chat:${chatId}`);
      logger.info('User joined chat room', { userId, chatId });
      
      // Ensure other chat participants are also in the room
      await this.ensureChatParticipantsInRoom(chatId);
      
      // Notify other participants that user joined
      socket.to(`chat:${chatId}`).emit('user_joined_chat', {
        userId,
        chatId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle leaving chat rooms
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug('User left chat room', { userId, chatId });
    });

    // Handle sending messages with acknowledgment
    socket.on('send_message', async (data, callback) => {
      try {
        const { chatId, content, tempMessageId } = data;
        logger.info('Socket message send initiated', { userId, chatId, tempMessageId, contentPreview: content.substring(0, 50) + '...' });

        // Save message to database
        const message = await chatService.sendMessage({
          content,
          chatId,
          senderId: userId
        });
        logger.info('Message saved to database', { messageId: message.id, chatId });

        // Update message status to DELIVERED since it's saved in DB
        await this.updateMessageStatus(message.id, 'DELIVERED');

        // Format message for socket emission
        const socketMessage = {
          id: message.id,
          text: message.content || message.text,
          content: message.content || message.text,
          isUser: false, // Will be determined by receiver
          timestamp: message.timestamp,
          status: 'delivered', // Mark as delivered since saved to DB
          sender: message.sender,
          chatId,
          tempMessageId // Include temp ID for replacement
        };

        // Emit message to all users in the chat (including sender for confirmation)
        logger.info('Broadcasting message to chat room', { chatId, messageId: message.id });
        this.io.to(`chat:${chatId}`).emit('new_message', socketMessage);

        // Send acknowledgment back to sender with delivery confirmation
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            messageId: message.id,
            tempMessageId,
            status: 'delivered',
            timestamp: message.timestamp
          });
          logger.debug('Message acknowledgment sent', { messageId: message.id });
        }

        // Send FCM push notification to other chat participants
        await this.sendFCMNotificationToOtherParticipants(chatId, userId, content, message);

        // Update chat's last message timestamp
        await this.updateChatTimestamp(chatId);
      } catch (error) {
        logger.error('Error sending message via socket', { error: error.message, userId, chatId: data.chatId });
        
        // Send error acknowledgment
        if (callback && typeof callback === 'function') {
          callback({
            success: false,
            error: error.message,
            tempMessageId: data.tempMessageId
          });
        }
        
        socket.emit('message_error', { error: error.message });
      }
    });

    // Handle message status updates
    socket.on('message_status_update', (data) => {
      const { messageId, status, chatId } = data;
      this.io.to(`chat:${chatId}`).emit('message_status_updated', {
        messageId,
        status
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId,
        chatId
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
        userId,
        chatId
      });
    });

      // Handle online status (without spam)
    this.updateUserOnlineStatus(userId, true);
    // Emit online status sparingly to avoid spam
    if (Math.random() > 0.8) { // Only emit 20% of the time to reduce spam
      socket.broadcast.emit('user_online', { userId });
    }

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected from socket', { userId, reason });
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      logger.debug('User removed from connected users', { userId, totalConnected: this.connectedUsers.size });
      this.updateUserOnlineStatus(userId, false);
      socket.broadcast.emit('user_offline', { userId });
    });
  }

  // Send FCM push notification to other chat participants
  async sendFCMNotificationToOtherParticipants(chatId, senderId, content, message) {
    try {
      // Get chat participants
      const { prisma } = require('../config/database');
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, username: true, isOnline: true }
              }
            }
          }
        }
      });

      if (!chat) return;

      // Get sender info
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true }
      });
      
      if (!sender) {
        logger.error('Sender not found for message notification', { senderId });
        return;
      }

      // Get recipient IDs (all participants except sender)
      const recipientIds = [];
      const onlineRecipients = [];
      const offlineRecipients = [];
      
      for (const participant of chat.participants) {
        if (participant.userId !== senderId) {
          recipientIds.push(participant.userId);
          
          // Check if recipient is currently connected via socket
          if (this.isUserOnline(participant.userId)) {
            onlineRecipients.push(participant.userId);
          } else {
            offlineRecipients.push(participant.userId);
          }
        }
      }

      if (recipientIds.length === 0) return;

      // Store notification in database for history
      for (const recipientId of recipientIds) {
        await notificationService.createNotification({
          userId: recipientId,
          fromUserId: senderId,
          type: 'MESSAGE',
          message: `${sender.username} sent you a message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
        });
      }

      // Send FCM push notification to ALL recipients
      // FCM will handle whether to show notification based on app state
      await sendMessageNotification(
        recipientIds,
        senderId,
        sender.username,
        content,
        chatId
      );

      // Note: Socket real-time updates are already handled by new_message event
      // No need for duplicate socket notifications
    } catch (error) {
      logger.error('Error sending FCM notification to chat participants', { error: error.message, chatId });
    }
  }

  // DEPRECATED: Socket notifications replaced by FCM
  // Keeping for backward compatibility but should not be used
  sendNotificationToUser(userId, notification) {
    // Socket notifications are disabled to prevent duplicates
    // All notifications should go through FCM
    return;
  }

  // Update user online status
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      const { prisma } = require('../config/database');
      
      // First check if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!userExists) {
        logger.warn('User not found, skipping online status update', { userId });
        return;
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline,
          lastSeen: isOnline ? null : new Date()
        }
      });
    } catch (error) {
      logger.error('Error updating user online status', { error: error.message, userId });
    }
  }

  // Update message status
  async updateMessageStatus(messageId, status) {
    try {
      const { prisma } = require('../config/database');
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: status.toUpperCase()
        }
      });
      logger.debug('Message status updated', { messageId, status });
    } catch (error) {
      logger.error('Error updating message status', { error: error.message, messageId });
    }
  }

  // Update chat timestamp
  async updateChatTimestamp(chatId) {
    try {
      const { prisma } = require('../config/database');
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error updating chat timestamp', { error: error.message, chatId });
    }
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Emit to user (alias for sendToUser for consistency)
  emitToUser(userId, event, data) {
    return this.sendToUser(userId, event, data);
  }

  // Send message to chat room
  sendToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  // Ensure all chat participants are in the room
  async ensureChatParticipantsInRoom(chatId) {
    try {
      const { prisma } = require('../config/database');
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            select: { userId: true }
          }
        }
      });

      if (!chat) return;

      // For each participant, if they're online, make sure they're in the room
      for (const participant of chat.participants) {
        const socketId = this.connectedUsers.get(participant.userId);
        if (socketId) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && !socket.rooms.has(`chat:${chatId}`)) {
            socket.join(`chat:${chatId}`);
            logger.debug('Auto-joined user to chat room', { userId: participant.userId, chatId });
          }
        }
      }
    } catch (error) {
      logger.error('Error ensuring chat participants in room', { error: error.message, chatId });
    }
  }
}

module.exports = new SocketService();
