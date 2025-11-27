// services/achievementService.js
const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AchievementService');

// Achievement Definitions with INCREASED LIMITS
const ACHIEVEMENT_DEFINITIONS = [
  // === FIRST STEPS ===
  {
    achievementId: 'first_post',
    title: 'Welcome Creator!',
    description: 'Create your first post',
    icon: '🎉',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    achievementId: 'first_like',
    title: 'Spreading Love',
    description: 'Like your first post',
    icon: '❤️',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    achievementId: 'first_comment',
    title: 'Join the Conversation',
    description: 'Leave your first comment',
    icon: '💬',
    category: 'first_steps',
    rarity: 'common',
  },
  {
    achievementId: 'first_follower',
    title: 'Growing Network',
    description: 'Get your first follower',
    icon: '👥',
    category: 'first_steps',
    rarity: 'common',
  },
  
  // === ENGAGEMENT MILESTONES (INCREASED) ===
  {
    achievementId: '10_likes',
    title: 'Rising Star',
    description: 'Get 10 likes on your posts',
    icon: '⭐',
    category: 'engagement',
    target: 10,
    rarity: 'common',
  },
  {
    achievementId: '25_likes',
    title: 'Popular Creator',
    description: 'Get 25 likes on your posts',
    icon: '🌟',
    category: 'engagement',
    target: 25,
    rarity: 'common',
  },
  {
    achievementId: '50_likes',
    title: 'Influencer',
    description: 'Get 50 total likes',
    icon: '💎',
    category: 'engagement',
    target: 50,
    rarity: 'rare',
  },
  {
    achievementId: '100_likes',
    title: 'Social Star',
    description: 'Get 100 total likes',
    icon: '🔥',
    category: 'engagement',
    target: 100,
    rarity: 'rare',
  },
  
  // === STREAK ACHIEVEMENTS (60 days max) ===
  {
    achievementId: '3_day_streak',
    title: 'Consistent',
    description: 'Post 3 days in a row',
    icon: '📅',
    category: 'streak',
    target: 3,
    rarity: 'common',
  },
  {
    achievementId: '7_day_streak',
    title: 'Dedicated',
    description: 'Post 7 days in a row',
    icon: '🔥',
    category: 'streak',
    target: 7,
    rarity: 'rare',
  },
  {
    achievementId: '60_day_streak',
    title: 'Unstoppable',
    description: 'Post 60 days in a row',
    icon: '👑',
    category: 'streak',
    target: 60,
    rarity: 'legendary',
  },
  
  // === XP MILESTONES (INCREASED) ===
  {
    achievementId: '100_xp',
    title: 'Learning Fast',
    description: 'Reach 100 XP',
    icon: '📚',
    category: 'xp',
    target: 100,
    rarity: 'common',
  },
  {
    achievementId: '250_xp',
    title: 'Expert',
    description: 'Reach 250 XP',
    icon: '🎓',
    category: 'xp',
    target: 250,
    rarity: 'rare',
  },
  {
    achievementId: '1000_xp',
    title: 'Master',
    description: 'Reach 1000 XP',
    icon: '🏆',
    category: 'xp',
    target: 1000,
    rarity: 'legendary',
  },
  
  // === SPECIAL ACHIEVEMENTS ===
  {
    achievementId: 'night_owl',
    title: 'Night Owl',
    description: 'Post between 12 AM - 4 AM',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
  },
  {
    achievementId: 'early_bird',
    title: 'Early Bird',
    description: 'Post between 5 AM - 7 AM',
    icon: '🐦',
    category: 'special',
    rarity: 'rare',
  },
];

/**
 * Seed achievement definitions into database
 */
const seedAchievements = async () => {
  try {
    logger.info('Seeding achievement definitions...');
    
    for (const achDef of ACHIEVEMENT_DEFINITIONS) {
      await prisma.achievement.upsert({
        where: { achievementId: achDef.achievementId },
        update: achDef,
        create: achDef,
      });
    }
    
    logger.info(`Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievement definitions`);
  } catch (error) {
    logger.error('Error seeding achievements:', error.message);
    throw error;
  }
};

/**
 * Get all achievement definitions
 */
const getAchievementDefinitions = async () => {
  try {
    return await prisma.achievement.findMany({
      orderBy: [
        { category: 'asc' },
        { target: 'asc' }
      ]
    });
  } catch (error) {
    logger.error('Error getting achievement definitions:', error.message);
    throw error;
  }
};

