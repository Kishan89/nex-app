// test-achievements.js - Test all achievements without frontend
const { prisma } = require('./config/database');
const achievementService = require('./services/achievementService');
const xpService = require('./services/xpService');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Test user ID - replace with actual user ID from your database
let TEST_USER_ID = null;

async function setup() {
  log.info('Setting up test environment...');
  
  // Get first user from database
  const user = await prisma.user.findFirst({
    select: { id: true, username: true, xp: true }
  });
  
  if (!user) {
    log.error('No users found in database. Please create a user first.');
    process.exit(1);
  }
  
  TEST_USER_ID = user.id;
  log.success(`Using test user: ${user.username} (ID: ${TEST_USER_ID})`);
  log.info(`Current XP: ${user.xp || 0}`);
  console.log('');
}

async function testFirstPostAchievement() {
  log.test('Testing First Post Achievement...');
  
  try {
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    log.info(`User has ${stats.totalPosts} posts`);
    
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    const firstPost = achievements['first_post'];
    
    if (stats.totalPosts >= 1) {
      if (firstPost && firstPost.unlocked) {
        log.success('First Post achievement is unlocked ✓');
      } else {
        log.warn('User has posts but achievement not unlocked - triggering...');
        await achievementService.handlePostCreated(TEST_USER_ID);
        const updated = await achievementService.getUserAchievements(TEST_USER_ID);
        if (updated['first_post']?.unlocked) {
          log.success('First Post achievement unlocked successfully ✓');
        } else {
          log.error('Failed to unlock First Post achievement');
        }
      }
    } else {
      log.info('User has no posts - achievement locked (expected)');
    }
  } catch (error) {
    log.error(`First Post test failed: ${error.message}`);
  }
  console.log('');
}

async function testLikeAchievements() {
  log.test('Testing Like Achievements (10, 25, 50, 100)...');
  
  try {
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    log.info(`User has received ${stats.totalLikesReceived} likes`);
    
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    
    const likeAchievements = [
      { id: '10_likes', threshold: 10, name: 'Rising Star' },
      { id: '25_likes', threshold: 25, name: 'Popular Creator' },
      { id: '50_likes', threshold: 50, name: 'Influencer' },
      { id: '100_likes', threshold: 100, name: 'Social Star' }
    ];
    
    for (const ach of likeAchievements) {
      const achievement = achievements[ach.id];
      const progress = achievement?.progress || 0;
      
      if (stats.totalLikesReceived >= ach.threshold) {
        if (achievement?.unlocked) {
          log.success(`${ach.name} (${ach.threshold} likes) - UNLOCKED ✓`);
        } else {
          log.warn(`${ach.name} - Should be unlocked, triggering...`);
          await achievementService.handleLikeReceived(TEST_USER_ID);
        }
      } else {
        log.info(`${ach.name} - Progress: ${progress}/${ach.threshold}`);
      }
    }
  } catch (error) {
    log.error(`Like achievements test failed: ${error.message}`);
  }
  console.log('');
}

async function testXPAchievements() {
  log.test('Testing XP Achievements (100, 250, 1000)...');
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { xp: true }
    });
    const currentXP = user?.xp || 0;
    log.info(`User has ${currentXP} XP`);
    
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    
    const xpAchievements = [
      { id: '100_xp', threshold: 100, name: 'Learning Fast' },
      { id: '250_xp', threshold: 250, name: 'Expert' },
      { id: '1000_xp', threshold: 1000, name: 'Master' }
    ];
    
    for (const ach of xpAchievements) {
      const achievement = achievements[ach.id];
      const progress = achievement?.progress || 0;
      
      if (currentXP >= ach.threshold) {
        if (achievement?.unlocked) {
          log.success(`${ach.name} (${ach.threshold} XP) - UNLOCKED ✓`);
        } else {
          log.warn(`${ach.name} - Should be unlocked, triggering...`);
          await achievementService.handleXPUpdated(TEST_USER_ID, currentXP);
        }
      } else {
        log.info(`${ach.name} - Progress: ${progress}/${ach.threshold} XP`);
      }
    }
  } catch (error) {
    log.error(`XP achievements test failed: ${error.message}`);
  }
  console.log('');
}

async function testStreakAchievements() {
  log.test('Testing Streak Achievements (3, 7, 60 days)...');
  
  try {
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    log.info(`Current streak: ${stats.currentStreak} days`);
    log.info(`Longest streak: ${stats.longestStreak} days`);
    
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    
    const streakAchievements = [
      { id: '3_day_streak', threshold: 3, name: 'Consistent' },
      { id: '7_day_streak', threshold: 7, name: 'Dedicated' },
      { id: '60_day_streak', threshold: 60, name: 'Unstoppable' }
    ];
    
    for (const ach of streakAchievements) {
      const achievement = achievements[ach.id];
      const progress = achievement?.progress || 0;
      
      if (stats.currentStreak >= ach.threshold) {
        if (achievement?.unlocked) {
          log.success(`${ach.name} (${ach.threshold} days) - UNLOCKED ✓`);
        } else {
          log.warn(`${ach.name} - Should be unlocked, triggering...`);
          await achievementService.handlePostCreated(TEST_USER_ID);
        }
      } else {
        log.info(`${ach.name} - Progress: ${progress}/${ach.threshold} days`);
      }
    }
  } catch (error) {
    log.error(`Streak achievements test failed: ${error.message}`);
  }
  console.log('');
}

