import AsyncStorage from '@react-native-async-storage/async-storage';
interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  postId?: string;
  userId?: string;
  read: boolean;
  createdAt: string;
}
interface CachedNotificationData {
  notifications: SimpleNotification[];
  timestamp: number;
  unreadCount: number;
}
class NotificationCacheManager {
  private memoryCache: CachedNotificationData | null = null;
  private readonly CACHE_KEY = '@notification_cache_v1';
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly INSTANT_CACHE_DURATION = 30 * 1000; // 30 seconds for instant loading
  // Get cached notifications instantly from memory first, then storage
  async getCachedNotifications(): Promise<CachedNotificationData | null> {
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
  // Cache notifications in both memory and storage
  async cacheNotifications(notifications: SimpleNotification[]): Promise<void> {
    const unreadCount = notifications.filter(n => !n.read).length;
    const cacheData: CachedNotificationData = {
      notifications,
      unreadCount,
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
  // Update notification read status in cache
  markAsReadInCache(notificationIds: string[]): void {
    if (!this.memoryCache) return;
    const updatedNotifications = this.memoryCache.notifications.map(notification =>
      notificationIds.includes(notification.id) 
        ? { ...notification, read: true }
        : notification
    );
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    this.memoryCache = {
      ...this.memoryCache,
      notifications: updatedNotifications,
      unreadCount,
      timestamp: Date.now()
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Mark all notifications as read
  markAllAsReadInCache(): void {
    if (!this.memoryCache) return;
    const updatedNotifications = this.memoryCache.notifications.map(notification => ({
      ...notification,
      read: true
    }));
    this.memoryCache = {
      ...this.memoryCache,
      notifications: updatedNotifications,
      unreadCount: 0,
      timestamp: Date.now()
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Get unread count from cache
  getUnreadCount(): number {
    return this.memoryCache?.unreadCount || 0;
  }
  // Check if cache is still valid
  private isValidCache(cache: CachedNotificationData, maxAge: number): boolean {
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
  // Get cache info for debugging
  getCacheInfo(): { hasMemoryCache: boolean; age?: number; count?: number } {
    return {
      hasMemoryCache: !!this.memoryCache,
      age: this.memoryCache ? Date.now() - this.memoryCache.timestamp : undefined,
      count: this.memoryCache?.notifications.length
    };
  }
}
// Export singleton instance
export const notificationCache = new NotificationCacheManager();
export type { SimpleNotification, CachedNotificationData };
