// Script to check notification status in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    console.log('🔍 Checking notification status in database...');
    
    // Get all users with their notification counts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true
      }
    });
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.username} (${user.email})`);
      
      // Count total notifications
      const totalNotifications = await prisma.notification.count({
        where: { userId: user.id }
      });
      
      // Count unread notifications
      const unreadNotifications = await prisma.notification.count({
        where: { 
          userId: user.id,
          read: false
        }
      });
      
      // Count unread like/comment/follow notifications
      const unreadAllowedNotifications = await prisma.notification.count({
        where: { 
          userId: user.id,
          read: false,
          type: {
            in: ['LIKE', 'COMMENT', 'FOLLOW']
          }
        }
      });
      
      // Count unread message notifications
      const unreadMessageNotifications = await prisma.notification.count({
        where: { 
          userId: user.id,
          read: false,
          type: 'MESSAGE'
        }
      });
      
      console.log(`  📊 Total notifications: ${totalNotifications}`);
      console.log(`  📊 Unread notifications: ${unreadNotifications}`);
      console.log(`  📊 Unread like/comment/follow: ${unreadAllowedNotifications}`);
      console.log(`  📊 Unread message: ${unreadMessageNotifications}`);
      
      // Show recent notifications
      const recentNotifications = await prisma.notification.findMany({
        where: { userId: user.id },
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
      
      console.log(`  📝 Recent notifications:`);
      recentNotifications.forEach(notif => {
        console.log(`    - ${notif.type} (${notif.read ? 'read' : 'unread'}) - ${notif.message} - ${notif.createdAt.toISOString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkNotifications();
