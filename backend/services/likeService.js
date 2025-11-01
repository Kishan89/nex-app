// services/likeService.js
const { prisma } = require('../config/database');
const { createNotification } = require('./notificationService');
const { sendPushNotification } = require('./pushNotificationService');
const { sendLikeNotification } = require('./fcmService');
const { supabase } = require('../config/database');
const { awardLikeReceivedXP, removeLikeXP } = require('./xpService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('LikeService');

class LikeService {
  async toggleLike({ postId, userId }) {
    logger.debug('toggleLike called', { postId, userId });

    // Check if the user has already liked the post
    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    logger.debug('Existing like found', { likeId: existingLike?.id });

    if (existingLike) {
      // Get post owner before deleting like
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true }
      });

      // Unlike: delete like and decrement post's like count (but don't go below 0)
      await prisma.$transaction(async (tx) => {
        await tx.like.delete({ where: { id: existingLike.id } });
        
        // Get current post to check likes count
        const currentPost = await tx.post.findUnique({
          where: { id: postId },
          select: { likesCount: true }
        });
        
        // Only decrement if count is greater than 0
        if (currentPost && currentPost.likesCount > 0) {
          await tx.post.update({
            where: { id: postId },
            data: { likesCount: { decrement: 1 } },
          });
        }
      });
      logger.debug('Like removed');
      
      // Remove XP from post owner for losing a like
      if (post?.userId && post.userId !== userId) {
        try {
          await removeLikeXP(post.userId);
          logger.info('XP removed from post owner for like removal');
        } catch (xpError) {
          logger.error('Failed to remove XP for like removal:', xpError);
          // Don't fail the unlike operation if XP fails
        }
      }
      
      // Broadcast like removal for real-time sync
      try {
        await supabase
          .channel('post-likes')
          .send({
            type: 'broadcast',
            event: 'like_removed',
            payload: { postId, userId, liked: false }
          });
      } catch (error) {
        logger.error('Failed to broadcast like removal:', error);
      }
      
      return { liked: false, postOwnerId: post?.userId };
    } else {
      // Like: create like and increment post's like count
      await prisma.$transaction([
        prisma.like.create({ data: { userId, postId } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      logger.debug('Like added');

      // Fetch post owner with more details
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { 
          userId: true,
          user: {
            select: {
              username: true
            }
          }
        },
      });

      if (!post) {
        logger.error('Post not found', { postId });
        return { liked: true };
      }

      logger.debug('Post owner found', { postOwnerId: post.userId });
      
      // Don't create notification if user likes their own post
      if (post.userId === userId) {
        logger.debug('User liked their own post, skipping notification');
        return { liked: true, ownerId: post.userId };
      }

      // Award XP to post owner for receiving a like
      try {
        await awardLikeReceivedXP(post.userId);
        logger.info('XP awarded to post owner for receiving like');
      } catch (xpError) {
        logger.error('Failed to award XP for like:', xpError);
        // Don't fail the like operation if XP fails
      }
      
      try {
          // Get the username and avatar of the person who liked the post
          const likerUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, avatar: true }
          });
          
          const likerName = likerUser?.username || 'Someone';
          const likerAvatar = likerUser?.avatar || '';
          const message = `${likerName} liked your post`;
          
          // Create notification in database
          logger.debug('Attempting to create notification', {
            userId: post.userId,
            fromUserId: userId,
            postId,
            type: 'LIKE',
          });
          
          const notification = await createNotification({
            userId: post.userId,
            fromUserId: userId,
            postId,
            type: 'LIKE',
            message,
          });
          
          if (notification) {
            logger.debug('Notification created successfully', { notificationId: notification.id });
          } else {
            logger.debug('No notification was created, possibly due to self-like or duplicate check');
          }

          // Send FCM push notification
          await sendLikeNotification(post.userId, userId, postId, likerName);

          // Send legacy push notification if there are registered tokens (fallback)
          const tokens = await prisma.pushToken.findMany({
            where: { userId: post.userId },
            select: { token: true },
          });
          logger.debug('Legacy push tokens found', { count: tokens.length });

          if (tokens.length > 0) {
            const pushResult = await sendPushNotification(
              tokens.map(t => t.token),
              likerName,
              'liked your post',
              { 
                postId, 
                type: 'like',
                userId: userId,
                username: likerName,
                avatar: likerAvatar
              }
            );
            logger.debug('Legacy push notification sent', { result: pushResult });
          }
        } catch (err) {
          logger.error('Error creating notification / sending push:', err);
        }

      // Broadcast like addition for real-time sync
      try {
        await supabase
          .channel('post-likes')
          .send({
            type: 'broadcast',
            event: 'like_added',
            payload: { postId, userId, liked: true }
          });
      } catch (error) {
        logger.error('Failed to broadcast like addition:', error);
      }

      return { liked: true, postOwnerId: post?.userId };
    }
  }
}

module.exports = new LikeService();
