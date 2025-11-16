const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CommentLikeService');

class CommentLikeService {
  async toggleLike({ commentId, userId }) {
    logger.info('❤️ [toggleLike] Start:', { commentId, userId });
    
    // Check current state before any changes
    const beforeComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { likesCount: true }
    });
    logger.info('❤️ [toggleLike] Before state:', { commentId, likesCount: beforeComment?.likesCount });
    
    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    logger.info('❤️ [toggleLike] Existing like check:', { commentId, userId, exists: !!existingLike });

    if (existingLike) {
      // Unlike: Delete like and decrement count
      await prisma.$transaction(async (tx) => {
        await tx.commentLike.delete({ where: { id: existingLike.id } });
        logger.info('❤️ [toggleLike] CommentLike deleted');
        
        const currentComment = await tx.comment.findUnique({
          where: { id: commentId },
          select: { likesCount: true }
        });
        logger.info('❤️ [toggleLike] Current count before decrement:', currentComment?.likesCount);
        
        if (currentComment && currentComment.likesCount > 0) {
          await tx.comment.update({
            where: { id: commentId },
            data: { likesCount: { decrement: 1 } },
          });
          logger.info('❤️ [toggleLike] Count decremented');
        }
      });
      
      const updatedComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likesCount: true }
      });
      
      logger.info('❤️ [toggleLike] Unlike complete:', { commentId, newLikesCount: updatedComment?.likesCount });
      return { liked: false, likeCount: updatedComment?.likesCount || 0 };
    } else {
      // Like: Create like and increment count
      await prisma.$transaction(async (tx) => {
        await tx.commentLike.create({ data: { userId, commentId } });
        logger.info('❤️ [toggleLike] CommentLike created');
        
        await tx.comment.update({
          where: { id: commentId },
          data: { likesCount: { increment: 1 } },
        });
        logger.info('❤️ [toggleLike] Count incremented');
      });
      
      const updatedComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likesCount: true }
      });
      
      logger.info('❤️ [toggleLike] Like complete:', { commentId, newLikesCount: updatedComment?.likesCount });
      return { liked: true, likeCount: updatedComment?.likesCount || 0 };
    }
  }
}

module.exports = new CommentLikeService();
