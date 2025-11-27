// Check unseen achievements for new user
const { prisma } = require('./config/database');

async function checkUnseen() {
  try {
    // Get latest user
    const latestUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        posts: true,
        achievements: {
          where: {
            unlocked: true,
            seen: false
          }
        }
      }
    });
    
    if (!latestUser) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`\n👤 Latest User: ${latestUser.username} (${latestUser.id})`);
    console.log(`📝 Posts: ${latestUser.posts.length}`);
    console.log(`\n🎯 Unseen Achievements:`);
    
    if (latestUser.achievements.length === 0) {
      console.log('  ❌ No unseen achievements');
    } else {
      latestUser.achievements.forEach(ua => {
        console.log(`  ✅ ${ua.achievementId} - unlocked: ${ua.unlocked}, seen: ${ua.seen}`);
      });
    }
    
    // Also check all achievements for this user
    console.log(`\n📊 All Achievements:`);
    const allAchievements = await prisma.userAchievement.findMany({
      where: { userId: latestUser.id }
    });
    
    allAchievements.forEach(ua => {
      console.log(`  - ${ua.achievementId}: unlocked=${ua.unlocked}, seen=${ua.seen}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnseen();
