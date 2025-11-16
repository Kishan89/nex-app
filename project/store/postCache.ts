import AsyncStorage from '@react-native-async-storage/async-storage';
import { NormalizedPost } from '@/types';
interface CachedPostData {
  posts: NormalizedPost[];
  followingPosts: NormalizedPost[];
  trendingPosts: NormalizedPost[];
  timestamp: number;
  interactions: Record<string, { liked: boolean; bookmarked: boolean }>;
}
class PostCacheManager {
  private memoryCache: CachedPostData | null = null;
  private readonly CACHE_KEY = '@post_cache_v2';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly INSTANT_CACHE_DURATION = 30 * 1000; // 30 seconds for instant loading
  // Get cached posts instantly from memory first, then storage
  async getCachedPosts(): Promise<CachedPostData | null> {
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
  // Cache posts in both memory and storage
  async cachePosts(data: Omit<CachedPostData, 'timestamp'>): Promise<void> {
    const cacheData: CachedPostData = {
      ...data,
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
  // Update specific post in cache (for likes, bookmarks, etc.)
  updatePostInCache(postId: string, updates: Partial<NormalizedPost>): void {
    if (!this.memoryCache) return;
    const updatePost = (posts: NormalizedPost[]) => 
      posts.map(post => post.id === postId ? { ...post, ...updates } : post);
    this.memoryCache = {
      ...this.memoryCache,
      posts: updatePost(this.memoryCache.posts),
      followingPosts: updatePost(this.memoryCache.followingPosts),
      trendingPosts: updatePost(this.memoryCache.trendingPosts),
      timestamp: Date.now() // Update timestamp to keep cache fresh
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Update interactions in cache
  updateInteractionsInCache(interactions: Record<string, { liked: boolean; bookmarked: boolean }>): void {
    if (!this.memoryCache) return;
    this.memoryCache = {
      ...this.memoryCache,
      interactions: { ...this.memoryCache.interactions, ...interactions },
      timestamp: Date.now()
    };
    // Update storage in background
    this.saveMemoryCacheToStorage();
  }
  // Check if cache is still valid
  private isValidCache(cache: CachedPostData, maxAge: number): boolean {
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
  // Get cache info for debugging
  getCacheInfo(): { hasMemoryCache: boolean; hasStorageCache: boolean; age?: number } {
    return {
      hasMemoryCache: !!this.memoryCache,
      hasStorageCache: false, // Would need async check
      age: this.memoryCache ? Date.now() - this.memoryCache.timestamp : undefined
    };
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
}
// Export singleton instance
export const postCache = new PostCacheManager();
export type { CachedPostData };
