const { prisma } = require('../config/database');
const { formatTimeAgo } = require('../utils/helpers');
const followService = require('./followService');
const userCacheService = require('./userCacheService');

class ChatService {
  /**
   * Get user's chats (OPTIMIZED for instant loading)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of chats
   */
  async getUserChats(userId) {
    try {
      console.log(`🔍 Getting chats for user: ${userId}`);
      
      // Validate userId
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.warn('⚠️ ChatService: Invalid userId provided:', userId);
        return [];
      }
      
      // 🚀 OPTIMIZED QUERY: Single query with all data
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
              take: 1, // Get latest message only
            },
            // Get unread count in single query
            _count: {
              select: {
                messages: {
                  where: {
                    senderId: { not: userId },
                    status: { not: 'READ' }
                  }
                }
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });

      // 🚀 FAST FORMATTING: Process all chats in single pass
      const formattedChats = chats.map((chat) => {
        const otherParticipant = chat.participants[0]?.user;
        const lastMessage = chat.messages[0];
        const unreadCount = chat._count?.messages || 0;
        
        // Fast last seen formatting
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
          // Add caching metadata
          lastUpdated: chat.updatedAt,
          lastMessageId: lastMessage?.id,
        };
      });
      
      return formattedChats;
      
    } catch (error) {
      console.error('❌ ChatService: Error getting user chats:', error);
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
      const { page = 1, limit = 1000, userId, cursor } = options;
      
      // Loading messages for chat
      
      // Build query with cursor-based pagination for better performance
      const whereClause = { chatId };
      if (cursor) {
        whereClause.createdAt = { gt: new Date(cursor) };
      }
      
      // Optimized query with minimal data selection
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
        take: limit, // No skip for cursor-based pagination
      });
      
      // Retrieved messages from database
  
      return messages.map(message => ({
        id: message.id,
        text: message.content,
        isUser: message.senderId === userId,
        timestamp: message.createdAt.toISOString(), // Send ISO timestamp for proper timezone handling
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
      
      // Saving message to database

      // Verify sender is a participant in the chat
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
          status: 'SENT',
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
      
      // Message saved successfully
  
      return {
        id: message.id,
        text: message.content,
        isUser: true,
        timestamp: message.createdAt.toISOString(), // Send ISO timestamp for proper timezone handling
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
  
      // Allow anyone to chat with anyone - no follow requirement

      // Check if chat already exists between these users
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
            create: participantIds.map(userId => ({ 
              userId,
              // lastReadAt will be null by default
            }))
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
      // Temporarily simplified - just mark messages as READ
      // TODO: Re-enable lastReadAt tracking once Prisma client is fixed
      
      const updatedMessages = await prisma.message.updateMany({
        where: {
          chatId: chatId,
          senderId: { not: userId }, // Don't mark own messages
          status: { not: 'READ' } // Only update unread messages
        },
        data: {
          status: 'READ'
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
      // Marking entire chat as read
      
      // Get the chat to verify it exists and user is participant
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
        throw new Error('Chat not found or user is not a participant');
      }

      // Temporarily simplified - just mark messages as READ
      // TODO: Re-enable lastReadAt tracking once Prisma client is fixed
      
      const updatedMessages = await prisma.message.updateMany({
        where: {
          chatId: chatId,
          senderId: { not: userId }, // Don't mark own messages
          status: { not: 'READ' } // Only update unread messages
        },
        data: {
          status: 'READ'
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
      // Temporarily simplified - get messages with status != 'READ'
      // TODO: Re-enable lastReadAt tracking once Prisma client is fixed
      
      const unreadMessages = await prisma.message.findMany({
        where: {
          chatId: chatId,
          senderId: { not: userId },
          status: { not: 'READ' } // Get messages that are not marked as read
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
          createdAt: 'asc' // Oldest first for banner
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