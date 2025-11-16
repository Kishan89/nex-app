import AsyncStorage from '@react-native-async-storage/async-storage';
interface Chat {
  id: string | number;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastMessage?: string;
  time?: string;
  unread?: number;
  userId?: string;
  lastSeen?: string;
  lastSeenText?: string;
}
interface CachedChatData {
  chats: Chat[];
  timestamp: number;
  totalUnread: number;
}
class ChatCacheManager {
  private memoryCache: CachedChatData | null = null;
  private readonly CACHE_KEY = '@chat_cache_v1';
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
  private readonly INSTANT_CACHE_DURATION = 30 * 1000; // 30 seconds for instant loading
  // Get cached chats instantly from memory first, then storage
  async getCachedChats(): Promise<CachedChatData | null> {
    // Check memory cache first (instant)
    if (this.memoryCache && this.isValidCache(this.memoryCache, this.INSTANT_CACHE_DURATION)) {
      return this.memoryCache;
    }
    // Check AsyncStorage cache
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (this.isValidCache(parsedCache, this.CACHE_DURATION)) {
          this.memoryCache = parsedCache; // Store in memory for next time
          return parsedCache;
        }
      }
    } catch (error) {
      }
    return null;
  }
  // Cache chats in both memory and storage
  async cacheChats(chats: Chat[]): Promise<void> {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    const cacheData: CachedChatData = {
      chats,
      totalUnread,
      timestamp: Date.now()
    };
    // Store in memory immediately
    this.memoryCache = cacheData;
    // Store in AsyncStorage in background
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
      }
  }
  // Update specific chat in cache (for new messages)
  updateChatInCache(chatId: string | number, updates: Partial<Chat>): void {
    if (!this.memoryCache) return;
    const updatedChats = this.memoryCache.chats.map(chat =>
      String(chat.id) === String(chatId) ? { ...chat, ...updates } : chat
    );
    // Sort chats by most recent activity - prioritize 'now' time
    const sortedChats = updatedChats.sort((a, b) => {
      // Chats with 'now' time should be at the top
      if (a.time === 'now' && b.time !== 'now') return -1;
      if (a.time !== 'now' && b.time === 'now') return 1;
      // If both have 'now' or neither, maintain order
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      return 0;
    });
    const totalUnread = sortedChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    this.memoryCache = {
      ...this.memoryCache,
      chats: sortedChats,
      totalUnread,
      timestamp: Date.now()
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Mark chat as read in cache
  markChatAsReadInCache(chatId: string | number): void {
    if (!this.memoryCache) return;
    const updatedChats = this.memoryCache.chats.map(chat =>
      String(chat.id) === String(chatId) ? { ...chat, unread: 0 } : chat
    );
    const totalUnread = updatedChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    this.memoryCache = {
      ...this.memoryCache,
      chats: updatedChats,
      totalUnread,
      timestamp: Date.now()
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Add new message to chat in cache
  addMessageToCache(chatId: string | number, message: string, senderId?: string, currentUserId?: string): void {
    if (!this.memoryCache) return;
    const isFromCurrentUser = senderId === currentUserId;
    this.updateChatInCache(chatId, {
      lastMessage: message,
      time: 'now',
      unread: isFromCurrentUser ? 0 : (this.getChatById(chatId)?.unread || 0) + 1
    });
  }
  // Get specific chat from cache
  getChatById(chatId: string | number): Chat | undefined {
    if (!this.memoryCache) return undefined;
    return this.memoryCache.chats.find(chat => String(chat.id) === String(chatId));
  }
  // Get total unread count from cache
  getTotalUnreadCount(): number {
    return this.memoryCache?.totalUnread || 0;
  }
  // Check if cache is still valid
  private isValidCache(cache: CachedChatData, maxAge: number): boolean {
    return Date.now() - cache.timestamp < maxAge;
  }
  // Save memory cache to storage (background operation)
  private async saveMemoryCacheToStorage(): Promise<void> {
    if (!this.memoryCache) return;
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(this.memoryCache));
    } catch (error) {
      }
  }
  // Clear all cache
  async clearCache(): Promise<void> {
    this.memoryCache = null;
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      } catch (error) {
      }
  }
  // Preload cache (for app startup)
  async preloadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.memoryCache = JSON.parse(cached);
        }
    } catch (error) {
      }
  }
  // Add new chat to cache
  addChatToCache(chat: Chat): void {
    if (!this.memoryCache) {
      // Initialize cache if it doesn't exist
      this.memoryCache = {
        chats: [],
        totalUnread: 0,
        timestamp: Date.now()
      };
    }
    
    // Check if chat already exists
    const chatExists = this.memoryCache.chats.some(c => String(c.id) === String(chat.id));
    if (chatExists) {
      return; // Don't add duplicates
    }
    
    // Add new chat to the beginning of the list
    const updatedChats = [chat, ...this.memoryCache.chats];
    
    const totalUnread = updatedChats.reduce((sum, c) => sum + (c.unread || 0), 0);
    
    this.memoryCache = {
      chats: updatedChats,
      totalUnread,
      timestamp: Date.now()
    };
    
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }

  // Remove chat from cache
  removeChatFromCache(chatId: string | number): void {
    if (!this.memoryCache) return;
    
    const updatedChats = this.memoryCache.chats.filter(
      chat => String(chat.id) !== String(chatId)
    );
    
    const totalUnread = updatedChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    
    this.memoryCache = {
      ...this.memoryCache,
      chats: updatedChats,
      totalUnread,
      timestamp: Date.now()
    };
    
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }

  // Get cache info for debugging
  getCacheInfo(): { hasMemoryCache: boolean; age?: number; count?: number; unread?: number } {
    return {
      hasMemoryCache: !!this.memoryCache,
      age: this.memoryCache ? Date.now() - this.memoryCache.timestamp : undefined,
      count: this.memoryCache?.chats.length,
      unread: this.memoryCache?.totalUnread
    };
  }
}
// Export singleton instance
export const chatCache = new ChatCacheManager();
export type { Chat, CachedChatData };
