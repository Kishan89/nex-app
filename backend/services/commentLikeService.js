const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CommentLikeService');

class CommentLikeService {
  async toggleLike({ commentId, userId }) {
    logger.info('❤️ [toggleLike] Start:', { commentId, userId });
    
    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    logger.info('❤️ [toggleLike] Existing like check:', { commentId, userId, exists: !!existingLike });

    if (existingLike) {
      await prisma.$transaction(async (tx) => {
        await tx.commentLike.delete({ where: { id: existingLike.id } });
        const currentComment = await tx.comment.findUnique({
          where: { id: commentId },
          select: { likesCount: true }
        });
        if (currentComment && currentComment.likesCount > 0) {
          await tx.comment.update({
            where: { id: commentId },
            data: { likesCount: { decrement: 1 } },
          });
        }
      });
      
      const updatedComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { likesCount: true }
      });
      
      logger.info('❤️ [toggleLike] Unlike complete:', { commentId, newLikesCount: updatedComment?.likesCount });
      return { liked: false, likeCount: updatedComment?.likesCount || 0 };
    } else {
      await prisma.$transaction([
        prisma.commentLike.create({ data: { userId, commentId } }),
        prisma.comment.update({
          where: { id: commentId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      
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
