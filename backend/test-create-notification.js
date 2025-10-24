const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotification() {
  try {
    console.log('🧪 Creating test notification...');
    
    const notification = await prisma.notification.create({
      data: {
        userId: 'cmgvqehym0000im2by5nursh7', // Your user ID
        fromUserId: 'cmgx65f7s000agn1tsw0xg3j3', // Kishan user ID
        type: 'LIKE',
        message: 'Test notification - Kishan liked your post',
        read: false,
        postId: 'cmh4gft3b006hjt0f3qjemzan'
      }
    });
    
    console.log('✅ Test notification created:', {
      id: notification.id,
      type: notification.type,
      read: notification.read,
      message: notification.message,
      createdAt: notification.createdAt
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    await prisma.$disconnect();
  }
}

createTestNotification();
