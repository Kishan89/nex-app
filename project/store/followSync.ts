import AsyncStorage from '@react-native-async-storage/async-storage';
interface FollowState {
  userId: string;
  isFollowing: boolean;
  timestamp: number;
}
interface FollowSyncData {
  followStates: Record<string, FollowState>;
  timestamp: number;
}
type FollowSyncListener = (userId: string, isFollowing: boolean) => void;
class FollowSyncManager {
  private memoryCache: FollowSyncData | null = null;
  private listeners: Set<FollowSyncListener> = new Set();
  private readonly CACHE_KEY = '@follow_sync_v1';
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  // Subscribe to follow state changes
  subscribe(listener: FollowSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  // Notify all listeners of follow state change
  private notifyListeners(userId: string, isFollowing: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(userId, isFollowing);
      } catch (error) {
        }
    });
  }
  // Get follow state for a user
  getFollowState(userId: string): boolean | null {
    if (!this.memoryCache) return null;
    const followState = this.memoryCache.followStates[userId];
    if (!followState) return null;
    // Check if cache is still valid
    const isValid = Date.now() - followState.timestamp < this.CACHE_DURATION;
    return isValid ? followState.isFollowing : null;
  }
  // Update follow state and sync across all screens
  async updateFollowState(userId: string, isFollowing: boolean): Promise<void> {
    const followState: FollowState = {
      userId,
      isFollowing,
      timestamp: Date.now()
    };
    // Initialize cache if not exists
    if (!this.memoryCache) {
      this.memoryCache = {
        followStates: {},
        timestamp: Date.now()
      };
    }
    // Update memory cache
    this.memoryCache.followStates[userId] = followState;
    this.memoryCache.timestamp = Date.now();
    // Notify all listeners immediately
    this.notifyListeners(userId, isFollowing);
    // Save to storage in background
    this.saveToStorage();
    }
  // Bulk update follow states (for initial load)
  async bulkUpdateFollowStates(followStates: Record<string, boolean>): Promise<void> {
    if (!this.memoryCache) {
      this.memoryCache = {
        followStates: {},
        timestamp: Date.now()
      };
    }
    const timestamp = Date.now();
    // Update all states
    Object.entries(followStates).forEach(([userId, isFollowing]) => {
      this.memoryCache!.followStates[userId] = {
        userId,
        isFollowing,
        timestamp
      };
    });
    this.memoryCache.timestamp = timestamp;
    // Save to storage
    this.saveToStorage();
    }
  // Load follow states from storage
  async loadFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache: FollowSyncData = JSON.parse(cached);
        // Check if cache is still valid
        const isValid = Date.now() - parsedCache.timestamp < this.CACHE_DURATION;
        if (isValid) {
          this.memoryCache = parsedCache;
          }
      }
    } catch (error) {
      }
  }
  // Save to storage (background operation)
  private async saveToStorage(): Promise<void> {
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
  // Get all follow states (for debugging)
  getAllFollowStates(): Record<string, boolean> {
    if (!this.memoryCache) return {};
    const result: Record<string, boolean> = {};
    Object.entries(this.memoryCache.followStates).forEach(([userId, state]) => {
      const isValid = Date.now() - state.timestamp < this.CACHE_DURATION;
      if (isValid) {
        result[userId] = state.isFollowing;
      }
    });
    return result;
  }
  // Get cache info for debugging
  getCacheInfo(): { hasCache: boolean; userCount: number; age?: number } {
    return {
      hasCache: !!this.memoryCache,
      userCount: this.memoryCache ? Object.keys(this.memoryCache.followStates).length : 0,
      age: this.memoryCache ? Date.now() - this.memoryCache.timestamp : undefined
    };
  }
  // Preload cache (for app startup)
  async preloadCache(): Promise<void> {
    await this.loadFromStorage();
  }
}
// Export singleton instance
export const followSync = new FollowSyncManager();
export type { FollowSyncListener };
