// Chat Optimizations for Frontend
// Provides instant chat experience with caching and optimistic updates

import AsyncStorage from '@react-native-async-storage/async-storage';

class ChatOptimizations {
  constructor() {
    this.chatCache = new Map();
    this.userCache = new Map();
    this.messageCache = new Map();
    this.cacheExpiry = 30 * 1000; // 30 seconds
  }

  // 🚀 INSTANT CHAT LIST: Cache chat list for immediate loading
  async getCachedChats(userId) {
    const cacheKey = `chats-${userId}`;
    
    // Check memory cache first
    const memoryCache = this.chatCache.get(cacheKey);
    if (memoryCache && (Date.now() - memoryCache.timestamp) < this.cacheExpiry) {
      return memoryCache.data;
    }

    // Check AsyncStorage cache
    try {
      const storedCache = await AsyncStorage.getItem(cacheKey);
      if (storedCache) {
        const parsed = JSON.parse(storedCache);
        if ((Date.now() - parsed.timestamp) < this.cacheExpiry) {
          // Update memory cache
          this.chatCache.set(cacheKey, parsed);
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('Error reading chat cache:', error);
    }

    return null;
  }

  // 🚀 CACHE CHAT LIST: Store for instant future access
  async setCachedChats(userId, chats) {
    const cacheKey = `chats-${userId}`;
    const cacheData = {
      data: chats,
      timestamp: Date.now()
    };

    // Update memory cache
    this.chatCache.set(cacheKey, cacheData);

    // Update AsyncStorage cache (background)
    AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData)).catch(console.error);
  }

  // 🚀 INSTANT USER DATA: Cache user avatars and names
  async getCachedUserData(userId) {
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < (5 * 60 * 1000)) { // 5 minutes
      return cached.data;
    }
    return null;
  }

  setCachedUserData(userId, userData) {
    this.userCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
  }

  // 🚀 OPTIMISTIC MESSAGE SENDING: Show message immediately
  createOptimisticMessage(content, userId, chatId) {
    return {
      id: `temp-${Date.now()}-${Math.random()}`,
      text: content,
      isUser: true,
      timestamp: new Date().toISOString(),
      status: 'sending',
      isOptimistic: true,
      chatId,
      sender: {
        id: userId,
        username: 'You'
      }
    };
  }

  // 🚀 INSTANT NAVIGATION: Prepare chat data for immediate navigation
  prepareChatNavigation(chatData) {
    return {
      id: chatData.id,
      name: chatData.name || chatData.username,
      avatar: chatData.avatar,
      isOnline: chatData.isOnline,
      lastSeen: chatData.lastSeen,
      userId: chatData.userId,
      // Add cached messages if available
      cachedMessages: this.messageCache.get(chatData.id) || []
    };
  }

  // 🚀 MESSAGE CACHING: Cache recent messages for instant loading
  cacheMessages(chatId, messages) {
    this.messageCache.set(chatId, {
      messages: messages.slice(-50), // Keep last 50 messages
      timestamp: Date.now()
    });
  }

  getCachedMessages(chatId) {
    const cached = this.messageCache.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < (2 * 60 * 1000)) { // 2 minutes
      return cached.messages;
    }
    return [];
  }

  // 🚀 PRELOAD OPTIMIZATION: Preload data for better UX
  async preloadChatData(chats) {
    // Preload user data for all chat participants
    const userIds = chats.map(chat => chat.userId).filter(Boolean);
    
    // Cache user data in background
    setTimeout(() => {
      userIds.forEach(userId => {
        if (!this.getCachedUserData(userId)) {
          // This would trigger a background fetch in a real implementation
          console.log(`Preloading user data for ${userId}`);
        }
      });
    }, 100);
  }

  // 🚀 SMART REFRESH: Only refresh when necessary
  shouldRefreshChats(userId, lastRefresh) {
    const cacheKey = `chats-${userId}`;
    const cached = this.chatCache.get(cacheKey);
    
    if (!cached) return true;
    if (!lastRefresh) return true;
    if ((Date.now() - cached.timestamp) > this.cacheExpiry) return true;
    
    return false;
  }

  // 🚀 CLEANUP: Prevent memory leaks
  cleanup() {
    // Clear old cache entries
    const now = Date.now();
    
    for (const [key, value] of this.chatCache.entries()) {
      if ((now - value.timestamp) > (10 * 60 * 1000)) { // 10 minutes
        this.chatCache.delete(key);
      }
    }
    
    for (const [key, value] of this.userCache.entries()) {
      if ((now - value.timestamp) > (30 * 60 * 1000)) { // 30 minutes
        this.userCache.delete(key);
      }
    }
    
    for (const [key, value] of this.messageCache.entries()) {
      if ((now - value.timestamp) > (5 * 60 * 1000)) { // 5 minutes
        this.messageCache.delete(key);
      }
    }
  }

  // 🚀 STATS: Monitor performance
  getCacheStats() {
    return {
      chatCacheSize: this.chatCache.size,
      userCacheSize: this.userCache.size,
      messageCacheSize: this.messageCache.size,
      totalMemoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    const chatSize = JSON.stringify(Array.from(this.chatCache.values())).length;
    const userSize = JSON.stringify(Array.from(this.userCache.values())).length;
    const messageSize = JSON.stringify(Array.from(this.messageCache.values())).length;
    return chatSize + userSize + messageSize;
  }
}

// Export singleton instance
export const chatOptimizations = new ChatOptimizations();

// Cleanup every 5 minutes
setInterval(() => {
  chatOptimizations.cleanup();
}, 5 * 60 * 1000);

export default chatOptimizations;
