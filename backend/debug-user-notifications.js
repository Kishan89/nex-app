const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserNotifications() {
  const userId = 'cmgvqehym0000im2by5nursh7'; // Your user ID from logs
  console.log('🔍 Checking notifications for user:', userId);
  
  const notifications = await prisma.notification.findMany({
    where: {
      userId: userId,
      type: {
        in: ['LIKE', 'COMMENT', 'FOLLOW']
      }
    },
    select: {
      id: true,
      type: true,
      read: true,
      message: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });
  
  console.log('📊 Recent notifications:');
  notifications.forEach(notif => {
    console.log(`- ${notif.type} (${notif.read ? 'read' : 'unread'}) - ${notif.message} - ${notif.createdAt}`);
  });
  
  await prisma.$disconnect();
}

checkUserNotifications().catch(console.error);
