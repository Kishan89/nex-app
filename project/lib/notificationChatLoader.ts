// lib/notificationChatLoader.ts - Preload chat data for smooth notification navigation
import { apiService } from './api';
import { ultraFastChatCache } from './ChatCache';
import { socketService } from './socketService';

interface ChatPreloadData {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  isGroup?: boolean;
  description?: string;
  memberCount?: number;
  participants?: any[];
  createdById?: string;
}

class NotificationChatLoader {
  private preloadPromises = new Map<string, Promise<ChatPreloadData | null>>();

  // Preload chat data for instant navigation
  async preloadChatData(chatId: string): Promise<ChatPreloadData | null> {
    // Return existing promise if already loading
    if (this.preloadPromises.has(chatId)) {
      return this.preloadPromises.get(chatId)!;
    }

    const preloadPromise = this.performPreload(chatId);
    this.preloadPromises.set(chatId, preloadPromise);

    try {
      const result = await preloadPromise;
      return result;
    } finally {
      // Clean up promise after completion
      setTimeout(() => {
        this.preloadPromises.delete(chatId);
      }, 5000);
    }
  }

  private async performPreload(chatId: string): Promise<ChatPreloadData | null> {
    try {
      // Check cache first
      const cachedData = ultraFastChatCache.getInstantChatData(chatId);
      if (cachedData) {
        return {
          id: cachedData.id,
          name: cachedData.name,
          avatar: cachedData.avatar,
          username: cachedData.username,
          isOnline: cachedData.isOnline,
          lastSeen: cachedData.lastSeen,
          userId: chatId, // For 1-on-1 chats
          isGroup: false
        };
      }

      // Ensure socket is connected for real-time updates
      if (!socketService.isSocketConnected()) {
        await socketService.connect();
      }

      // Fetch from API with timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Preload timeout')), 3000)
      );

      const chatDataPromise = apiService.getChatById(chatId);
      const chatData = await Promise.race([chatDataPromise, timeoutPromise]);

      if (chatData) {
        const processedData: ChatPreloadData = {
          id: chatData.id || chatId,
          name: chatData.name || chatData.username || 'Chat',
          avatar: chatData.avatar || '',
          username: chatData.username,
          isOnline: chatData.isOnline || false,
          lastSeen: chatData.lastSeen || 'recently',
          userId: chatData.userId,
          isGroup: chatData.isGroup || false,
          description: chatData.description,
          memberCount: chatData.participants?.length || 0,
          participants: chatData.participants,
          createdById: chatData.createdById
        };

        // Cache the data for instant access
        await ultraFastChatCache.cacheMessages(chatId, [], processedData);

        return processedData;
      }

      return null;
    } catch (error) {
      console.error('Chat preload failed:', error);
      return null;
    }
  }

  // Preload messages for instant display
  async preloadMessages(chatId: string, userId: string) {
    try {
      // Check if already cached
      const cached = ultraFastChatCache.getInstantMessages(chatId);
      if (cached.length > 0) {
        return cached;
      }

      // Fetch latest messages with timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Messages preload timeout')), 2000)
      );

      const messagesPromise = apiService.getChatMessages(chatId);
      const messages = await Promise.race([messagesPromise, timeoutPromise]);

      if (Array.isArray(messages) && messages.length > 0) {
        const formattedMessages = messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text || msg.content,
          isUser: msg.senderId === userId,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          status: 'delivered',
          sender: msg.sender,
          imageUrl: msg.imageUrl
        }));

        // Cache for instant access
        await ultraFastChatCache.cacheMessages(chatId, formattedMessages, {
          id: chatId,
          name: 'Chat',
          avatar: ''
        });

        return formattedMessages;
      }

      return [];
    } catch (error) {
      console.error('Messages preload failed:', error);
      return [];
    }
  }

  // Clear preload cache
  clearPreloadCache() {
    this.preloadPromises.clear();
  }
}

export const notificationChatLoader = new NotificationChatLoader();