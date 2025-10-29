const { prisma } = require('../config/database'); 
const { formatTimeAgo, getNotificationAction } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError } = require('../utils/errors');

const logger = createLogger('NotificationController');

const getNotificationsByUserId = async (req, res) => {
    try {
        // Get userId from authenticated user or params
        const userId = req.user?.userId || req.params.userId;
        const { limit = 20, offset = 0 } = req.query;
        
        if (!userId) {
            throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
        }
        
        logger.debug(`Fetching notifications for user: ${userId}`);
        
        // First check all notifications for this user
        const allNotifications = await prisma.notification.findMany({
            where: {
                userId: userId
            },
            select: {
                id: true,
                type: true,
                read: true,
                message: true,
                createdAt: true
            }
        });
        logger.debug(`All notifications for user ${userId}:`, allNotifications);
        
        try {
            const notifications = await prisma.notification.findMany({
                where: { 
                    userId: userId,
                    // Only include like, comment, follow notifications
                    type: {
                        in: ['LIKE', 'COMMENT', 'FOLLOW']
                    }
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
            
            logger.debug(`Found ${notifications.length} notifications for user ${userId}`);
            
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

            res.set({
                'Cache-Control': 'private, max-age=60',
                'ETag': `"notifications-${userId}-${notifications.length}"`,
            });
            res.status(HTTP_STATUS.OK).json(transformedNotifications);

            setImmediate(async () => {
                try {
                    await prisma.notification.updateMany({
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
                    logger.debug(`Marked like/comment/follow notifications as read for user ${userId}`);
                } catch (markError) {
                    logger.error('Background error marking notifications as read:', markError);
                }
            });

        } catch (dbError) {
            logger.error(`Database error fetching notifications for user ${userId}:`, dbError);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Database error while fetching notifications' });
        }
    } catch (error) {
        logger.error('Unexpected error in notification controller:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to fetch notifications' });
    }
};

// Mark notifications as read for a user
const markNotificationsAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            throw new BadRequestError(ERROR_MESSAGES.USER_ID_REQUIRED);
        }

        logger.debug(`Marking notifications as read for user: ${userId}`);

        const existingNotifications = await prisma.notification.findMany({
            where: {
                userId: userId,
                read: false,
                type: {
                    in: ['LIKE', 'COMMENT', 'FOLLOW']
                }
            },
            select: {
                id: true,
                type: true,
                read: true,
                createdAt: true
            }
        });

        logger.debug(`Found ${existingNotifications.length} unread notifications for user ${userId}`);

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

        logger.info(`Marked ${result.count} notifications as read for user ${userId}`);

        const remainingUnread = await prisma.notification.count({
            where: {
                userId: userId,
                read: false,
                type: {
                    in: ['LIKE', 'COMMENT', 'FOLLOW']
                }
            }
        });

        logger.debug(`Remaining unread notifications for user ${userId}: ${remainingUnread}`);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Notifications marked as read successfully',
            count: result.count,
            remainingUnread: remainingUnread
        });

    } catch (error) {
        logger.error('Error marking notifications as read:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to mark notifications as read' });
    }
};

module.exports = {
    getNotificationsByUserId,
    markNotificationsAsRead
};