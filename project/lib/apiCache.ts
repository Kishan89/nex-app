// API response caching for better performance
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class ApiCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MEMORY_CACHE_LIMIT = 50;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached response
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        return memoryEntry.data;
      }

      // Check AsyncStorage
      const stored = await AsyncStorage.getItem(`api_cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isValid(entry)) {
          // Store in memory for faster access
          this.setMemoryCache(key, entry);
          return entry.data;
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(`api_cache_${key}`);
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      };

      // Store in memory
      this.setMemoryCache(key, entry);

      // Store in AsyncStorage
      await AsyncStorage.setItem(`api_cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Clear specific cache entry
   */
  async clear(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(`api_cache_${key}`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('api_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.expiry;
  }

  /**
   * Set memory cache with size limit
   */
  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    if (this.memoryCache.size >= this.MEMORY_CACHE_LIMIT) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, entry);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryLimit: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryLimit: this.MEMORY_CACHE_LIMIT
    };
  }

  /**
   * Generate cache key from URL and params
   */
  generateKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}_${paramString}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

// Singleton instance
export const apiCache = new ApiCache();

// Cache decorator for API calls
export const withCache = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) => {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    
    // Try to get from cache
    const cached = await apiCache.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // Call original function
    const result = await fn(...args);
    
    // Cache the result
    await apiCache.set(key, result, ttl);
    
    return result;
  };
};
