// Quick test to check unseen achievements
const { prisma } = require('./config/database');

async function testUnseen() {
  try {
    // Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`\n✅ Testing for user: ${user.username} (${user.id})\n`);
    
    // Check unseen achievements
    const unseen = await prisma.userAchievement.findMany({
      where: {
        userId: user.id,
        unlocked: true,
        seen: false
      },
      include: {
        achievement: true
      }
    });
    
    console.log(`📊 Found ${unseen.length} unseen achievements:\n`);
    
    unseen.forEach(ua => {
      console.log(`  ✨ ${ua.achievement.title} (${ua.achievementId})`);
      console.log(`     Unlocked: ${ua.unlocked}`);
      console.log(`     Seen: ${ua.seen}`);
      console.log(`     Unlocked At: ${ua.unlockedAt}\n`);
    });
    
    if (unseen.length === 0) {
      console.log('ℹ️  No unseen achievements found\n');
      
      // Show all achievements
      const all = await prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true }
      });
      
      console.log(`📋 All achievements (${all.length}):\n`);
      all.forEach(ua => {
        console.log(`  ${ua.unlocked ? '✅' : '⬜'} ${ua.achievement.title} - Seen: ${ua.seen}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUnseen();
