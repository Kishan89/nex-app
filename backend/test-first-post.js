// Quick test for first post achievement
const { prisma } = require('./config/database');
const achievementService = require('./services/achievementService');

async function testFirstPost() {
  try {
    // Get a user with exactly 1 post
    const users = await prisma.user.findMany({
      include: {
        posts: true
      }
    });
    
    console.log('\n📊 Users with post counts:');
    for (const user of users) {
      console.log(`  - ${user.username}: ${user.posts.length} posts`);
      
      if (user.posts.length === 1) {
        console.log(`\n🎯 Testing with user: ${user.username} (${user.id})`);
        
        // Check current achievement status
        const before = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: user.id,
              achievementId: 'first_post'
            }
          }
        });
        
        console.log('📋 Before:', before);
        
        // Trigger achievement check
        console.log('\n🚀 Calling handlePostCreated...');
        const result = await achievementService.handlePostCreated(user.id);
        console.log('✅ Result:', result);
        
        // Check after
        const after = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: user.id,
              achievementId: 'first_post'
            }
          }
        });
        
        console.log('📋 After:', after);
        
        // Check unseen
        const unseen = await achievementService.getUnseenAchievements(user.id);
        console.log('👀 Unseen achievements:', unseen);
        
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFirstPost();
