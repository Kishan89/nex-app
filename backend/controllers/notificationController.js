const { prisma } = require('../config/database'); 
const { formatTimeAgo, getNotificationAction } = require('../utils/helpers'); 

const getNotificationsByUserId = async (req, res) => {
    try {
        // Get userId from authenticated user or params
        const userId = req.user?.userId || req.params.userId;
        const { limit = 20, offset = 0 } = req.query;
        
        if (!userId) {
            console.error('❌ Missing userId in notification request');
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        console.log(`📋 Fetching notifications for user: ${userId}`);
        
        try {
            // 🚀 OPTIMIZED QUERY: Use the optimized service method
            const notifications = await prisma.notification.findMany({
                where: { 
                    userId: userId 
                },
                select: {
                    id: true,
                    type: true,
                    message: true,
                    read: true,
                    createdAt: true,
                    postId: true,
                    fromUserId: true,
                    fromUser: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        }
                    },
                    post: {
                        select: {
                            id: true,
                            content: true,
                            imageUrl: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            });
            
            console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
            
            // 🚀 FAST TRANSFORMATION: Optimized processing
            const transformedNotifications = notifications.map(notification => ({
                id: notification.id,
                type: notification.type?.toLowerCase() || 'unknown',
                user: notification.fromUser?.username || 'System',
                userId: notification.fromUser?.id,
                userAvatar: notification.fromUser?.avatar,
                action: getNotificationAction(notification.type),
                message: notification.message || '',
                postId: notification.postId,
                postContent: notification.post?.content,
                postImage: notification.post?.imageUrl,
                read: notification.read || false,
                time: formatTimeAgo(notification.createdAt),
                createdAt: notification.createdAt
            }));

            // 🚀 INSTANT RESPONSE: Send notifications immediately
            res.set({
                'Cache-Control': 'private, max-age=60', // Cache for 1 minute
                'ETag': `"notifications-${userId}-${notifications.length}"`,
            });
            res.status(200).json(transformedNotifications);

            // 🔄 BACKGROUND PROCESSING: Mark as read in background
            setImmediate(async () => {
                try {
                    await prisma.notification.updateMany({
                        where: { 
                            userId: userId,
                            read: false
                        },
                        data: { 
                            read: true 
                        }
                    });
                    console.log(`✅ Background: Marked notifications as read for user ${userId}`);
                } catch (markError) {
                    console.error('⚠️ Background error marking notifications as read:', markError);
                }
            });

        } catch (dbError) {
            console.error(`❌ Database error fetching notifications for user ${userId}:`, dbError);
            return res.status(500).json({ message: 'Database error while fetching notifications' });
        }
    } catch (error) {
        console.error('❌ Unexpected error in notification controller:', error);
        return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

module.exports = {
    getNotificationsByUserId
};