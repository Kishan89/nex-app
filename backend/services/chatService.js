const { prisma } = require('../config/database');
const { formatTimeAgo } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { MESSAGE_STATUS, PAGINATION } = require('../constants');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

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
            name: true,
            avatar: true,
            description: true,
            isGroup: true,
            createdById: true,
            updatedAt: true,
            participants: {
              select: {
                userId: true,
                isAdmin: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    isOnline: true,
                    lastSeen: true,
                  }
                }
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
        const lastMessage = chat.messages[0];
        const unreadCount = chat._count?.messages || 0;

        let name = 'Unknown';
        let username = 'Unknown';
        let userIdForChat = 'unknown';
        let avatar = null;
        let isOnline = false;
        let lastSeen = null;
        let lastSeenText = '';

        if (chat.isGroup) {
          name = chat.name || 'Group';
          username = name;
          avatar = chat.avatar || null;
        } else {
          // Find the OTHER participant (not the current user)
          const otherParticipantData = chat.participants.find(p => p.userId !== userId);
          const otherParticipant = otherParticipantData?.user;

          name = otherParticipant?.username || 'Unknown';
          username = otherParticipant?.username || 'Unknown';
          userIdForChat = otherParticipantData?.userId || otherParticipant?.id || 'unknown';
          avatar = otherParticipant?.avatar || null;
          isOnline = otherParticipant?.isOnline || false;
          lastSeen = otherParticipant?.lastSeen;

          lastSeenText = 'Last seen recently';
          if (otherParticipant?.isOnline) {
            lastSeenText = 'Online';
          } else if (otherParticipant?.lastSeen) {
            const timeAgo = formatTimeAgo(otherParticipant.lastSeen);
            lastSeenText = timeAgo === 'now' ? 'Last seen just now' : `Last seen ${timeAgo} ago`;
          }
        }

        return {
          id: chat.id,
          name,
          username,
          userId: userIdForChat,
          lastMessage: lastMessage?.content || 'No messages yet',
          time: lastMessage ? formatTimeAgo(lastMessage.createdAt) : '',
          avatar,
          isOnline,
          lastSeen,
          lastSeenText,
          unread: unreadCount,
          lastUpdated: chat.updatedAt,
          lastMessageId: lastMessage?.id,
          isGroup: chat.isGroup,
          createdById: chat.createdById || null,
        };
      });
      
      return formattedChats;
      
    } catch (error) {
      logger.error('Error getting user chats:', error);
      return [];
    }
  }

  /**
   * Get a single chat by ID with participant details
   * @param {string} chatId - Chat ID
   * @param {string} userId - Current user ID
   * @returns {Promise<Object>} - Chat object with participant details
   */
  async getChatById(chatId, userId) {
    try {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          participants: {
            some: {
              userId: userId
            }
          }
        },
        include: {
          participants: {
            select: {
              userId: true,
              isAdmin: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                }
              }
            }
          },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          }
        }
      });

      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      const isGroup = chat.isGroup;
      const lastMessage = chat.messages[0];

      let name = 'Unknown';
      let username = 'Unknown';
      let userIdForChat = 'unknown';
      let avatar = null;
      let isOnline = false;
      let lastSeen = null;
      let lastSeenText = '';

      if (isGroup) {
        name = chat.name || 'Group';
        username = name;
      } else {
        const otherParticipant = chat.participants.find(p => p.userId !== userId);
        if (otherParticipant) {
          name = otherParticipant.user?.username || 'Unknown';
          username = otherParticipant.user?.username || 'Unknown';
          userIdForChat = otherParticipant.userId || otherParticipant.user?.id || 'unknown';
          avatar = otherParticipant.user?.avatar || null;
          isOnline = otherParticipant.user?.isOnline || false;
          lastSeen = otherParticipant.user?.lastSeen;
          lastSeenText = otherParticipant.user?.isOnline ? 'Online' : 'Last seen recently';
        }
      }

      const result = {
        id: chat.id,
        name,
        username,
        userId: userIdForChat,
        avatar: isGroup ? (chat.avatar || avatar) : avatar,
        isOnline,
        lastSeen,
        lastSeenText,
        lastMessage: lastMessage?.content || 'No messages yet',
        time: lastMessage ? formatTimeAgo(lastMessage.createdAt) : '',
        participants: chat.participants,
        isGroup,
        description: chat.description || '',
        memberCount: chat.participants?.length || 0,
        createdById: chat.createdById || null,
      };
      
      logger.info('getChatById result:', { 
        id: result.id, 
        name: result.name, 
        isGroup: result.isGroup, 
        avatar: result.avatar,
        description: result.description,
        memberCount: result.memberCount
      });
      
      return result;
    } catch (error) {
      throw error;
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
      // Use a much higher limit to get all messages (1000 instead of 50)
      // This ensures we get all messages when app reopens
      const { page = PAGINATION.DEFAULT_PAGE, limit = 1000, userId, cursor } = options;
      
      logger.info('📥 [GET MESSAGES] Fetching messages', { chatId, userId, limit, cursor });
      
      const whereClause = { chatId };
      if (cursor) {
        whereClause.createdAt = { gt: new Date(cursor) };
      }
      
      const messages = await prisma.message.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          imageUrl: true,  // Include imageUrl for image messages
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
      
      logger.info('✅ [GET MESSAGES] Retrieved messages', { 
        chatId, 
        count: messages.length,
        firstMessageId: messages[0]?.id,
        lastMessageId: messages[messages.length - 1]?.id
      });
  
      const formattedMessages = messages.map(message => ({
        id: message.id,
        text: message.content,
        content: message.content, // Include both for compatibility
        imageUrl: message.imageUrl || undefined, // Include image URL if present
        isUser: message.senderId === userId,
        timestamp: message.createdAt.toISOString(),
        status: message.status.toLowerCase(),
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar: message.sender.avatar,
        }
      }));
      
      logger.info('✅ [GET MESSAGES] Formatted messages ready to return', { count: formattedMessages.length });
      
      return formattedMessages;
    } catch (error) {
      logger.error('❌ [GET MESSAGES] Error fetching messages', { 
        error: error.message, 
        stack: error.stack,
        chatId,
        userId: options.userId
      });
      throw error;
    }
  }

  /**
   * Send a message (with follow restriction check)
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} - Created message
   */
  async sendMessage(messageData) {
    const { createLogger } = require('../utils/logger');
    const logger = createLogger('ChatService');
    
    try {
      const { content, chatId, senderId, imageUrl } = messageData;
      
      logger.info('📤 [SEND MESSAGE] Starting message creation', { 
        chatId, 
        senderId, 
        contentLength: content?.length, 
        hasImage: !!imageUrl,
        imageUrlPreview: imageUrl ? imageUrl.substring(0, 50) + '...' : undefined
      });

      // Validate input
      // Allow messages with either content or imageUrl (or both)
      if ((!content || !content.trim()) && !imageUrl) {
        logger.error('❌ [SEND MESSAGE] Missing required fields', { content: !!content, chatId: !!chatId, senderId: !!senderId, imageUrl: !!imageUrl });
        throw new Error('Message must have either text content or an image');
      }
      
      if (!chatId || !senderId) {
        logger.error('❌ [SEND MESSAGE] Missing required fields', { chatId: !!chatId, senderId: !!senderId });
        throw new Error('Missing required fields: chatId, or senderId');
      }

      // Check if user is a participant
      const chatParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: senderId
        }
      });

      if (!chatParticipant) {
        logger.error('❌ [SEND MESSAGE] User is not a participant', { chatId, senderId });
        throw new Error('User is not a participant in this chat');
      }
      
      logger.info('✅ [SEND MESSAGE] User verified as participant, creating message...');
  
      // Create message with proper error handling
      const messageCreateData = {
        content,
        chatId,
        senderId,
        status: MESSAGE_STATUS.SENT,
      };

      // Add imageUrl if provided
      if (imageUrl) {
        // Validate image URL
        if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
          logger.error('❌ [SEND MESSAGE] Invalid image URL provided', { imageUrl });
          throw new Error('Invalid image URL provided');
        }
        
        messageCreateData.imageUrl = imageUrl;
      }

      const message = await prisma.message.create({
        data: messageCreateData,
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
      
      if (!message || !message.id) {
        logger.error('❌ [SEND MESSAGE] Message creation failed - no message returned');
        throw new Error('Failed to create message in database');
      }
      
      logger.info('✅ [SEND MESSAGE] Message created successfully', { 
        messageId: message.id, 
        chatId, 
        senderId,
        timestamp: message.createdAt,
        hasImage: !!message.imageUrl 
      });

      // Parse mentions from message content (only if content exists)
      const mentionRegex = /@(\w+)/g;
      const mentionedUsernames = [];
      let match;
      if (content && content.trim()) {
        while ((match = mentionRegex.exec(content)) !== null) {
          mentionedUsernames.push(match[1]);
        }
      }

      // Update message with mentions
      if (mentionedUsernames.length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: { mentions: mentionedUsernames }
        });
      }

      // Send notifications to mentioned users
      if (mentionedUsernames.length > 0) {
        logger.info('📢 [MENTIONS] Found mentions:', mentionedUsernames);
        
        // Get chat participants with user details
        const participants = await prisma.chatParticipant.findMany({
          where: { chatId },
          include: { user: { select: { id: true, username: true } } }
        });

        // Find mentioned users
        const mentionedUsers = participants.filter(p => 
          mentionedUsernames.includes(p.user.username) && p.userId !== senderId
        );

        // Send notifications (background task)
        if (mentionedUsers.length > 0) {
          setTimeout(async () => {
            const fcmService = require('./fcmService');
            const notificationService = require('./notificationService');
            const sender = await prisma.user.findUnique({ where: { id: senderId } });
            
            for (const participant of mentionedUsers) {
              try {
                // Create in-app notification
                await notificationService.createNotification({
                  userId: participant.userId,
                  fromUserId: senderId,
                  type: 'MENTION',
                  message: `${sender.username} mentioned you in a group chat`
                });
                
                // Send push notification
                await fcmService.sendMentionNotification(
                  participant.userId,
                  sender.username || 'Someone',
                  content,
                  chatId
                );
                logger.info('✅ [MENTION] Notification sent to:', participant.user.username);
              } catch (error) {
                logger.error('❌ [MENTION] Failed to send notification:', error);
              }
            }
          }, 0);
        }
      }
  
      const formattedMessage = {
        id: message.id,
        text: message.content || '', // Ensure we always have text, even if empty
        content: message.content || '', // Include both for compatibility
        imageUrl: message.imageUrl || undefined, // Include image URL if present
        isUser: true,
        timestamp: message.createdAt.toISOString(),
        status: message.status.toLowerCase(),
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar: message.sender.avatar,
        }
      };
      
      logger.info('✅ [SEND MESSAGE] Message formatted and ready to return', { 
        messageId: message.id,
        hasImage: !!formattedMessage.imageUrl,
        imagePreview: formattedMessage.imageUrl ? formattedMessage.imageUrl.substring(0, 50) + '...' : undefined
      });
      
      return formattedMessage;
    } catch (error) {
      const { createLogger } = require('../utils/logger');
      const logger = createLogger('ChatService');
      logger.error('❌ [SEND MESSAGE] Error in sendMessage', { 
        error: error.message, 
        stack: error.stack,
        messageData 
      });
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
      const { name, description, avatar, isGroup = false, participantIds, currentUserId } = chatData;

      const uniqueParticipantIds = Array.from(new Set(participantIds || []));

      // Check if chat already exists for 1-on-1 conversations
      if (!isGroup && uniqueParticipantIds.length === 2) {
        const existingChat = await prisma.chat.findFirst({
          where: {
            isGroup: false,
            participants: {
              every: {
                userId: {
                  in: uniqueParticipantIds
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
          description,
          avatar,
          isGroup,
          createdById: isGroup ? (currentUserId || uniqueParticipantIds[0] || null) : null,
          participants: {
            create: uniqueParticipantIds.map(userId => ({
              userId,
              isAdmin: isGroup && (userId === (currentUserId || uniqueParticipantIds[0]))
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
   * Get user's group chats
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of group chats
   */
  async getUserGroupChats(userId) {
    try {
      logger.debug(`Getting group chats for user: ${userId}`);

      if (!userId || userId === 'undefined' || userId === 'null') {
        logger.warn('Invalid userId provided for getUserGroupChats:', userId);
        return [];
      }

      const chats = await prisma.chat.findMany({
        where: {
          isGroup: true,
          participants: {
            some: { userId }
          }
        },
        select: {
          id: true,
          name: true,
          description: true,
          avatar: true,
          isGroup: true,
          createdAt: true,
          updatedAt: true,
          participants: {
            select: {
              userId: true,
              isAdmin: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                }
              }
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

      const result = chats.map(chat => {
        const lastMessage = chat.messages[0];
        const unreadCount = chat._count?.messages || 0;
        const memberCount = chat.participants.length;

        return {
          id: chat.id,
          name: chat.name || 'Group',
          description: chat.description || '',
          avatar: chat.avatar || '',
          isGroup: true,
          lastMessage: lastMessage?.content || 'No messages yet',
          time: lastMessage ? formatTimeAgo(lastMessage.createdAt) : '',
          unread: unreadCount,
          memberCount,
          lastUpdated: chat.updatedAt,
          lastMessageId: lastMessage?.id,
        };
      });
      
      logger.info('getUserGroupChats returning:', result.length, 'groups');
      return result;
    } catch (error) {
      logger.error('Error getting user group chats:', error);
      return [];
    }
  }

  /**
   * Add a participant to a group chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID to add
   * @param {string} actingUserId - Acting user ID
   * @returns {Promise<Object>} - Updated chat
   */
  async addParticipantToChat(chatId, userId, actingUserId) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: true,
        }
      });

      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      if (!chat.isGroup) {
        throw new BadRequestError('Cannot add participants to a 1-on-1 chat');
      }

      const actingParticipant = chat.participants.find(p => p.userId === actingUserId);
      if (!actingParticipant || !actingParticipant.isAdmin) {
        throw new ForbiddenError('Only group admins can add members');
      }

      const existingParticipant = chat.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        return chat;
      }

      await prisma.chatParticipant.create({
        data: {
          chatId,
          userId,
          isAdmin: false,
        }
      });

      const updatedChat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                }
              }
            }
          }
        }
      });

      return updatedChat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a participant from a group chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID to remove
   * @param {string} actingUserId - Acting user ID
   * @returns {Promise<Object>} - Updated chat
   */
  async removeParticipantFromChat(chatId, userId, actingUserId) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: true,
        }
      });

      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      if (!chat.isGroup) {
        throw new BadRequestError('Cannot remove participants from a 1-on-1 chat');
      }

      const actingParticipant = chat.participants.find(p => p.userId === actingUserId);
      const targetParticipant = chat.participants.find(p => p.userId === userId);

      if (!targetParticipant) {
        throw new NotFoundError('User is not a participant in this chat');
      }

      if (actingUserId !== userId) {
        if (!actingParticipant || !actingParticipant.isAdmin) {
          throw new ForbiddenError('Only group admins can remove other members');
        }
      }

      await prisma.chatParticipant.delete({
        where: { id: targetParticipant.id }
      });

      const updatedChat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                }
              }
            }
          }
        }
      });

      return updatedChat;
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

  async updateGroupAvatar(chatId, avatar, userId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, isGroup: true },
      include: { participants: true }
    });
    
    if (!chat) throw new NotFoundError('Group not found');
    
    const userParticipant = chat.participants.find(p => p.userId === userId);
    if (!userParticipant || !userParticipant.isAdmin) {
      throw new ForbiddenError('Only group admins can update group avatar');
    }
    
    return await prisma.chat.update({
      where: { id: chatId },
      data: { avatar },
      include: { participants: { include: { user: { select: { id: true, username: true, avatar: true } } } } }
    });
  }

  async updateGroupName(chatId, name, userId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, isGroup: true },
      include: { participants: true }
    });
    
    if (!chat) throw new NotFoundError('Group not found');
    
    const userParticipant = chat.participants.find(p => p.userId === userId);
    if (!userParticipant || !userParticipant.isAdmin) {
      throw new ForbiddenError('Only group admins can update group name');
    }
    
    return await prisma.chat.update({
      where: { id: chatId },
      data: { name },
      include: { participants: { include: { user: { select: { id: true, username: true, avatar: true } } } } }
    });
  }

  async updateGroupDescription(chatId, description, userId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, isGroup: true },
      include: { participants: true }
    });
    
    if (!chat) throw new NotFoundError('Group not found');
    
    const userParticipant = chat.participants.find(p => p.userId === userId);
    if (!userParticipant || !userParticipant.isAdmin) {
      throw new ForbiddenError('Only group admins can update group description');
    }
    
    return await prisma.chat.update({
      where: { id: chatId },
      data: { description },
      include: { participants: { include: { user: { select: { id: true, username: true, avatar: true } } } } }
    });
  }
}

module.exports = new ChatService();