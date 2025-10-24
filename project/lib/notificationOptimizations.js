// Ultra-Fast Notification Loading Optimizations
// Provides instant notification display with smart caching

import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationOptimizations {
  constructor() {
    this.memoryCache = new Map();
    this.userCache = new Map();
    this.cacheExpiry = 60 * 1000; // 1 minute
    this.instantCacheExpiry = 10 * 1000; // 10 seconds for instant loading
  }

  // 🚀 INSTANT NOTIFICATION LOADING: Get cached notifications immediately
  async getInstantNotifications(userId) {
    const cacheKey = `notifications-${userId}`;
    
    // Check ultra-fast memory cache first (0ms delay)
    const memoryCache = this.memoryCache.get(cacheKey);
    if (memoryCache && (Date.now() - memoryCache.timestamp) < this.instantCacheExpiry) {
      console.log('📋 Instant notifications from memory cache');
      return memoryCache.data;
    }

    // Check AsyncStorage cache (fast but not instant)
    try {
      const storedCache = await AsyncStorage.getItem(cacheKey);
      if (storedCache) {
        const parsed = JSON.parse(storedCache);
        if ((Date.now() - parsed.timestamp) < this.cacheExpiry) {
          // Update memory cache for next instant access
          this.memoryCache.set(cacheKey, parsed);
          console.log('📋 Fast notifications from storage cache');
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('Error reading notification cache:', error);
    }

    return [];
  }

  // 🚀 CACHE NOTIFICATIONS: Store for instant future access
  async cacheNotifications(userId, notifications) {
    const cacheKey = `notifications-${userId}`;
    const cacheData = {
      data: notifications,
      timestamp: Date.now(),
      unreadCount: notifications.filter(n => !n.read).length
    };

    // Update memory cache immediately
    this.memoryCache.set(cacheKey, cacheData);

    // Update AsyncStorage cache (background)
    AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData)).catch(console.error);
  }

  // 🚀 OPTIMISTIC READ UPDATES: Mark as read immediately in cache
  markAsReadInCache(userId, notificationIds = []) {
    const cacheKey = `notifications-${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached) {
      const updatedNotifications = cached.data.map(notification => {
        if (notificationIds.length === 0 || notificationIds.includes(notification.id)) {
          return { ...notification, read: true };
        }
        return notification;
      });

      const updatedCache = {
        ...cached,
        data: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
        timestamp: Date.now()
      };

      this.memoryCache.set(cacheKey, updatedCache);
      
      // Update storage in background
      AsyncStorage.setItem(cacheKey, JSON.stringify(updatedCache)).catch(console.error);
    }
  }

  // 🚀 PAGINATION SUPPORT: Load notifications in chunks
  async loadNotificationsPage(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    // For first page, try to get from cache
    if (page === 1) {
      const cachedNotifications = await this.getInstantNotifications(userId);
      if (cachedNotifications.length > 0) {
        return {
          notifications: cachedNotifications.slice(0, limit),
          fromCache: true,
          hasMore: cachedNotifications.length > limit
        };
      }
    }

    // If not in cache or not first page, will be loaded from API
    return {
      notifications: [],
      fromCache: false,
      hasMore: false
    };
  }

  // 🚀 PRELOAD OPTIMIZATION: Preload user data for notifications
  preloadUserData(notifications) {
    notifications.forEach(notification => {
      if (notification.userId && notification.user) {
        this.userCache.set(notification.userId, {
          username: notification.user,
          avatar: notification.userAvatar,
          timestamp: Date.now()
        });
      }
    });
  }

  // 🚀 GET CACHED USER DATA: Instant user info for notifications
  getCachedUserData(userId) {
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < (5 * 60 * 1000)) { // 5 minutes
      return cached;
    }
    return null;
  }

  // 🚀 SMART REFRESH: Only refresh when necessary
  shouldRefreshNotifications(userId, lastRefresh) {
    const cacheKey = `notifications-${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (!cached) return true;
    if (!lastRefresh) return true;
    if ((Date.now() - cached.timestamp) > this.cacheExpiry) return true;
    
    return false;
  }

  // 🚀 UNREAD COUNT: Get instant unread count from cache
  getUnreadCount(userId) {
    const cacheKey = `notifications-${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    return cached?.unreadCount || 0;
  }

  // 🚀 ADD NEW NOTIFICATION: Add to cache when received via socket
  addNewNotification(userId, notification) {
    const cacheKey = `notifications-${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    
    if (cached) {
      const updatedNotifications = [notification, ...cached.data];
      const updatedCache = {
        ...cached,
        data: updatedNotifications.slice(0, 50), // Keep only latest 50
        unreadCount: updatedNotifications.filter(n => !n.read).length,
        timestamp: Date.now()
      };

      this.memoryCache.set(cacheKey, updatedCache);
      
      // Update storage in background
      AsyncStorage.setItem(cacheKey, JSON.stringify(updatedCache)).catch(console.error);
    }
  }

  // 🚀 CLEANUP: Prevent memory leaks
  cleanup() {
    const now = Date.now();
    
    // Clear old notification cache
    for (const [key, value] of this.memoryCache.entries()) {
      if ((now - value.timestamp) > (10 * 60 * 1000)) { // 10 minutes
        this.memoryCache.delete(key);
      }
    }
    
    // Clear old user cache
    for (const [key, value] of this.userCache.entries()) {
      if ((now - value.timestamp) > (30 * 60 * 1000)) { // 30 minutes
        this.userCache.delete(key);
      }
    }
  }

  // 🚀 CLEAR USER CACHE: When user logs out
  clearUserCache(userId) {
    const cacheKey = `notifications-${userId}`;
    this.memoryCache.delete(cacheKey);
    AsyncStorage.removeItem(cacheKey).catch(console.error);
  }

  // 🚀 STATS: Monitor performance
  getCacheStats() {
    return {
      notificationCacheSize: this.memoryCache.size,
      userCacheSize: this.userCache.size,
      totalMemoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    const notificationSize = JSON.stringify(Array.from(this.memoryCache.values())).length;
    const userSize = JSON.stringify(Array.from(this.userCache.values())).length;
    return notificationSize + userSize;
  }
}

// Export singleton instance
export const notificationOptimizations = new NotificationOptimizations();

// Cleanup every 5 minutes
setInterval(() => {
  notificationOptimizations.cleanup();
}, 5 * 60 * 1000);

export default notificationOptimizations;
