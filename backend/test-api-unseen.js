// Test unseen achievements API endpoint
const achievementService = require('./services/achievementService');

async function testAPI() {
  try {
    const userId = 'cmih7p90f000gqr0f5ydrrrwc'; // Latest user from check-unseen.js
    
    console.log(`\n🧪 Testing getUnseenAchievements for user: ${userId}`);
    
    const unseen = await achievementService.getUnseenAchievements(userId);
    
    console.log(`\n✅ Result:`, unseen);
    console.log(`📊 Type:`, typeof unseen);
    console.log(`📏 Length:`, unseen.length);
    console.log(`📦 JSON:`, JSON.stringify(unseen));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    const { prisma } = require('./config/database');
    await prisma.$disconnect();
  }
}

testAPI();