/**
 * Get user's achievements with progress
 */
const getUserAchievements = async (userId) => {
  try {
    // Get all achievement definitions
    const allAchievements = await getAchievementDefinitions();
    
    // Get user's achievement progress
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });
    
    // Create a map for quick lookups
    const userAchMap = {};
    userAchievements.forEach(ua => {
      userAchMap[ua.achievementId] = {
        id: ua.achievementId,
        unlocked: ua.unlocked,
        progress: ua.progress,
        unlockedAt: ua.unlockedAt?.getTime(),
        seen: ua.seen
      };
    });
    
    // Return all achievements with user progress
    const result = {};
    allAchievements.forEach(ach => {
      result[ach.achievementId] = userAchMap[ach.achievementId] || {
        id: ach.achievementId,
        unlocked: false,
        progress: 0,
        seen: false
      };
    });
    
    return result;
  } catch (error) {
    logger.error('Error getting user achievements:', error.message);
    throw error;
  }
};

/**
 * Unlock an achievement for a user
 */
const unlockAchievement = async (userId, achievementId) => {
  try {
    const userAch = await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId
        }
      },
      update: {
        unlocked: true,
        unlockedAt: new Date(),
        seen: false
      },
      create: {
        userId,
        achievementId,
        unlocked: true,
        unlockedAt: new Date(),
        seen: false,
        progress: 0
      }
    });
    
    logger.info(`Achievement unlocked: ${achievementId} for user ${userId}`);
    return userAch;
  } catch (error) {
    logger.error('Error unlocking achievement:', error.message);
    throw error;
  }
};

/**
 * Update achievement progress
 */
const updateProgress = async (userId, achievementId, progress) => {
  try {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId
        }
      },
      update: {
        progress
      },
      create: {
        userId,
        achievementId,
        unlocked: false,
        progress,
        seen: false
      }
    });
  } catch (error) {
    logger.error('Error updating achievement progress:', error.message);
  }
};

/**
 * Mark achievement as seen
 */
const markAsSeen = async (userId, achievementId) => {
  try {
    await prisma.userAchievement.update({
      where: {
        userId_achievementId: {
          userId,
          achievementId
        }
      },
      data: { seen: true }
    });
  } catch (error) {
    logger.error('Error marking achievement as seen:', error.message);
  }
};

/**
 * Get unseen achievements
 */
const getUnseenAchievements = async (userId) => {
  try {
    const unseen = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlocked: true,
        seen: false
      },
      select: { achievementId: true }
    });
    
    return unseen.map(ua => ua.achievementId);
  } catch (error) {
    logger.error('Error getting unseen achievements:', error.message);
    return [];
  }
};

/**
 * Get user stats for achievements
 */
const getUserStats = async (userId) => {
  try {
    // Get post count
    const totalPosts = await prisma.post.count({
      where: { userId }
    });
    
    // Get total likes received
    const totalLikesReceived = await prisma.like.count({
      where: {
        post: { userId }
      }
    });
    
    // Get total comments
    const totalComments = await prisma.comment.count({
      where: { userId }
    });
    
    // Get follower count
    const totalFollowers = await prisma.follow.count({
      where: { followingId: userId }
    });
    
    // Calculate streak (simplified - would need more complex logic for real streaks)
    const recentPosts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60, // Check last 60 days
      select: { createdAt: true }
    });
    
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    let lastDate = null;
    
    for (const post of recentPosts) {
      const postDate = new Date(post.createdAt).toDateString();
      
      if (!lastDate) {
        streak = 1;
        lastDate = postDate;
      } else {
        const dayDiff = Math.floor((new Date(lastDate) - new Date(postDate)) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          streak++;
        } else if (dayDiff > 1) {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
        
        lastDate = postDate;
      }
    }
    
    currentStreak = streak;
    longestStreak = Math.max(longestStreak, streak);
    
    return {
      totalPosts,
      totalLikesReceived,
      totalComments,
      totalFollowers,
      currentStreak,
      longestStreak
    };
  } catch (error) {
    logger.error('Error getting user stats:', error.message);
    return {
      totalPosts: 0,
      totalLikesReceived: 0,
      totalComments: 0,
      totalFollowers: 0,
      currentStreak: 0,
      longestStreak: 0
    };
  }
};

