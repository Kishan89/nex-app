import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '@/types';

interface CachedChat {
  chatId: string;
  messages: Message[];
  lastUpdated: number;
  chatData: {
    id: string;
    name: string;
    avatar: string;
    username?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

interface ChatPreview {
  chatId: string;
  lastMessage: Message;
  unreadCount: number;
  chatData: CachedChat['chatData'];
}

class UltraFastChatCache {
  private memoryCache = new Map<string, CachedChat>();
  private chatPreviews = new Map<string, ChatPreview>();
  private initialized = false;

  // Initialize cache from AsyncStorage
  async initialize() {
    if (this.initialized) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith('ultra_chat_'));
      if (chatKeys.length > 0) {
        const cachedData = await AsyncStorage.multiGet(chatKeys);
        for (const [key, value] of cachedData) {
          if (value) {
            try {
              const chatData: CachedChat = JSON.parse(value);
              const chatId = key.replace('ultra_chat_', '');
              if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) continue;

              this.memoryCache.set(chatId, chatData);

              if (chatData.messages.length > 0) {
                const lastMessage = chatData.messages[chatData.messages.length - 1];
                this.chatPreviews.set(chatId, {
                  chatId,
                  lastMessage,
                  unreadCount: 0,
                  chatData: chatData.chatData,
                });
              }
            } catch (error) {
              AsyncStorage.removeItem(key).catch(console.error);
            }
          }
        }
      }
      this.initialized = true;
    } catch (error) {
      this.initialized = true;
    }
  }

  // Get messages instantly from memory cache
  getInstantMessages(chatId: string): Message[] {
    try {
      const cached = this.memoryCache.get(chatId);
      if (cached && cached.messages && Array.isArray(cached.messages)) {
        return cached.messages;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Get chat data instantly
  getInstantChatData(chatId: string) {
    const cached = this.memoryCache.get(chatId);
    return cached?.chatData || null;
  }

  // Cache messages with instant memory update
  async cacheMessages(chatId: string, messages: Message[], chatData: any) {
    try {
      const cachedChat: CachedChat = {
        chatId,
        messages: messages.slice(-100), // Keep only last 100 messages
        lastUpdated: Date.now(),
        chatData: {
          id: chatData.id || chatId,
          name: chatData.name || chatData.username || 'Chat',
          avatar: chatData.avatar || 'https://via.placeholder.com/40',
          username: chatData.username,
          isOnline: chatData.isOnline,
          lastSeen: chatData.lastSeen,
        },
      };

      this.memoryCache.set(chatId, cachedChat);

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        this.chatPreviews.set(chatId, {
          chatId,
          lastMessage,
          unreadCount: 0,
          chatData: cachedChat.chatData,
        });
      }

      AsyncStorage.setItem(`ultra_chat_${chatId}`, JSON.stringify(cachedChat)).catch(error => {
        // optional console.log('Cache save failed', error);
      });
    } catch (error) {
      // optional console.log('CacheMessages error', error);
    }
  }

  // Add single message instantly
  addMessageInstantly(chatId: string, message: Message) {
    const cached = this.memoryCache.get(chatId);
    if (cached) {
      const exists = cached.messages.some(msg => msg.id === message.id);
      if (!exists) {
        cached.messages.push(message);
        cached.lastUpdated = Date.now();

        if (cached.messages.length > 100) {
          cached.messages = cached.messages.slice(-100);
        }

        this.memoryCache.set(chatId, cached);

        this.chatPreviews.set(chatId, {
          chatId,
          lastMessage: message,
          unreadCount: 0,
          chatData: cached.chatData,
        });

        AsyncStorage.setItem(`ultra_chat_${chatId}`, JSON.stringify(cached)).catch(error => {
          // optional console.log('addMessage cache error', error);
        });
      }
    }
  }

  // Replace temp message with real message
  replaceMessageInstantly(chatId: string, tempId: string, realMessage: Message) {
    const cached = this.memoryCache.get(chatId);
    if (cached) {
      const index = cached.messages.findIndex(msg => msg.id === tempId);
      if (index !== -1) {
        cached.messages[index] = realMessage;
        cached.lastUpdated = Date.now();

        this.memoryCache.set(chatId, cached);

        if (index === cached.messages.length - 1) {
          this.chatPreviews.set(chatId, {
            chatId,
            lastMessage: realMessage,
            unreadCount: 0,
            chatData: cached.chatData,
          });
        }

        AsyncStorage.setItem(`ultra_chat_${chatId}`, JSON.stringify(cached)).catch(error => {
          // optional console.log('replaceMessage cache error', error);
        });
      }
    }
  }

  // Get all chat previews for chat list
  getAllChatPreviews(): ChatPreview[] {
    return Array.from(this.chatPreviews.values()).sort((a, b) => {
      const aTime = new Date(a.lastMessage.timestamp).getTime();
      const bTime = new Date(b.lastMessage.timestamp).getTime();
      return bTime - aTime;
    });
  }

  // Check if chat has cached data
  hasCachedData(chatId: string): boolean {
    return this.memoryCache.has(chatId);
  }

  // Get cache age
  getCacheAge(chatId: string): number {
    const cached = this.memoryCache.get(chatId);
    return cached ? Date.now() - cached.lastUpdated : Infinity;
  }

  // Clear specific chat cache
  clearChatCache(chatId: string) {
    this.memoryCache.delete(chatId);
    this.chatPreviews.delete(chatId);
    AsyncStorage.removeItem(`ultra_chat_${chatId}`).catch(() => {});
  }

  // Clear all cache
  clearAllCache() {
    this.memoryCache.clear();
    this.chatPreviews.clear();
    AsyncStorage.getAllKeys()
      .then(keys => {
        const chatKeys = keys.filter(key => key.startsWith('ultra_chat_'));
        return AsyncStorage.multiRemove(chatKeys);
      })
      .catch(() => {});
  }

  // Get cache statistics
  getCacheStats() {
    return {
      totalChats: this.memoryCache.size,
      totalPreviews: this.chatPreviews.size,
      initialized: this.initialized,
      memoryUsage: JSON.stringify(Array.from(this.memoryCache.values())).length,
    };
  }
}

// Export singleton instance
export const ultraFastChatCache = new UltraFastChatCache();
