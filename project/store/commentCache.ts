// Comment caching service for instant loading
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Comment } from '@/types';

const COMMENT_CACHE_KEY = 'comment_cache';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

interface CachedComments {
  postId: string;
  comments: Comment[];
  timestamp: number;
}

class CommentCacheService {
  private cache: Map<string, CachedComments> = new Map();

  // Get cached comments for a post
  async getCachedComments(postId: string): Promise<Comment[]> {
    try {
      const cached = this.cache.get(postId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log(`📦 Loading ${cached.comments.length} cached comments for post ${postId}`);
        return cached.comments;
      }

      // Try to load from AsyncStorage
      const stored = await AsyncStorage.getItem(`${COMMENT_CACHE_KEY}_${postId}`);
      if (stored) {
        const parsed: CachedComments = JSON.parse(stored);
        if (this.isCacheValid(parsed.timestamp)) {
          this.cache.set(postId, parsed);
          console.log(`📦 Loaded ${parsed.comments.length} cached comments from storage for post ${postId}`);
          return parsed.comments;
        }
      }

      return [];
    } catch (error) {
      console.error('Error loading cached comments:', error);
      return [];
    }
  }

  // Cache comments for a post
  async cacheComments(postId: string, comments: Comment[]): Promise<void> {
    try {
      const cached: CachedComments = {
        postId,
        comments,
        timestamp: Date.now(),
      };

      // Store in memory cache
      this.cache.set(postId, cached);

      // Store in AsyncStorage
      await AsyncStorage.setItem(
        `${COMMENT_CACHE_KEY}_${postId}`,
        JSON.stringify(cached)
      );

      console.log(`💾 Cached ${comments.length} comments for post ${postId}`);
    } catch (error) {
      console.error('Error caching comments:', error);
    }
  }

  // Add a new comment to cache
  async addCommentToCache(postId: string, comment: Comment): Promise<void> {
    try {
      const cached = this.cache.get(postId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        // Add comment to the beginning of the array
        const updatedComments = [comment, ...cached.comments];
        await this.cacheComments(postId, updatedComments);
        console.log(`➕ Added comment to cache for post ${postId}`);
      }
    } catch (error) {
      console.error('Error adding comment to cache:', error);
    }
  }

  // Remove a comment from cache
  async removeCommentFromCache(postId: string, commentId: string): Promise<void> {
    try {
      const cached = this.cache.get(postId);
      if (cached && this.isCacheValid(cached.timestamp)) {
        const updatedComments = cached.comments.filter(c => c.id !== commentId);
        await this.cacheComments(postId, updatedComments);
        console.log(`➖ Removed comment from cache for post ${postId}`);
      }
    } catch (error) {
      console.error('Error removing comment from cache:', error);
    }
  }

  // Clear cache for a specific post
  async clearPostCache(postId: string): Promise<void> {
    try {
      this.cache.delete(postId);
      await AsyncStorage.removeItem(`${COMMENT_CACHE_KEY}_${postId}`);
      console.log(`🗑️ Cleared cache for post ${postId}`);
    } catch (error) {
      console.error('Error clearing post cache:', error);
    }
  }

  // Clear all cached comments
  async clearAllCache(): Promise<void> {
    try {
      this.cache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const commentKeys = keys.filter(key => key.startsWith(COMMENT_CACHE_KEY));
      await AsyncStorage.multiRemove(commentKeys);
      console.log('🗑️ Cleared all comment cache');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Check if cache is still valid
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_EXPIRY_TIME;
  }

  // Get cache stats
  getCacheStats(): { postCount: number; totalComments: number } {
    let totalComments = 0;
    this.cache.forEach(cached => {
      totalComments += cached.comments.length;
    });
    return {
      postCount: this.cache.size,
      totalComments,
    };
  }
}

export const commentCache = new CommentCacheService();
