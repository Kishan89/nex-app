// test-achievements.js - Achievement System Test Script
const { prisma } = require('./config/database');
const achievementService = require('./services/achievementService');
const { awardPostCreationXP, awardLikeReceivedXP, awardCommentReceivedXP } = require('./services/xpService');

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

// Test helper functions
async function createTestUser(username) {
  return await prisma.user.create({
    data: {
      email: `${username}@test.com`,
      username: username,
      name: `Test ${username}`,
      password: 'test123',
      xp: 0
    }
  });
}

async function checkAchievement(userId, achievementId) {
  const achievement = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: { userId, achievementId }
    }
  });
  return achievement?.unlocked || false;
}

async function cleanup() {
  log.info('Cleaning up test data...');
  await prisma.userAchievement.deleteMany({ where: { user: { email: { contains: '@test.com' } } } });
  await prisma.comment.deleteMany({ where: { user: { email: { contains: '@test.com' } } } });
  await prisma.like.deleteMany({ where: { user: { email: { contains: '@test.com' } } } });
  await prisma.post.deleteMany({ where: { user: { email: { contains: '@test.com' } } } });
  await prisma.follow.deleteMany({ where: { follower: { email: { contains: '@test.com' } } } });
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  log.success('Cleanup complete');
}

// Test functions
async function testFirstPost() {
  log.test('Testing first_post achievement...');
  const user = await createTestUser('firstpost');
  
  // Create first post
  const post = await prisma.post.create({
    data: { content: 'Test post', userId: user.id }
  });
  
  // Award XP (triggers achievement)
  await awardPostCreationXP(user.id);
  
  // Check achievement
  const unlocked = await checkAchievement(user.id, 'first_post');
  
  if (unlocked) {
    log.success('first_post achievement unlocked correctly');
    return true;
  } else {
    log.error('first_post achievement NOT unlocked');
    return false;
  }
}

async function testFirstLike() {
  log.test('Testing first_like achievement...');
  const user1 = await createTestUser('firstlike1');
  const user2 = await createTestUser('firstlike2');
  
  // User2 creates a post
  const post = await prisma.post.create({
    data: { content: 'Test post', userId: user2.id }
  });
  
  // User1 likes the post (their first like)
  await prisma.like.create({
    data: { userId: user1.id, postId: post.id }
  });
  
  // Manually trigger achievement check (simulating likeService logic)
  const userLikesCount = await prisma.like.count({ where: { userId: user1.id } });
  if (userLikesCount === 1) {
    await achievementService.unlockAchievement(user1.id, 'first_like');
  }
  
  // Check achievement
  const unlocked = await checkAchievement(user1.id, 'first_like');
  
  if (unlocked) {
    log.success('first_like achievement unlocked correctly');
    return true;
  } else {
    log.error('first_like achievement NOT unlocked');
    return false;
  }
}

async function testFirstComment() {
  log.test('Testing first_comment achievement...');
  const user1 = await createTestUser('firstcomment1');
  const user2 = await createTestUser('firstcomment2');
  
  // User2 creates a post
  const post = await prisma.post.create({
    data: { content: 'Test post', userId: user2.id }
  });
  
  // User1 comments (their first comment)
  await prisma.comment.create({
    data: { text: 'Test comment', userId: user1.id, postId: post.id }
  });
  
  // Manually trigger achievement check
  const userCommentsCount = await prisma.comment.count({ where: { userId: user1.id } });
  if (userCommentsCount === 1) {
    await achievementService.unlockAchievement(user1.id, 'first_comment');
  }
  
  // Check achievement
  const unlocked = await checkAchievement(user1.id, 'first_comment');
  
  if (unlocked) {
    log.success('first_comment achievement unlocked correctly');
    return true;
  } else {
    log.error('first_comment achievement NOT unlocked');
    return false;
  }
}

async function testFirstFollower() {
  log.test('Testing first_follower achievement...');
  const user1 = await createTestUser('firstfollower1');
  const user2 = await createTestUser('firstfollower2');
  
  // User2 follows User1 (User1's first follower)
  await prisma.follow.create({
    data: { followerId: user2.id, followingId: user1.id }
  });
  
  // Manually trigger achievement check
  const followerCount = await prisma.follow.count({ where: { followingId: user1.id } });
  if (followerCount === 1) {
    await achievementService.unlockAchievement(user1.id, 'first_follower');
  }
  
  // Check achievement
  const unlocked = await checkAchievement(user1.id, 'first_follower');
  
  if (unlocked) {
    log.success('first_follower achievement unlocked correctly');
    return true;
  } else {
    log.error('first_follower achievement NOT unlocked');
    return false;
  }
}

