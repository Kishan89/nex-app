import apiService from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Achievement Categories
export type AchievementCategory = 'first_steps' | 'engagement' | 'streak' | 'xp' | 'special';

// Achievement Definition
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  target?: number;
  rarity: 'common' | 'rare' | 'legendary';
}

// User Achievement Progress
export interface UserAchievement {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  seen?: boolean;
}

// User Stats
export interface UserStats {
  totalPosts: number;
  totalLikesReceived: number;
  totalComments: number;
  totalFollowers: number;
  currentStreak: number;
  longestStreak: number;
  lastPostDate?: string;
  lastVisitDate?: string;
}

// All Achievement Definitions with INCREASED LIMITS
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // === FIRST STEPS ===
  {
    id: 'first_post',
    title: 'Welcome Creator!',
    description: 'Create your first post',
    icon: '🎉',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    id: 'first_like',
    title: 'Spreading Love',
    description: 'Give your first like',
    icon: '❤️',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    id: 'first_comment',
    title: 'Join the Conversation',
    description: 'Leave your first comment',
    icon: '💬',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    id: 'first_follower',
    title: 'Growing Network',
    description: 'Get your first follower',
    icon: '👥',
    category: 'first_steps',
    rarity: 'common',
  },
  
  // === ENGAGEMENT MILESTONES (INCREASED) ===
  {
    id: '10_likes',
    title: 'Rising Star',
    description: 'Get 10 likes on your posts',
    icon: '⭐',
    category: 'engagement',
    target: 10,
    rarity: 'common',
  },
  {
    id: '25_likes',
    title: 'Popular Creator',
    description: 'Get 25 likes on your posts',
    icon: '🌟',
    category: 'engagement',
    target: 25,
    rarity: 'common',
  },
  {
    id: '50_likes',
    title: 'Influencer',
    description: 'Get 50 total likes',
    icon: '💎',
    category: 'engagement',
    target: 50,
    rarity: 'rare',
  },
  {
    id: '100_likes',
    title: 'Social Star',
    description: 'Get 100 total likes',
    icon: '🔥',
    category: 'engagement',
    target: 100,
    rarity: 'rare',
  },
  
  // === STREAK ACHIEVEMENTS (60 days max) ===
  {
    id: '3_day_streak',
    title: 'Consistent',
    description: 'Post 3 days in a row',
    icon: '📅',
    category: 'streak',
    target: 3,
    rarity: 'common',
  },
  {
    id: '7_day_streak',
    title: 'Dedicated',
    description: 'Post 7 days in a row',
    icon: '🔥',
    category: 'streak',
    target: 7,
    rarity: 'rare',
  },
  {
    id: '60_day_streak',
    title: 'Unstoppable',
    description: 'Post 60 days in a row',
    icon: '👑',
    category: 'streak',
    target: 60,
    rarity: 'legendary',
  },
  
  // === XP MILESTONES (INCREASED) ===
  {
    id: '100_xp',
    title: 'Learning Fast',
    description: 'Reach 100 XP',
    icon: '📚',
    category: 'xp',
    target: 100,
    rarity: 'common',
  },
  {
    id: '250_xp',
    title: 'Expert',
    description: 'Reach 250 XP',
    icon: '🎓',
    category: 'xp',
    target: 250,
    rarity: 'rare',
  },
  {
    id: '1000_xp',
    title: 'Master',
    description: 'Reach 1000 XP',
    icon: '🏆',
    category: 'xp',
    target: 1000,
    rarity: 'legendary',
  },
  
  // === SPECIAL ACHIEVEMENTS ===
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Post between 12 AM - 4 AM',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Post between 5 AM - 7 AM',
    icon: '🐦',
    category: 'special',
    rarity: 'rare',
  },
];

const CACHE_KEY = '@achievements_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
const STATS_CACHE_KEY = '@achievement_stats';
const COMPLETION_CACHE_KEY = '@achievement_completion';

class AchievementService {
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();

