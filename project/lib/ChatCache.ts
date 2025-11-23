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
  
  // LRU tracking for cache eviction
  private readonly MAX_CACHED_CHATS = 20;
  private readonly MAX_MESSAGES_PER_CHAT = 100;
  private lruTracker = new Map<string, number>(); // chatId -> lastAccessTime

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

  // Evict least recently used chat when cache is full
  private evictLRU() {
    if (this.memoryCache.size >= this.MAX_CACHED_CHATS) {
      let oldestChatId = '';
      let oldestTime = Infinity;
      
      for (const [chatId, timestamp] of this.lruTracker.entries()) {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestChatId = chatId;
        }
      }
      
      if (oldestChatId) {
        this.memoryCache.delete(oldestChatId);
        this.chatPreviews.delete(oldestChatId);
        this.lruTracker.delete(oldestChatId);
        AsyncStorage.removeItem(`ultra_chat_${oldestChatId}`).catch(() => {});
      }
    }
  }

  // Get messages instantly from memory cache
  getInstantMessages(chatId: string): Message[] {
    try {
      // Update LRU tracker on access
      this.lruTracker.set(chatId, Date.now());
      
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
        messages: messages, // Keep all messages for now - limiting caused issues
        lastUpdated: Date.now(),
        chatData: {
          id: chatData.id || chatId,
          name: chatData.name || chatData.username || 'Chat',
          avatar: chatData.avatar || '',
          username: chatData.username,
          isOnline: chatData.isOnline,
          lastSeen: chatData.lastSeen,
        },
      };

      // Update LRU tracker
      this.lruTracker.set(chatId, Date.now());
      
      // Evict if cache is full
      this.evictLRU();

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
      // Check for both exact ID match and temp ID match to prevent duplicates
      const exists = cached.messages.some(msg => 
        msg.id === message.id || 
        (msg.id.startsWith('temp_') && msg.text === message.text && msg.sender?.id === message.sender?.id)
      );
      if (!exists) {
        cached.messages.push(message);
        cached.lastUpdated = Date.now();

        // Keep ALL messages - don't slice to prevent duplicate detection issues
        // The full message history is needed for proper temp message replacement

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

  // Replace any temp message that matches an imageUrl with the real message
  replaceAnyTempWithImage(chatId: string, imageUrl: string, realMessage: Message) {
    const cached = this.memoryCache.get(chatId);
    if (!cached) return;

    let replaced = false;
    // Replace the first matching temp, and remove other temps with same image
    const newMessages: Message[] = [];
    for (const msg of cached.messages) {
      if (!replaced && msg.id.startsWith('temp_') && msg.imageUrl && msg.imageUrl === imageUrl) {
        newMessages.push(realMessage);
        replaced = true;
        continue;
      }
      // Skip other temps with same imageUrl from same sender
      if (msg.id.startsWith('temp_') && msg.imageUrl && msg.imageUrl === imageUrl && msg.sender?.id === realMessage.sender?.id) {
        continue;
      }
      newMessages.push(msg);
    }

    if (replaced) {
      cached.messages = newMessages;
      cached.lastUpdated = Date.now();
      this.memoryCache.set(chatId, cached);
      // Update preview
      const last = cached.messages[cached.messages.length - 1];
      if (last) {
        this.chatPreviews.set(chatId, { chatId, lastMessage: last, unreadCount: 0, chatData: cached.chatData });
      }
      AsyncStorage.setItem(`ultra_chat_${chatId}`, JSON.stringify(cached)).catch(() => {});
    }
  }

  // Replace any temp message that matches text with the real message (heuristic)
  replaceAnyTempByText(chatId: string, text: string, realMessage: Message) {
    const cached = this.memoryCache.get(chatId);
    if (!cached) return;

    let replaced = false;
    const newMessages: Message[] = cached.messages.map(msg => {
      if (!replaced && msg.id.startsWith('temp_') && msg.text && msg.text === text && msg.sender?.id === realMessage.sender?.id) {
        replaced = true;
        return realMessage;
      }
      return msg;
    }).filter(msg => {
      // Remove any leftover temps with same text from same sender
      if (msg.id.startsWith('temp_') && msg.text === text && msg.sender?.id === realMessage.sender?.id) {
        return false;
      }
      return true;
    });

    if (replaced) {
      cached.messages = newMessages;
      cached.lastUpdated = Date.now();
      this.memoryCache.set(chatId, cached);
      const last = cached.messages[cached.messages.length - 1];
      if (last) {
        this.chatPreviews.set(chatId, { chatId, lastMessage: last, unreadCount: 0, chatData: cached.chatData });
      }
      AsyncStorage.setItem(`ultra_chat_${chatId}`, JSON.stringify(cached)).catch(() => {});
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

  // Batch preload top N chats for instant access
  async preloadTopChats(chatIds: string[]) {
    const top5 = chatIds.slice(0, 5);
    
    const promises = top5.map(async chatId => {
      // Skip if already in memory
      if (this.memoryCache.has(chatId)) {
        this.lruTracker.set(chatId, Date.now());
        return;
      }
      
      // Load from AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(`ultra_chat_${chatId}`);
        if (stored) {
          const data: CachedChat = JSON.parse(stored);
          this.memoryCache.set(chatId, data);
          this.lruTracker.set(chatId, Date.now());
          
          if (data.messages.length > 0) {
            const lastMessage = data.messages[data.messages.length - 1];
            this.chatPreviews.set(chatId, {
              chatId,
              lastMessage,
              unreadCount: 0,
              chatData: data.chatData,
            });
          }
        }
      } catch (error) {
        // Silent fail
      }
    });
    
    await Promise.all(promises);
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
