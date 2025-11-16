const { prisma } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CommentLikeService');

class CommentLikeService {
  async toggleLike({ commentId, userId }) {
    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

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
      
      return { liked: true, likeCount: updatedComment?.likesCount || 0 };
    }
  }
}

module.exports = new CommentLikeService();
