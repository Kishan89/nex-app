const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNotificationDates() {
    try {
        console.log('🔧 Fixing future notification dates...');
        
        // Find all notifications with future dates
        const futureNotifications = await prisma.notification.findMany({
            where: {
                createdAt: {
                    gt: new Date()
                }
            }
        });
        
        console.log(`Found ${futureNotifications.length} notifications with future dates`);
        
        // Update each notification to current time
        for (const notification of futureNotifications) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: { createdAt: new Date() }
            });
        }
        
        console.log('✅ All notification dates fixed!');
    } catch (error) {
        console.error('❌ Error fixing dates:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixNotificationDates();
