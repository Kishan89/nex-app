import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService, { ProfileData as ApiProfileData } from '@/lib/api';
type ProfileData = ApiProfileData & {
  xp?: number;
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  bannerUrl?: string;
  avatarUrl?: string;
};
interface CachedProfile {
  profile: ProfileData;
  xpRank: number | null;
  isFollowing: boolean;
  timestamp: number;
}
interface ProfileStore {
  profiles: Map<string, CachedProfile>;
  loading: Map<string, boolean>;
}
class ProfileStoreManager {
  private store: ProfileStore = {
    profiles: new Map(),
    loading: new Map(),
  };
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (extended from 5 minutes)
  private readonly STORAGE_PREFIX = 'profile_';
  // Get profile from memory cache first, then AsyncStorage, then API
  async getProfile(userId: string, forceRefresh = false, currentUserId?: string): Promise<CachedProfile | null> {
    if (!userId) return null;
    // Check if already loading
    if (this.store.loading.get(userId)) {
      return this.waitForProfile(userId);
    }
    // Check memory cache first
    const memoryProfile = this.store.profiles.get(userId);
    if (memoryProfile && !forceRefresh && this.isProfileValid(memoryProfile)) {
      return memoryProfile;
    }
    // Check AsyncStorage cache
    if (!forceRefresh) {
      const cachedProfile = await this.getFromStorage(userId);
      if (cachedProfile && this.isProfileValid(cachedProfile)) {
        // Store in memory for faster access
        this.store.profiles.set(userId, cachedProfile);
        return cachedProfile;
      }
    }
    // Fetch from API
    return this.fetchFromAPI(userId, currentUserId);
  }
  private async waitForProfile(userId: string): Promise<CachedProfile | null> {
    // Wait for ongoing request to complete
    let attempts = 0;
    while (this.store.loading.get(userId) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return this.store.profiles.get(userId) || null;
  }
  private async fetchFromAPI(userId: string, currentUserId?: string): Promise<CachedProfile | null> {
    this.store.loading.set(userId, true);
    try {
      // Parallel API calls for better performance
      const promises = [
        apiService.getUserProfile(userId),
        // Only fetch XP rank for top 3 check (lightweight)
        apiService.getTopXPUsers(3).catch(() => null),
        // Check follow status if not current user
        this.shouldCheckFollowStatus(userId, currentUserId) ? 
          apiService.checkFollowStatus(userId).catch(() => ({ isFollowing: false })) : 
          Promise.resolve(null)
      ];
      const [profileData, topXPResponse, followStatusResponse] = await Promise.all(promises);
      let xpRank = null;
      let followingStatus = false;
      // Handle XP rank (only for top 3)
      if (topXPResponse) {
        const topXPUsers = topXPResponse?.data || topXPResponse;
        if (topXPUsers && Array.isArray(topXPUsers)) {
          const userIndex = topXPUsers.findIndex((topUser: any) => topUser.id === userId);
          xpRank = userIndex !== -1 ? userIndex + 1 : null;
        }
      }
      // Handle follow status
      if (followStatusResponse && this.shouldCheckFollowStatus(userId, currentUserId)) {
        followingStatus = followStatusResponse?.data?.isFollowing ?? followStatusResponse?.isFollowing ?? false;
      }
      const cachedProfile: CachedProfile = {
        profile: profileData,
        xpRank,
        isFollowing: followingStatus,
        timestamp: Date.now()
      };
      // Store in memory and AsyncStorage
      this.store.profiles.set(userId, cachedProfile);
      await this.saveToStorage(userId, cachedProfile);
      return cachedProfile;
    } catch (error) {
      throw error;
    } finally {
      this.store.loading.delete(userId);
    }
  }
  private shouldCheckFollowStatus(userId: string, currentUserId?: string): boolean {
    // Only check follow status if this is not the current user
    return currentUserId ? userId !== currentUserId : true;
  }
  private isProfileValid(cachedProfile: CachedProfile): boolean {
    return Date.now() - cachedProfile.timestamp < this.CACHE_DURATION;
  }
  private async getFromStorage(userId: string): Promise<CachedProfile | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.STORAGE_PREFIX}${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      }
    return null;
  }
  private async saveToStorage(userId: string, profile: CachedProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.STORAGE_PREFIX}${userId}`, JSON.stringify(profile));
    } catch (error) {
      }
  }
  // Update profile data (e.g., after follow/unfollow)
  async updateProfile(userId: string, updates: Partial<CachedProfile>): Promise<void> {
    const existing = this.store.profiles.get(userId);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        timestamp: Date.now()
      };
      this.store.profiles.set(userId, updated);
      await this.saveToStorage(userId, updated);
    }
  }
  // Update follow counts specifically
  async updateFollowCounts(userId: string, followers: number, following: number): Promise<void> {
    const existing = this.store.profiles.get(userId);
    if (existing) {
      const updated = {
        ...existing,
        profile: {
          ...existing.profile,
          followers_count: followers,
          following_count: following
        },
        timestamp: Date.now()
      };
      this.store.profiles.set(userId, updated);
      await this.saveToStorage(userId, updated);
    }
  }
  // Update follow status
  async updateFollowStatus(userId: string, isFollowing: boolean): Promise<void> {
    await this.updateProfile(userId, { isFollowing });
  }
  // Clear cache for a specific user
  async clearProfile(userId: string): Promise<void> {
    this.store.profiles.delete(userId);
    this.store.loading.delete(userId);
    try {
      await AsyncStorage.removeItem(`${this.STORAGE_PREFIX}${userId}`);
    } catch (error) {
      }
  }
  // Clear all cached profiles
  async clearAllProfiles(): Promise<void> {
    this.store.profiles.clear();
    this.store.loading.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(profileKeys);
    } catch (error) {
      }
  }
  // Get cached profile count (for debugging)
  getCacheInfo(): { memoryCount: number; loadingCount: number } {
    return {
      memoryCount: this.store.profiles.size,
      loadingCount: this.store.loading.size
    };
  }
}
// Export singleton instance
export const profileStore = new ProfileStoreManager();
export type { ProfileData, CachedProfile };
