// Test script for achievement system
const { prisma } = require('./config/database');
const achievementService = require('./services/achievementService');

async function testAchievements() {
  console.log('🧪 Testing Achievement System\n');
  
  try {
    // 1. Seed achievements
    console.log('1️⃣ Seeding achievements...');
    await achievementService.seedAchievements();
    console.log('✅ Achievements seeded\n');
    
    // 2. Get all definitions
    console.log('2️⃣ Getting achievement definitions...');
    const definitions = await achievementService.getAchievementDefinitions();
    console.log(`✅ Found ${definitions.length} achievement definitions\n`);
    
    // 3. Test with a user (replace with your test user ID)
    const testUserId = process.argv[2];
    
    if (!testUserId) {
      console.log('⚠️  No user ID provided. Usage: node test-achievements.js <userId>');
      console.log('📝 Skipping user-specific tests\n');
      return;
    }
    
    console.log(`3️⃣ Testing with user: ${testUserId}\n`);
    
    // 4. Get user stats
    console.log('4️⃣ Getting user stats...');
    const stats = await achievementService.getUserStats(testUserId);
    console.log('📊 User Stats:', JSON.stringify(stats, null, 2));
    console.log('');
    
    // 5. Get user achievements
    console.log('5️⃣ Getting user achievements...');
    const achievements = await achievementService.getUserAchievements(testUserId);
    console.log('🏆 User Achievements:', JSON.stringify(achievements, null, 2));
    console.log('');
    
    // 6. Get unseen achievements
    console.log('6️⃣ Getting unseen achievements...');
    const unseen = await achievementService.getUnseenAchievements(testUserId);
    console.log('👀 Unseen Achievements:', unseen);
    console.log('');
    
    // 7. Get completion percentage
    console.log('7️⃣ Getting completion percentage...');
    const percentage = await achievementService.getCompletionPercentage(testUserId);
    console.log(`📈 Completion: ${percentage}%`);
    console.log('');
    
    // 8. Summary
    console.log('📋 SUMMARY');
    console.log('─'.repeat(50));
    console.log(`Total Achievements: ${definitions.length}`);
    console.log(`User Posts: ${stats.totalPosts}`);
    console.log(`User Likes Received: ${stats.totalLikesReceived}`);
    console.log(`Current Streak: ${stats.currentStreak} days`);
    console.log(`Longest Streak: ${stats.longestStreak} days`);
    console.log(`Unseen Achievements: ${unseen.length}`);
    console.log(`Completion: ${percentage}%`);
    console.log('─'.repeat(50));
    
    if (unseen.length > 0) {
      console.log('\n🎉 UNSEEN ACHIEVEMENTS (Should show popup):');
      unseen.forEach(id => {
        const def = definitions.find(d => d.achievementId === id);
        if (def) {
          console.log(`  ${def.icon} ${def.title} - ${def.description}`);
        }
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testAchievements();