/**
 * Handle post created event - check achievements
 */
const handlePostCreated = async (userId) => {
  try {
    const newlyUnlocked = [];
    const stats = await getUserStats(userId);
    
    // First post
    if (stats.totalPosts === 1) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: 'first_post'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, 'first_post');
        newlyUnlocked.push('first_post');
      }
    }
    
    // Streak achievements
    if (stats.currentStreak >= 3) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: '3_day_streak'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, '3_day_streak');
        newlyUnlocked.push('3_day_streak');
      }
    }
    
    if (stats.currentStreak >= 7) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: '7_day_streak'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, '7_day_streak');
        newlyUnlocked.push('7_day_streak');
      }
    }
    
    if (stats.currentStreak >= 60) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: '60_day_streak'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, '60_day_streak');
        newlyUnlocked.push('60_day_streak');
      }
    }
    
    // Check time-based achievements
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: 'night_owl'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, 'night_owl');
        newlyUnlocked.push('night_owl');
      }
    } else if (hour >= 5 && hour < 7) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: 'early_bird'
          }
        }
      });
      
      if (!existing || !existing.unlocked) {
        await unlockAchievement(userId, 'early_bird');
        newlyUnlocked.push('early_bird');
      }
    }
    
    return newlyUnlocked;
  } catch (error) {
    logger.error('Error handling post created:', error.message);
    return [];
  }
};

/**
 * Handle like received event - check achievements
 */
const handleLikeReceived = async (userId) => {
  try {
    const newlyUnlocked = [];
    const stats = await getUserStats(userId);
    
    // Update progress for all like achievements
    await updateProgress(userId, '10_likes', stats.totalLikesReceived);
    await updateProgress(userId, '25_likes', stats.totalLikesReceived);
    await updateProgress(userId, '50_likes', stats.totalLikesReceived);
    await updateProgress(userId, '100_likes', stats.totalLikesReceived);
    
    // Check and unlock
    const checkAndUnlock = async (achievementId, threshold) => {
      if (stats.totalLikesReceived >= threshold) {
        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId
            }
          }
        });
        
        if (!existing || !existing.unlocked) {
          await unlockAchievement(userId, achievementId);
          newlyUnlocked.push(achievementId);
        }
      }
    };
    
    await checkAndUnlock('10_likes', 10);
    await checkAndUnlock('25_likes', 25);
    await checkAndUnlock('50_likes', 50);
    await checkAndUnlock('100_likes', 100);
    
    return newlyUnlocked;
  } catch (error) {
    logger.error('Error handling like received:', error.message);
    return [];
  }
};

/**
 * Handle XP updated event - check achievements
 */
const handleXPUpdated = async (userId, currentXP) => {
  try {
    const newlyUnlocked = [];
    
    // Update progress
    await updateProgress(userId, '100_xp', currentXP);
    await updateProgress(userId, '250_xp', currentXP);
    await updateProgress(userId, '1000_xp', currentXP);
    
    // Check and unlock
    const checkAndUnlock = async (achievementId, threshold) => {
      if (currentXP >= threshold) {
        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId
            }
          }
        });
        
        if (!existing || !existing.unlocked) {
          await unlockAchievement(userId, achievementId);
          newlyUnlocked.push(achievementId);
        }
      }
    };
    
    await checkAndUnlock('100_xp', 100);
    await checkAndUnlock('250_xp', 250);
    await checkAndUnlock('1000_xp', 1000);
    
    return newlyUnlocked;
  } catch (error) {
    logger.error('Error handling XP updated:', error.message);
    return [];
  }
};

/**
 * Get completion percentage
 */
const getCompletionPercentage = async (userId) => {
  try {
    const total = ACHIEVEMENT_DEFINITIONS.length;
    const unlocked = await prisma.userAchievement.count({
      where: {
        userId,
        unlocked: true
      }
    });
    
    return Math.round((unlocked / total) * 100);
  } catch (error) {
    logger.error('Error getting completion percentage:', error.message);
    return 0;
  }
};

module.exports = {
  seedAchievements,
  getAchievementDefinitions,
  getUserAchievements,
  unlockAchievement,
  updateProgress,
  markAsSeen,
  getUnseenAchievements,
  getUserStats,
  handlePostCreated,
  handleLikeReceived,
  handleXPUpdated,
  getCompletionPercentage,
  ACHIEVEMENT_DEFINITIONS
};
