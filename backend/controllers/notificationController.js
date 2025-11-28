const { prisma } = require('../config/database'); 
const { formatTimeAgo, getNotificationAction } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError } = require('../utils/errors');
const oneSignalService = require('../services/oneSignalService');

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
                    // Include warning notifications
                    type: {
                        in: ['LIKE', 'COMMENT', 'FOLLOW', 'WARNING']
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
                                in: ['LIKE', 'COMMENT', 'FOLLOW', 'WARNING']
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
                    in: ['LIKE', 'COMMENT', 'FOLLOW', 'WARNING']
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

/**
 * Send broadcast notification to all users
 * Admin only endpoint
 */
const sendBroadcastNotification = async (req, res) => {
    try {
        const { title, message, data, imageUrl, url } = req.body;
        
        if (!title || !message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'Title and message are required' 
            });
        }

        logger.info('Sending broadcast notification:', { title, message });

        const result = await oneSignalService.sendBroadcastNotification({
            title,
            message,
            data,
            imageUrl,
            url
        });

        logger.info('Broadcast notification sent successfully:', result);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Broadcast notification sent successfully',
            notificationId: result.notificationId,
            recipients: result.recipients
        });

    } catch (error) {
        logger.error('Error sending broadcast notification:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: 'Failed to send broadcast notification',
            error: error.message 
        });
    }
};

/**
 * Send notification to specific users
 * Admin only endpoint
 */
const sendToSpecificUsers = async (req, res) => {
    try {
        const { userIds, title, message, data, imageUrl, url } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'userIds array is required' 
            });
        }

        if (!title || !message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'Title and message are required' 
            });
        }

        logger.info('Sending notification to specific users:', { userIds, title, message });

        const result = await oneSignalService.sendToSpecificUsers(userIds, {
            title,
            message,
            data,
            imageUrl,
            url
        });

        logger.info('Notification sent to specific users successfully:', result);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Notification sent successfully',
            notificationId: result.notificationId,
            recipients: result.recipients
        });

    } catch (error) {
        logger.error('Error sending notification to specific users:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: 'Failed to send notification',
            error: error.message 
        });
    }
};

/**
 * Send notification to users matching specific tags/filters
 * Admin only endpoint
 */
const sendToSegment = async (req, res) => {
    try {
        const { filters, title, message, data, imageUrl, url } = req.body;
        
        if (!filters || !Array.isArray(filters) || filters.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'filters array is required' 
            });
        }

        if (!title || !message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'Title and message are required' 
            });
        }

        logger.info('Sending notification to segment:', { filters, title, message });

        const result = await oneSignalService.sendToSegment(filters, {
            title,
            message,
            data,
            imageUrl,
            url
        });

        logger.info('Notification sent to segment successfully:', result);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Notification sent successfully',
            notificationId: result.notificationId,
            recipients: result.recipients
        });

    } catch (error) {
        logger.error('Error sending notification to segment:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: 'Failed to send notification',
            error: error.message 
        });
    }
};

/**
 * Send warning notification to specific users
 * Admin only endpoint
 */
const sendWarningNotification = async (req, res) => {
    try {
        const { userIds, message, title } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'userIds array is required' 
            });
        }

        if (!message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'Warning message is required' 
            });
        }

        logger.info('Sending warning notification to users:', { userIds, message });

        // Create warning notifications in database
        const notifications = await Promise.all(
            userIds.map(userId => 
                prisma.notification.create({
                    data: {
                        userId: userId,
                        type: 'WARNING',
                        message: message,
                        read: false
                    }
                })
            )
        );

        // Also send push notifications if oneSignalService exists
        try {
            const result = await oneSignalService.sendToSpecificUsers(userIds, {
                title: title || '⚠️ Warning',
                message: message,
                data: { type: 'warning' }
            });
            logger.info('Push notifications sent:', result);
        } catch (pushError) {
            logger.error('Error sending push notifications:', pushError);
            // Continue even if push fails
        }

        logger.info('Warning notifications created successfully:', notifications.length);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Warning notifications sent successfully',
            count: notifications.length
        });

    } catch (error) {
        logger.error('Error sending warning notifications:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: 'Failed to send warning notifications',
            error: error.message 
        });
    }
};

module.exports = {
    getNotificationsByUserId,
    markNotificationsAsRead,
    sendBroadcastNotification,
    sendToSpecificUsers,
    sendToSegment,
    sendWarningNotification
};