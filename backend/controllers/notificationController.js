const { prisma } = require('../config/database'); 
const { formatTimeAgo, getNotificationAction } = require('../utils/helpers'); 

const getNotificationsByUserId = async (req, res) => {
    try {
        // Get userId from authenticated user or params
        const userId = req.user?.userId || req.params.userId;
        
        if (!userId) {
            console.error('❌ Missing userId in notification request');
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        console.log(`📋 Fetching notifications for user: ${userId}`);
        
        try {
            const notifications = await prisma.notification.findMany({
                where: { 
                    userId: userId 
                },
                include: {
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
                }
            });
            
            console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
            
            // Safely transform notifications with null checks
            const transformedNotifications = notifications.map(notification => {
                try {
                    return {
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
                    };
                } catch (transformError) {
                    console.error('❌ Error transforming notification:', transformError, notification);
                    // Return a minimal valid notification object if transformation fails
                    return {
                        id: notification.id || 'unknown',
                        type: 'unknown',
                        user: 'System',
                        message: 'Notification details unavailable',
                        read: false,
                        time: 'recently',
                        createdAt: new Date()
                    };
                }
            });

            // Mark notifications as read
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
                console.log(`✅ Marked notifications as read for user ${userId}`);
            } catch (markError) {
                console.error('⚠️ Error marking notifications as read:', markError);
                // Continue despite error marking as read
            }

            return res.status(200).json(transformedNotifications);
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