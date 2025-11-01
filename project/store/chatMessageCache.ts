import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '@/types';
interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  lastSeenText?: string;
  userId?: string;
  username?: string;
}
interface CachedChatMessages {
  messages: Message[];
  chatData: ChatData;
  timestamp: number;
  lastMessageId?: string;
}
interface ChatProfileCache {
  profile: ChatData;
  timestamp: number;
}
class ChatMessageCacheManager {
  private messageCache: Map<string, CachedChatMessages> = new Map();
  private profileCache: Map<string, ChatProfileCache> = new Map();
  private readonly MESSAGE_CACHE_KEY = '@chat_messages_v1';
  private readonly PROFILE_CACHE_KEY = '@chat_profiles_v1';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly INSTANT_CACHE_DURATION = 10 * 1000; // 10 seconds for instant loading
  // Get cached messages instantly from memory
  getCachedMessages(chatId: string): CachedChatMessages | null {
    const cached = this.messageCache.get(String(chatId));
    if (cached && this.isValidCache(cached.timestamp, this.INSTANT_CACHE_DURATION)) {
      return cached;
    }
    return null;
  }
  // Get cached profile instantly from memory
  getCachedProfile(chatId: string): ChatData | null {
    const cached = this.profileCache.get(String(chatId));
    if (cached && this.isValidCache(cached.timestamp, this.CACHE_DURATION)) {
      return cached.profile;
    }
    return null;
  }
  // Cache messages in memory for instant access
  cacheMessages(chatId: string, messages: Message[], chatData: ChatData): void {
    const cacheData: CachedChatMessages = {
      messages: messages, // Keep ALL messages - don't truncate!
      chatData,
      timestamp: Date.now(),
      lastMessageId: messages[messages.length - 1]?.id
    };
    this.messageCache.set(String(chatId), cacheData);
    // Also cache profile separately
    this.profileCache.set(String(chatId), {
      profile: chatData,
      timestamp: Date.now()
    });
    // Save to storage in background
    this.saveToStorage(chatId, cacheData);
    }
  // Add new message to cache instantly
  addMessageToCache(chatId: string, message: Message): void {
    const cached = this.messageCache.get(String(chatId));
    if (cached) {
      const updatedMessages = [...cached.messages, message];
      // Keep ALL messages - no truncation!
      const updatedCache: CachedChatMessages = {
        ...cached,
        messages: updatedMessages,
        timestamp: Date.now(),
        lastMessageId: message.id
      };
      this.messageCache.set(String(chatId), updatedCache);
      // Save to storage in background
      this.saveToStorage(chatId, updatedCache);
      }
  }
  // Update message in cache (for delivery status, etc.)
  updateMessageInCache(chatId: string, messageId: string, updates: Partial<Message>): void {
    const cached = this.messageCache.get(String(chatId));
    if (cached) {
      const updatedMessages = cached.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      const updatedCache: CachedChatMessages = {
        ...cached,
        messages: updatedMessages,
        timestamp: Date.now()
      };
      this.messageCache.set(String(chatId), updatedCache);
      // Save to storage in background
      this.saveToStorage(chatId, updatedCache);
    }
  }
  // Load messages from storage for initial cache
  async loadFromStorage(chatId: string): Promise<CachedChatMessages | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.MESSAGE_CACHE_KEY}_${chatId}`);
      if (cached) {
        const parsedCache: CachedChatMessages = JSON.parse(cached);
        if (this.isValidCache(parsedCache.timestamp, this.CACHE_DURATION)) {
          // Store in memory for instant access
          this.messageCache.set(String(chatId), parsedCache);
          this.profileCache.set(String(chatId), {
            profile: parsedCache.chatData,
            timestamp: parsedCache.timestamp
          });
          return parsedCache;
        }
      }
    } catch (error) {
      }
    return null;
  }
  // Save to storage (background operation)
  private async saveToStorage(chatId: string, cacheData: CachedChatMessages): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.MESSAGE_CACHE_KEY}_${chatId}`, JSON.stringify(cacheData));
    } catch (error) {
      }
  }
  // Preload multiple chats for instant access
  async preloadChats(chatIds: string[]): Promise<void> {
    const loadPromises = chatIds.map(chatId => this.loadFromStorage(chatId));
    await Promise.all(loadPromises);
    }
  // Update chat profile in cache
  updateChatProfile(chatId: string, profileUpdates: Partial<ChatData>): void {
    const cached = this.profileCache.get(String(chatId));
    if (cached) {
      const updatedProfile = { ...cached.profile, ...profileUpdates };
      this.profileCache.set(String(chatId), {
        profile: updatedProfile,
        timestamp: Date.now()
      });
      // Also update in message cache
      const messageCache = this.messageCache.get(String(chatId));
      if (messageCache) {
        messageCache.chatData = updatedProfile;
        this.saveToStorage(chatId, messageCache);
      }
    }
  }
  // Get last message from cache
  getLastMessage(chatId: string): Message | null {
    const cached = this.messageCache.get(String(chatId));
    if (cached && cached.messages.length > 0) {
      return cached.messages[cached.messages.length - 1];
    }
    return null;
  }
  // Check if cache is valid
  private isValidCache(timestamp: number, maxAge: number): boolean {
    return Date.now() - timestamp < maxAge;
  }
  // Clear cache for specific chat
  async clearChatCache(chatId: string): Promise<void> {
    this.messageCache.delete(String(chatId));
    this.profileCache.delete(String(chatId));
    try {
      await AsyncStorage.removeItem(`${this.MESSAGE_CACHE_KEY}_${chatId}`);
      } catch (error) {
      }
  }
  // Clear all cache
  async clearAllCache(): Promise<void> {
    this.messageCache.clear();
    this.profileCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith(this.MESSAGE_CACHE_KEY));
      await AsyncStorage.multiRemove(chatKeys);
      } catch (error) {
      }
  }
  // Get cache statistics
  getCacheStats(): { messageChats: number; profileChats: number; totalMessages: number } {
    let totalMessages = 0;
    this.messageCache.forEach(cache => {
      totalMessages += cache.messages.length;
    });
    return {
      messageChats: this.messageCache.size,
      profileChats: this.profileCache.size,
      totalMessages
    };
  }
  // Optimize cache by removing old entries
  optimizeCache(): void {
    const now = Date.now();
    // Remove expired message caches
    this.messageCache.forEach((cache, chatId) => {
      if (!this.isValidCache(cache.timestamp, this.CACHE_DURATION)) {
        this.messageCache.delete(chatId);
      }
    });
    // Remove expired profile caches
    this.profileCache.forEach((cache, chatId) => {
      if (!this.isValidCache(cache.timestamp, this.CACHE_DURATION)) {
        this.profileCache.delete(chatId);
      }
    });
    }
}
// Export singleton instance
export const chatMessageCache = new ChatMessageCacheManager();
export type { CachedChatMessages, ChatData };
