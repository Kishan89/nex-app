const { prisma } = require('../config/database');
const { formatTimeAgo } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { MESSAGE_STATUS, PAGINATION } = require('../constants');
const { NotFoundError } = require('../utils/errors');

const logger = createLogger('ChatService');

class ChatService {
  /**
   * Get user's chats (OPTIMIZED for instant loading)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of chats
   */
  async getUserChats(userId) {
    try {
      logger.debug(`Getting chats for user: ${userId}`);
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        logger.warn('Invalid userId provided:', userId);
        return [];
      }
      
      const chats = await prisma.chat.findMany({
          where: {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
          select: {
            id: true,
            updatedAt: true,
            participants: {
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    isOnline: true,
                    lastSeen: true,
                  }
                }
              },
              where: {
                userId: { not: userId } // Get other participants only
              }
            },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                status: true,
                sender: {
                  select: {
                    username: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                messages: {
                  where: {
                    senderId: { not: userId },
                    status: { not: MESSAGE_STATUS.READ }
                  }
                }
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });

      const formattedChats = chats.map((chat) => {
        const otherParticipant = chat.participants[0]?.user;
        const lastMessage = chat.messages[0];
        const unreadCount = chat._count?.messages || 0;
        
        let lastSeenText = 'Last seen recently';
        if (otherParticipant?.isOnline) {
          lastSeenText = 'Online';
        } else if (otherParticipant?.lastSeen) {
          const timeAgo = formatTimeAgo(otherParticipant.lastSeen);
          lastSeenText = timeAgo === 'now' ? 'Last seen just now' : `Last seen ${timeAgo} ago`;
        }
        
        return {
          id: chat.id,
          name: otherParticipant?.username || 'Unknown',
          username: otherParticipant?.username || 'Unknown',
          userId: otherParticipant?.id || 'unknown',
          lastMessage: lastMessage?.content || 'No messages yet',
          time: lastMessage ? formatTimeAgo(lastMessage.createdAt) : '',
          avatar: otherParticipant?.avatar || null,
          isOnline: otherParticipant?.isOnline || false,
          lastSeen: otherParticipant?.lastSeen,
          lastSeenText: lastSeenText,
          unread: unreadCount,
          lastUpdated: chat.updatedAt,
          lastMessageId: lastMessage?.id,
        };
      });
      
      return formattedChats;
      
    } catch (error) {
      logger.error('Error getting user chats:', error);
      return [];
    }
  }

  /**
   * Get chat messages
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of messages
   */
  async getChatMessages(chatId, options = {}) {
    try {
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.MAX_LIMIT, userId, cursor } = options;
      
      const whereClause = { chatId };
      if (cursor) {
        whereClause.createdAt = { gt: new Date(cursor) };
      }
      
      const messages = await prisma.message.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          status: true,
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: limit,
      });
  
      return messages.map(message => ({
        id: message.id,
        text: message.content,
        isUser: message.senderId === userId,
        timestamp: message.createdAt.toISOString(),
        status: message.status.toLowerCase(),
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar: message.sender.avatar,
        }
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a message (with follow restriction check)
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} - Created message
   */
  async sendMessage(messageData) {
    try {
      const { content, chatId, senderId } = messageData;

      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: senderId
        }
      });

      if (!chatParticipant) {
        throw new Error('User is not a participant in this chat');
      }
  
      const message = await prisma.message.create({
        data: {
          content,
          chatId,
          senderId,
          status: MESSAGE_STATUS.SENT,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            }
          }
        },
      });
  
      return {
        id: message.id,
        text: message.content,
        isUser: true,
        timestamp: message.createdAt.toISOString(),
        status: message.status.toLowerCase(),
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar: message.sender.avatar,
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new chat (no follow restriction)
   * @param {Object} chatData - Chat data
   * @returns {Promise<Object>} - Created chat
   */
  async createChat(chatData) {
    try {
      const { name, isGroup = false, participantIds, currentUserId } = chatData;

      // Check if chat already exists for 1-on-1 conversations
      if (!isGroup && participantIds.length === 2) {
        const existingChat = await prisma.chat.findFirst({
          where: {
            isGroup: false,
            participants: {
              every: {
                userId: {
                  in: participantIds
                }
              }
            }
          },
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

        if (existingChat && existingChat.participants.length === 2) {
          return existingChat;
        }
      }
  
      const chat = await prisma.chat.create({
        data: {
          name,
          isGroup,
          participants: {
            create: participantIds.map(userId => ({ userId }))
          }
        },
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
  
      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark messages as read for a user in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID who is reading
   * @returns {Promise<number>} - Number of messages marked as read
   */
  async markMessagesAsRead(chatId, userId) {
    try {
      const updatedMessages = await prisma.message.updateMany({
        where: {
          chatId: chatId,
          senderId: { not: userId },
          status: { not: MESSAGE_STATUS.READ }
        },
        data: {
          status: MESSAGE_STATUS.READ
        }
      });

      return { 
        success: true, 
        message: 'Messages marked as read',
        messagesMarked: updatedMessages.count
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark entire chat as read (reset unread count for user)
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID who is reading
   * @returns {Promise<Object>} - Result object
   */
  async markChatAsRead(chatId, userId) {
    try {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          participants: {
            some: { userId }
          }
        },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      if (!chat) {
        throw new NotFoundError('Chat not found or user is not a participant');
      }
      
      const updatedMessages = await prisma.message.updateMany({
        where: {
          chatId: chatId,
          senderId: { not: userId },
          status: { not: MESSAGE_STATUS.READ }
        },
        data: {
          status: MESSAGE_STATUS.READ
        }
      });
      
      const totalMessages = chat._count.messages;
      
      return {
        success: true,
        chatId,
        userId,
        totalMessages,
        messagesMarked: updatedMessages.count,
        message: 'Chat marked as read successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread messages for a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID who is reading
   * @returns {Promise<Array>} - Array of unread messages
   */
  async getUnreadMessages(chatId, userId) {
    try {
      const unreadMessages = await prisma.message.findMany({
        where: {
          chatId: chatId,
          senderId: { not: userId },
          status: { not: MESSAGE_STATUS.READ }
        },
        include: {
          sender: {
            select: {
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return unreadMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteChat(chatId) {
    try {
      await prisma.chat.delete({
        where: { id: chatId },
      });
  
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ChatService();