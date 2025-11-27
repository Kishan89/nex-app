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
    description: 'Like your first post',
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
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

class AchievementService {
  // Get all achievements with user progress from backend
  async getAllAchievements(userId: string): Promise<Record<string, UserAchievement>> {
    try {
      // Try to get from cache first
      const cached = await this.getFromCache(userId);
      if (cached) {
        return cached;
      }
      
      // Fetch from backend
      const response = await apiService.getUserAchievements(userId) as any;
      
      if (response?.success && response?.data) {
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
      const response = await apiService.getAchievementStats(userId) as any;
      
      if (response?.success && response?.data) {
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
      // Call backend to mark as seen
      await apiService.markAchievementAsSeen(userId, achievementId);
      // Invalidate cache to force refresh next time
      await this.invalidateCache(userId);
    } catch (error) {
      console.error('Error marking achievement as seen:', error);
    }
  }

  // Validate if an achievement is valid based on current time/conditions
  // This is a client-side check to prevent incorrect unlocks due to server timezone issues
  validateAchievementTime(achievementId: string): boolean {
    const now = new Date();
    const hours = now.getHours();
    
    if (achievementId === 'early_bird') {
      // Early Bird: 5 AM - 7 AM
      return hours >= 5 && hours < 7;
    }
    
    if (achievementId === 'night_owl') {
      // Night Owl: 12 AM - 4 AM
      return hours >= 0 && hours < 4;
    }
    
    return true;
  }

  // Get unseen unlocked achievements
  async getUnseenAchievements(userId: string): Promise<string[]> {
    try {
      const response = await apiService.getUnseenAchievements(userId) as any;
      
      if (response?.success && response?.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting unseen achievements:', error);
      return [];
    }
  }

  // Get completion percentage
  async getCompletionPercentage(userId: string): Promise<number> {
    try {
      const response = await apiService.getCompletionPercentage(userId) as any;
      
      if (response?.success && response?.data?.percentage !== undefined) {
        return response.data.percentage;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting completion percentage:', error);
      return 0;
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
