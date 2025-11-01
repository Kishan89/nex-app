// User Cache Service for instant avatar and name loading
const { prisma } = require('../config/database');

class UserCacheService {
  constructor() {
    this.userCache = new Map(); // In-memory cache for user data
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 1000; // Maximum users to cache
  }

  /**
   * Get user data with caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User data
   */
  async getUserData(userId) {
    if (!userId) return null;

    // Check cache first
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Fetch from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          avatar: true,
          isOnline: true,
          lastSeen: true,
        }
      });

      if (user) {
        // Cache the result
        this.cacheUser(userId, user);
        return user;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      return cached?.data || null; // Return stale cache if available
    }
  }

  /**
   * Get multiple users data with batch caching
   * @param {string[]} userIds - Array of user IDs
   * @returns {Promise<Object>} - Map of userId -> userData
   */
  async getMultipleUsersData(userIds) {
    if (!userIds || userIds.length === 0) return {};

    const result = {};
    const uncachedIds = [];

    // Check cache for each user
    for (const userId of userIds) {
      const cached = this.userCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        result[userId] = cached.data;
      } else {
        uncachedIds.push(userId);
      }
    }

    // Fetch uncached users from database
    if (uncachedIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: uncachedIds } },
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          }
        });

        // Cache and add to result
        for (const user of users) {
          this.cacheUser(user.id, user);
          result[user.id] = user;
        }
      } catch (error) {
        console.error('❌ Error fetching multiple users data:', error);
      }
    }

    return result;
  }

  /**
   * Cache user data
   * @param {string} userId - User ID
   * @param {Object} userData - User data to cache
   */
  cacheUser(userId, userData) {
    // Prevent cache from growing too large
    if (this.userCache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple LRU)
      const oldestKey = this.userCache.keys().next().value;
      this.userCache.delete(oldestKey);
    }

    this.userCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
  }

  /**
   * Update user cache when user data changes
   * @param {string} userId - User ID
   * @param {Object} updates - Updated user data
   */
  updateUserCache(userId, updates) {
    const cached = this.userCache.get(userId);
    if (cached) {
      cached.data = { ...cached.data, ...updates };
      cached.timestamp = Date.now();
    }
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User ID to invalidate
   */
  invalidateUser(userId) {
    this.userCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.userCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.userCache.size,
      maxSize: this.maxCacheSize,
      expiryTime: this.cacheExpiry,
      memoryUsage: JSON.stringify(Array.from(this.userCache.values())).length
    };
  }

  /**
   * Preload users for chat list (background)
   * @param {string[]} userIds - User IDs to preload
   */
  async preloadUsers(userIds) {
    if (!userIds || userIds.length === 0) return;

    // Only preload users not in cache
    const uncachedIds = userIds.filter(userId => {
      const cached = this.userCache.get(userId);
      return !cached || (Date.now() - cached.timestamp) >= this.cacheExpiry;
    });

    if (uncachedIds.length > 0) {
      // Preload in background without blocking
      setImmediate(async () => {
        try {
          await this.getMultipleUsersData(uncachedIds);
          console.log(`📋 Preloaded ${uncachedIds.length} users to cache`);
        } catch (error) {
          console.error('❌ Error preloading users:', error);
        }
      });
    }
  }
}

module.exports = new UserCacheService();