  // Get all achievements with user progress from backend
  async getAllAchievements(userId: string, forceRefresh = false): Promise<Record<string, UserAchievement>> {
    try {
      const cacheKey = `${userId}_achievements`;
      
      // Check memory cache first (instant)
      if (!forceRefresh && this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
          return cached.data;
        }
      }
      
      // Try AsyncStorage cache
      if (!forceRefresh) {
        const cached = await this.getFromCache(userId);
        if (cached) {
          this.memoryCache.set(cacheKey, { data: cached, timestamp: Date.now() });
          return cached;
        }
      }
      
      // Fetch from backend
      const response = await apiService.getUserAchievements(userId) as any;
      
      if (response?.success && response?.data) {
        // Save to both caches
        this.memoryCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        await this.saveToCache(userId, response.data);
        return response.data;
      }
      
      // Fallback: Initialize with all achievements locked
      const initial: Record<string, UserAchievement> = {};
      ACHIEVEMENTS.forEach(achievement => {
        initial[achievement.id] = {
          id: achievement.id,
          unlocked: false,
          progress: 0,
          seen: false,
        };
      });
      
      return initial;
    } catch (error) {
      console.error('Error getting achievements:', error);
      return {};
    }
  }

  // Get user stats from backend
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const cacheKey = `${userId}_stats`;
      
      // Check memory cache
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
          return cached.data;
        }
      }
      
      const response = await apiService.getAchievementStats(userId) as any;
      
      if (response?.success && response?.data) {
        this.memoryCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        return response.data;
      }
      
      return {
        totalPosts: 0,
        totalLikesReceived: 0,
        totalComments: 0,
        totalFollowers: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalPosts: 0,
        totalLikesReceived: 0,
        totalComments: 0,
        totalFollowers: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }
  }

  // Mark achievement as seen
  async markAsSeen(userId: string, achievementId: string): Promise<void> {
    try {
      await this.invalidateCache(userId);
      this.memoryCache.delete(`${userId}_achievements`);
    } catch (error) {
      console.error('Error marking achievement as seen:', error);
    }
  }

  // Get unseen unlocked achievements
  async getUnseenAchievements(userId: string): Promise<string[]> {
    try {
      console.log('📡 Fetching unseen achievements from API for user:', userId);
      const response = await apiService.getUnseenAchievements(userId) as any;
      console.log('📥 API Response:', JSON.stringify(response));
      
      if (response?.success && response?.data) {
        console.log('✅ Unseen achievements found:', response.data);
        return response.data;
      }
      
      console.log('⚠️ No data in response or unsuccessful');
      return [];
    } catch (error) {
      console.error('❌ Error getting unseen achievements:', error);
      return [];
    }
  }

  // Get completion percentage
  async getCompletionPercentage(userId: string): Promise<number> {
    try {
      const cacheKey = `${userId}_completion`;
      
      // Check memory cache
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
          return cached.data;
        }
      }
      
      const response = await apiService.getCompletionPercentage(userId) as any;
      
      if (response?.success && response?.data?.percentage !== undefined) {
        this.memoryCache.set(cacheKey, { data: response.data.percentage, timestamp: Date.now() });
        return response.data.percentage;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting completion percentage:', error);
      return 0;
    }
  }

  // Handle post created - check for newly unlocked achievements
  async handlePostCreated(userId: string): Promise<string[]> {
    try {
      console.log('🏆 Checking for new achievements...');
      
      // Clear all caches
      this.memoryCache.delete(`${userId}_achievements`);
      this.memoryCache.delete(`${userId}_stats`);
      this.memoryCache.delete(`${userId}_completion`);
      await this.invalidateCache(userId);
      
      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get unseen achievements
      const unseen = await this.getUnseenAchievements(userId);
      console.log('🎯 Unseen achievements:', unseen);
      
      return unseen;
    } catch (error) {
      console.error('❌ Error handling post created:', error);
      return [];
    }
  }
  
  // Cache management
  private async getFromCache(userId: string): Promise<Record<string, UserAchievement> | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
        return null;
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }
  
  private async saveToCache(userId: string, data: Record<string, UserAchievement>): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Cache save failed, continue without cache
    }
  }
  
  private async invalidateCache(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
    } catch (error) {
      // Ignore cache invalidation errors
    }
  }
}

export const achievementService = new AchievementService();