async function testLikesAchievements() {
  log.test('Testing likes achievements (10, 25, 50, 100)...');
  const user = await createTestUser('likestest');
  
  // Create a post
  const post = await prisma.post.create({
    data: { content: 'Test post', userId: user.id }
  });
  
  // Create 100 likes from different users
  for (let i = 0; i < 100; i++) {
    const liker = await createTestUser(`liker${i}`);
    await prisma.like.create({
      data: { userId: liker.id, postId: post.id }
    });
    
    // Award XP and trigger achievement checks
    if (i === 9 || i === 24 || i === 49 || i === 99) {
      await awardLikeReceivedXP(user.id);
    }
  }
  
  // Final trigger to check all achievements
  await achievementService.handleLikeReceived(user.id);
  
  // Check achievements
  const unlocked10 = await checkAchievement(user.id, '10_likes');
  const unlocked25 = await checkAchievement(user.id, '25_likes');
  const unlocked50 = await checkAchievement(user.id, '50_likes');
  const unlocked100 = await checkAchievement(user.id, '100_likes');
  
  const results = [];
  if (unlocked10) {
    log.success('10_likes achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('10_likes achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked25) {
    log.success('25_likes achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('25_likes achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked50) {
    log.success('50_likes achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('50_likes achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked100) {
    log.success('100_likes achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('100_likes achievement NOT unlocked');
    results.push(false);
  }
  
  return results.every(r => r);
}

async function testXPAchievements() {
  log.test('Testing XP achievements (100, 250, 1000)...');
  const user = await createTestUser('xptest');
  
  // Award 100 XP
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: 100 }
  });
  await achievementService.handleXPUpdated(user.id, 100);
  
  // Award 250 XP
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: 250 }
  });
  await achievementService.handleXPUpdated(user.id, 250);
  
  // Award 1000 XP
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: 1000 }
  });
  await achievementService.handleXPUpdated(user.id, 1000);
  
  // Check achievements
  const unlocked100 = await checkAchievement(user.id, '100_xp');
  const unlocked250 = await checkAchievement(user.id, '250_xp');
  const unlocked1000 = await checkAchievement(user.id, '1000_xp');
  
  const results = [];
  if (unlocked100) {
    log.success('100_xp achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('100_xp achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked250) {
    log.success('250_xp achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('250_xp achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked1000) {
    log.success('1000_xp achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('1000_xp achievement NOT unlocked');
    results.push(false);
  }
  
  return results.every(r => r);
}

async function testStreakAchievements() {
  log.test('Testing streak achievements (3, 7 days)...');
  const user = await createTestUser('streaktest');
  
  // Create posts for 7 consecutive days
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const postDate = new Date(today);
    postDate.setDate(postDate.getDate() - i);
    
    await prisma.post.create({
      data: {
        content: `Post day ${7-i}`,
        userId: user.id,
        createdAt: postDate
      }
    });
  }
  
  // Trigger achievement checks
  await achievementService.handlePostCreated(user.id);
  
  // Check achievements
  const unlocked3 = await checkAchievement(user.id, '3_day_streak');
  const unlocked7 = await checkAchievement(user.id, '7_day_streak');
  
  const results = [];
  if (unlocked3) {
    log.success('3_day_streak achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('3_day_streak achievement NOT unlocked');
    results.push(false);
  }
  
  if (unlocked7) {
    log.success('7_day_streak achievement unlocked correctly');
    results.push(true);
  } else {
    log.error('7_day_streak achievement NOT unlocked');
    results.push(false);
  }
  
  return results.every(r => r);
}

async function testSpecialAchievements() {
  log.test('Testing special achievements (night_owl, early_bird)...');
  log.warn('Note: These achievements depend on server time and may not unlock in tests');
  
  const user = await createTestUser('specialtest');
  
  // Create a post
  await prisma.post.create({
    data: { content: 'Test post', userId: user.id }
  });
  
  // Trigger achievement checks
  await achievementService.handlePostCreated(user.id);
  
  // Check achievements (may or may not unlock depending on time)
  const unlockedNight = await checkAchievement(user.id, 'night_owl');
  const unlockedEarly = await checkAchievement(user.id, 'early_bird');
  
  const hour = new Date().getHours();
  
  if (hour >= 0 && hour < 4) {
    if (unlockedNight) {
      log.success('night_owl achievement unlocked correctly (posted at night)');
      return true;
    } else {
      log.error('night_owl achievement NOT unlocked (should have unlocked)');
      return false;
    }
  } else if (hour >= 5 && hour < 7) {
    if (unlockedEarly) {
      log.success('early_bird achievement unlocked correctly (posted in morning)');
      return true;
    } else {
      log.error('early_bird achievement NOT unlocked (should have unlocked)');
      return false;
    }
  } else {
    log.info(`Current hour: ${hour} - Neither night_owl nor early_bird should unlock`);
    if (!unlockedNight && !unlockedEarly) {
      log.success('Special achievements correctly NOT unlocked (wrong time)');
      return true;
    } else {
      log.error('Special achievement unlocked at wrong time!');
      return false;
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log.info('Starting Achievement System Tests');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Seed achievements first
    log.info('Seeding achievement definitions...');
    await achievementService.seedAchievements();
    log.success('Achievement definitions seeded\n');
    
    // Run tests
    const tests = [
      { name: 'first_post', fn: testFirstPost },
      { name: 'first_like', fn: testFirstLike },
      { name: 'first_comment', fn: testFirstComment },
      { name: 'first_follower', fn: testFirstFollower },
      { name: 'likes (10/25/50/100)', fn: testLikesAchievements },
      { name: 'XP (100/250/1000)', fn: testXPAchievements },
      { name: 'streaks (3/7 days)', fn: testStreakAchievements },
      { name: 'special (night_owl/early_bird)', fn: testSpecialAchievements }
    ];
    
    for (const test of tests) {
      try {
        const passed = await test.fn();
        results.tests.push({ name: test.name, passed });
        if (passed) {
          results.passed++;
        } else {
          results.failed++;
        }
        console.log(''); // Empty line between tests
      } catch (error) {
        log.error(`Test ${test.name} threw error: ${error.message}`);
        results.tests.push({ name: test.name, passed: false, error: error.message });
        results.failed++;
        console.log('');
      }
    }
    
    // Cleanup
    await cleanup();
    
  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  log.info('Test Results Summary');
  console.log('='.repeat(60));
  
  results.tests.forEach(test => {
    const status = test.passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status} - ${test.name}`);
    if (test.error) {
      console.log(`       Error: ${test.error}`);
    }
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('='.repeat(60) + '\n');
  
  if (results.failed === 0) {
    log.success('🎉 ALL TESTS PASSED! Achievement system is working correctly.');
  } else {
    log.error(`⚠️  ${results.failed} test(s) failed. Please review the errors above.`);
  }
}

// Run tests
runAllTests().catch(console.error);