async function testFirstStepsAchievements() {
  log.test('Testing First Steps Achievements...');
  
  try {
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    
    // First Like
    const userLikes = await prisma.like.count({ where: { userId: TEST_USER_ID } });
    const firstLike = achievements['first_like'];
    if (userLikes >= 1) {
      if (firstLike?.unlocked) {
        log.success('First Like - UNLOCKED ✓');
      } else {
        log.warn('User has given likes but achievement not unlocked');
      }
    } else {
      log.info('First Like - Not unlocked (no likes given)');
    }
    
    // First Comment
    const userComments = await prisma.comment.count({ where: { userId: TEST_USER_ID } });
    const firstComment = achievements['first_comment'];
    if (userComments >= 1) {
      if (firstComment?.unlocked) {
        log.success('First Comment - UNLOCKED ✓');
      } else {
        log.warn('User has made comments but achievement not unlocked');
      }
    } else {
      log.info('First Comment - Not unlocked (no comments made)');
    }
    
    // First Follower
    const followerCount = await prisma.follow.count({ where: { followingId: TEST_USER_ID } });
    const firstFollower = achievements['first_follower'];
    if (followerCount >= 1) {
      if (firstFollower?.unlocked) {
        log.success('First Follower - UNLOCKED ✓');
      } else {
        log.warn('User has followers but achievement not unlocked');
      }
    } else {
      log.info('First Follower - Not unlocked (no followers)');
    }
  } catch (error) {
    log.error(`First steps test failed: ${error.message}`);
  }
  console.log('');
}

async function testSpecialAchievements() {
  log.test('Testing Special Achievements (Night Owl, Early Bird)...');
  
  try {
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    
    const nightOwl = achievements['night_owl'];
    const earlyBird = achievements['early_bird'];
    
    if (nightOwl?.unlocked) {
      log.success('Night Owl (12 AM - 4 AM) - UNLOCKED ✓');
    } else {
      log.info('Night Owl - Not unlocked (post between 12 AM - 4 AM to unlock)');
    }
    
    if (earlyBird?.unlocked) {
      log.success('Early Bird (5 AM - 7 AM) - UNLOCKED ✓');
    } else {
      log.info('Early Bird - Not unlocked (post between 5 AM - 7 AM to unlock)');
    }
  } catch (error) {
    log.error(`Special achievements test failed: ${error.message}`);
  }
  console.log('');
}

async function testDuplicateUnlock() {
  log.test('Testing Duplicate Unlock Prevention...');
  
  try {
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    
    if (stats.totalPosts >= 1) {
      // Try to unlock first_post multiple times
      log.info('Attempting to unlock first_post achievement 3 times...');
      
      await achievementService.unlockAchievement(TEST_USER_ID, 'first_post');
      await achievementService.unlockAchievement(TEST_USER_ID, 'first_post');
      await achievementService.unlockAchievement(TEST_USER_ID, 'first_post');
      
      // Check database for duplicates
      const records = await prisma.userAchievement.findMany({
        where: {
          userId: TEST_USER_ID,
          achievementId: 'first_post'
        }
      });
      
      if (records.length === 1) {
        log.success('Duplicate prevention working - only 1 record exists ✓');
      } else {
        log.error(`Found ${records.length} records - duplicates exist!`);
      }
    } else {
      log.info('Skipping duplicate test - user has no posts');
    }
  } catch (error) {
    log.error(`Duplicate test failed: ${error.message}`);
  }
  console.log('');
}

async function showSummary() {
  log.info('=== ACHIEVEMENT SUMMARY ===');
  
  try {
    const achievements = await achievementService.getUserAchievements(TEST_USER_ID);
    const stats = await achievementService.getUserStats(TEST_USER_ID);
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { xp: true }
    });
    
    const unlocked = Object.values(achievements).filter(a => a.unlocked).length;
    const total = Object.keys(achievements).length;
    const percentage = Math.round((unlocked / total) * 100);
    
    console.log('');
    log.info(`Total Achievements: ${unlocked}/${total} (${percentage}%)`);
    log.info(`Current XP: ${user?.xp || 0}`);
    log.info(`Total Posts: ${stats.totalPosts}`);
    log.info(`Total Likes Received: ${stats.totalLikesReceived}`);
    log.info(`Current Streak: ${stats.currentStreak} days`);
    log.info(`Followers: ${stats.totalFollowers}`);
    console.log('');
    
    log.info('Unlocked Achievements:');
    Object.entries(achievements).forEach(([id, data]) => {
      if (data.unlocked) {
        const def = achievementService.ACHIEVEMENT_DEFINITIONS.find(d => d.achievementId === id);
        console.log(`  ${colors.green}✓${colors.reset} ${def?.title || id}`);
      }
    });
    
  } catch (error) {
    log.error(`Summary failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log.info('🧪 ACHIEVEMENT SYSTEM TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  try {
    await setup();
    await testFirstPostAchievement();
    await testLikeAchievements();
    await testXPAchievements();
    await testStreakAchievements();
    await testFirstStepsAchievements();
    await testSpecialAchievements();
    await testDuplicateUnlock();
    await showSummary();
    
    console.log('='.repeat(60));
    log.success('All tests completed!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run tests
runAllTests();
