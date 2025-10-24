// Test script to manually mark notifications as read
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMarkAsRead() {
  try {
    const userId = 'cmgwkrmg50000m01t4lz6ib9v'; // So_Na user ID
    
    console.log('🔍 Before marking as read:');
    
    // Check before
    const beforeCount = await prisma.notification.count({
      where: {
        userId: userId,
        read: false,
        type: {
          in: ['LIKE', 'COMMENT', 'FOLLOW']
        }
      }
    });
    
    console.log(`📊 Unread notifications before: ${beforeCount}`);
    
    // Mark as read
    const result = await prisma.notification.updateMany({
      where: {
        userId: userId,
        read: false,
        type: {
          in: ['LIKE', 'COMMENT', 'FOLLOW']
        }
      },
      data: {
        read: true
      }
    });
    
    console.log(`✅ Marked ${result.count} notifications as read`);
    
    // Check after
    const afterCount = await prisma.notification.count({
      where: {
        userId: userId,
        read: false,
        type: {
          in: ['LIKE', 'COMMENT', 'FOLLOW']
        }
      }
    });
    
    console.log(`📊 Unread notifications after: ${afterCount}`);
    
    // Show updated notifications
    const updatedNotifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        type: {
          in: ['LIKE', 'COMMENT', 'FOLLOW']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        read: true,
        message: true,
        createdAt: true
      }
    });
    
    console.log(`📝 Updated notifications:`);
    updatedNotifications.forEach(notif => {
      console.log(`  - ${notif.type} (${notif.read ? 'read' : 'unread'}) - ${notif.message}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMarkAsRead();
