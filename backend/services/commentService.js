const { prisma, supabase } = require('../config/database');
const { NotFoundError, UnauthorizedError } = require('../utils/errors'); 
const { transformComment } = require('../utils/helpers');
const { createNotification } = require('./notificationService');
const { sendCommentNotification } = require('./fcmService');
const { awardCommentReceivedXP, removeCommentXP } = require('./xpService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CommentService');

class CommentService {

  /**
   * Get comments for a post
{{ ... }}
   */
  async getCommentsByPostId(postId, options = {}) {
    const { page = 1, limit = 50, userId } = options;
    const skip = (page - 1) * limit;
    
    logger.debug('🔍 getCommentsByPostId called:', { postId, userId, hasUserId: !!userId });

    // Get ALL comments for this post (including replies)
    const allComments = await prisma.comment.findMany({
      where: { 
        postId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        },
        likes: {
          select: { id: true, userId: true }
        }
      },
      orderBy: {
        createdAt: 'asc' // Changed to 'asc' for oldest to latest
      },
      skip,
      take: limit,
    });
    
    logger.info('📊 [getCommentsByPostId] Prisma query result:', {
      postId,
      userId,
      totalComments: allComments.length,
      allCommentsLikeCounts: allComments.map(c => ({
        id: c.id.substring(0, 8),
        likesCount: c.likesCount,
        actualLikes: c.likes?.length || 0
      }))
    });
    
    if (!allComments) {
        return [];
    }

    // Build nested comment structure: parent comments with replies array
    const parentComments = allComments.filter(c => !c.parentId);
    const replyMap = {};
    
    // Group replies by parentId
    allComments.filter(c => c.parentId).forEach(reply => {
      if (!replyMap[reply.parentId]) {
        replyMap[reply.parentId] = [];
      }
      replyMap[reply.parentId].push(reply);
    });
    
    // Transform comments with nested replies - oldest first
    const transformedComments = parentComments.map(parent => {
      const transformedParent = transformComment(parent);
      transformedParent.likesCount = parent.likesCount || 0;
      
      // Check if user has liked this parent comment
      const parentLikedByCurrentUser = userId && parent.likes ? parent.likes.some(like => {
        const match = like.userId === userId;
        if (parent.id.substring(0, 8) === 'cmi0div0') {
          logger.info('🔍 Parent comment like check:', {
            parentId: parent.id.substring(0, 8),
            currentUserId: userId,
            likeUserId: like.userId,
            match: match
          });
        }
        return match;
      }) : false;
      
      transformedParent.isLiked = parentLikedByCurrentUser;
      
      logger.debug('💬 Parent comment like data:', {
        commentId: parent.id.substring(0, 8),
        likesCount: parent.likesCount,
        totalLikes: parent.likes?.length || 0,
        userId,
        currentUserId: userId,
        isLiked: transformedParent.isLiked,
        likesArray: parent.likes,
        likesData: parent.likes?.map(l => ({ userId: l.userId, id: l.id }))
      });
      
      const replies = replyMap[parent.id] || [];
      // Sort replies by createdAt ascending (oldest to latest)
      const sortedReplies = replies.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      transformedParent.replies = sortedReplies.map(reply => {
        const transformed = transformComment(reply);
        transformed.likesCount = reply.likesCount || 0;
        
        // Check if user has liked this reply
        const likedByCurrentUser = userId && reply.likes ? reply.likes.some(like => {
          const match = like.userId === userId;
          if (reply.id.substring(0, 8) === 'cmi0ouncp' || reply.id.substring(0, 8) === 'cmi0ibx6') {
            logger.info('🔍 Comparing likes for reply:', {
              replyId: reply.id.substring(0, 8),
              currentUserId: userId,
              likeUserId: like.userId,
              match: match
            });
          }
          return match;
        }) : false;
        
        transformed.isLiked = likedByCurrentUser;
        
        logger.debug('  💬 Reply like data:', {
          replyId: reply.id.substring(0, 8),
          likesCount: reply.likesCount,
          totalLikes: reply.likes?.length || 0,
          userId,
          isLiked: transformed.isLiked,
          likesArray: reply.likes
        });
        
        return transformed;
      });
      return transformedParent;
    });

    logger.debug('Nested comments structure', {
      postId,
      totalComments: allComments.length,
      parentComments: parentComments.length,
      totalReplies: allComments.length - parentComments.length,
      sampleComment: transformedComments[0] ? {
        id: transformedComments[0].id,
        username: transformedComments[0].username,
        repliesCount: transformedComments[0].replies.length
      } : null
    });

    return transformedComments;
  }


  async createComment(commentData) {
    const { text, postId, userId, parentId = null, isAnonymous = false } = commentData;

    logger.debug('Creating comment', {
      text: text?.substring(0, 50),
      postId,
      userId,
      parentId,
      hasParentId: !!parentId,
      parentIdType: typeof parentId
    });

    try {
      // Check if post is anonymous and user is the post owner when trying to post anonymously
      if (isAnonymous) {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { userId: true, isAnonymous: true }
        });
        
        if (!post) {
          throw new NotFoundError('Post not found');
        }
        
        // Only allow anonymous comments on anonymous posts
        if (!post.isAnonymous) {
          throw new UnauthorizedError('Anonymous comments are only allowed on anonymous posts');
        }
        
        // Only the post owner can comment anonymously
        if (post.userId !== userId) {
          throw new UnauthorizedError('Only the post owner can comment anonymously');
        }
      }
      
      const commentDataToCreate = {
        text,
        postId,
        userId,
        isAnonymous: Boolean(isAnonymous),
      };
      
      // Only add parentId if it's not null/undefined/empty
      if (parentId && parentId.trim && parentId.trim() !== '') {
        // Verify parent comment exists
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId }
        });
        
        if (!parentComment) {
          logger.error('Parent comment not found', { parentId });
          throw new Error('Parent comment not found');
        }
        
        logger.debug('Parent comment verified', { parentId: parentComment.id });
        commentDataToCreate.parentId = parentId;
      }
      
      logger.debug('Comment data to create', commentDataToCreate);
      
      const result = await prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: commentDataToCreate,
        });

        // Increment the post's comment count
        await tx.post.update({
          where: { id: postId },
          data: {
            commentsCount: {
              increment: 1,
            },
          },
        });
        
        return comment;
      });

      // Fetch the created comment with user details to return to the client
      const createdComment = await prisma.comment.findUnique({
          where: { id: result.id },
          include: {
              user: {
                  select: {
                      id: true,
                      username: true,
                      avatar: true,
                  }
              }
          }
      });

      const transformedComment = transformComment(createdComment);
      transformedComment.likesCount = 0;
      transformedComment.isLiked = false;

      // Send notification to post owner
      try {
        // Get post owner details
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { 
            userId: true,
            user: {
              select: { username: true }
            }
          }
        });

        // Get commenter details
        const commenter = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true }
        });

        if (post && post.userId !== userId && commenter) {
          const message = `New comment on your post`;
          
          logger.debug('Creating comment notification', {
            postOwnerId: post.userId,
            commenterId: userId,
            postId,
            type: 'COMMENT',
            message
          });

          // Create in-app notification
          await createNotification({
            userId: post.userId,
            fromUserId: userId,
            postId,
            type: 'COMMENT',
            message
          });

          // Send FCM push notification
          await sendCommentNotification(
            post.userId, 
            userId, 
            postId, 
            commenter.username, 
            text
          );
        }
      } catch (notifError) {
        logger.error('Error creating comment notification:', notifError);
        // Continue despite notification error
      }

      // Broadcast new comment for real-time sync
      try {
        await supabase
          .channel('post-comments')
          .send({
            type: 'broadcast',
            event: 'comment_added',
            payload: { postId, comment: transformedComment }
          });
      } catch (error) {
        logger.error('Failed to broadcast new comment:', error);
      }

      // Add post owner ID to the response for XP calculation
      const postOwner = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true }
      });

      // Award XP to post owner for receiving a comment (if not commenting on own post)
      if (postOwner?.userId && postOwner.userId !== userId) {
        try {
          await awardCommentReceivedXP(postOwner.userId);
          logger.info('XP awarded to post owner for receiving comment');
        } catch (xpError) {
          logger.error('Failed to award comment XP:', xpError);
          // Don't fail comment creation if XP fails
        }
      }

      // Check if this is user's first comment (for first_comment achievement)
      try {
        const userCommentsCount = await prisma.comment.count({
          where: { userId }
        });
        
        if (userCommentsCount === 1) {
          const achievementService = require('./achievementService');
          await achievementService.unlockAchievement(userId, 'first_comment');
          logger.info('first_comment achievement unlocked for user', { userId });
        }
      } catch (achievementError) {
        logger.error('Failed to check/unlock first_comment achievement:', achievementError);
        // Don't fail comment creation
      }

      return {
        ...transformedComment,
        postOwnerId: postOwner?.userId
      };

    } catch (error) {
      logger.error('Failed to create comment and update count:', error);
      throw error;
    }
  }


  async updateComment(commentId, userId, updateData) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to update this comment.');
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        }
      },
    });

    return transformComment(updatedComment);
  }

  /**
   * Delete a comment with proper handling for replies
   * If deleting a reply, only delete that specific reply
   * If deleting a parent comment with replies, cascade delete all replies
   */
  async deleteComment(commentId, userId) {
    logger.debug('Starting comment deletion', { commentId, userId });

    // First, get the comment with its relationships
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { userId: true }
        },
        replies: {
          select: {
            id: true,
            userId: true
          }
        },
        parent: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });

    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    logger.debug('Comment details', {
      commentId,
      commentAuthor: comment.userId,
      postOwner: comment.post?.userId,
      requestingUser: userId,
      hasParent: !!comment.parentId,
      hasReplies: comment.replies.length,
      isCommentAuthor: comment.userId === userId,
      isPostOwner: comment.post?.userId === userId
    });

    // Authorization check - user can delete ONLY their own comments
    if (comment.userId !== userId) {
      logger.warn('Authorization failed for comment deletion', {
        commentUserId: comment.userId,
        postOwnerId: comment.post?.userId,
        requestingUserId: userId
      });
      throw new UnauthorizedError('You can delete only your own comments.');
    }
    
    logger.debug('Authorization passed for comment deletion');

    const isParentComment = !comment.parentId;
    const isCommentAuthor = comment.userId === userId;

    try {
      if (isParentComment) {
        // If deleting a parent comment with replies, cascade delete all replies
        if (comment.replies.length > 0) {
          logger.info('Deleting parent comment with replies', { repliesCount: comment.replies.length });
          await this.deleteCommentWithReplies(commentId, comment.postId, comment.replies.length + 1);
        } else {
          // Parent comment with no replies - simple delete
          await this.deleteCommentAndUpdateCount(commentId, comment.postId);
        }
      } else {
        // This is a reply - simple delete
        await this.deleteCommentAndUpdateCount(commentId, comment.postId);
      }

      // XP logic - remove XP if deleting comment on someone else's post
      if (comment.post?.userId && comment.post.userId !== userId) {
        try {
          console.log('🎯 Attempting to remove XP for comment deletion:', {
            postOwnerId: comment.post.userId,
            commentAuthorId: comment.userId,
            deletingUserId: userId
          });
          await removeCommentXP(comment.post.userId);
          console.log('✅ XP removed from post owner for comment deletion');
        } catch (xpError) {
          console.error('❌ Failed to remove comment XP (non-critical):', xpError.message);
          // Don't fail comment deletion if XP fails - this is completely non-critical
        }
      } else {
        console.log('🎯 Skipping XP removal - deleting comment on own post');
      }

      // Broadcast comment deletion for real-time sync
      try {
        await supabase
          .channel('post-comments')
          .send({
            type: 'broadcast',
            event: 'comment_deleted',
            payload: {
              postId: comment.postId,
              commentId: commentId,
              deletedBy: userId,
              wasReply: !isParentComment,
              cascadeDelete: isParentComment && comment.replies.length > 0
            }
          });
        console.log('✅ Comment deletion broadcasted for real-time sync');
      } catch (broadcastError) {
        console.error('❌ Failed to broadcast comment deletion:', broadcastError);
        // Don't fail comment deletion if broadcast fails - this is non-critical
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to delete comment:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });

      // Enhanced error handling with more specific messages
      if (error.code === 'P2025') {
        throw new NotFoundError('Comment not found or already deleted.');
      } else if (error.code === 'P2002') {
        throw new Error('Database constraint violation during comment deletion.');
      } else if (error.code === 'P2003') {
        throw new Error('Foreign key constraint failed during comment deletion.');
      } else if (error.message && error.message.includes('Cannot delete parent comment')) {
        throw new Error('Cannot delete parent comment that has replies. Delete individual replies instead.');
      } else if (error instanceof UnauthorizedError) {
        throw error; // Re-throw authorization errors as-is
      } else if (error instanceof NotFoundError) {
        throw error; // Re-throw not found errors as-is
      } else {
        // Log the full error for debugging
        console.error('❌ Unexpected error during comment deletion:', {
          errorType: typeof error,
          errorConstructor: error.constructor.name,
          errorString: error.toString(),
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        throw new Error(`Failed to delete comment: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Helper method to delete comment and update post count
   */
  async deleteCommentAndUpdateCount(commentId, postId) {
    await prisma.$transaction(async (tx) => {
      // Delete the comment
      await tx.comment.delete({
        where: { id: commentId },
      });

      // Update post comment count
      await tx.post.update({
        where: { id: postId },
        data: {
          commentsCount: {
            decrement: 1,
          },
        },
      });

      console.log('✅ Comment deletion transaction completed');
    });
  }

  /**
   * Helper method to delete parent comment with all its replies (cascade delete)
   */
  async deleteCommentWithReplies(parentCommentId, postId, totalCommentsToDelete) {
    await prisma.$transaction(async (tx) => {
      // First delete all replies (children comments)
      await tx.comment.deleteMany({
        where: { parentId: parentCommentId },
      });

      // Then delete the parent comment
      await tx.comment.delete({
        where: { id: parentCommentId },
      });

      // Update post comment count by the total number of deleted comments
      await tx.post.update({
        where: { id: postId },
        data: {
          commentsCount: {
            decrement: totalCommentsToDelete,
          },
        },
      });

      console.log(`✅ Cascade comment deletion completed - deleted ${totalCommentsToDelete} comments`);
    });
  }
  
  /**
   * Get comment count for a post.
   * @returns {Promise<number>} - Comment count
   */
  async getCommentCount(postId) {
    return await prisma.comment.count({
      where: { postId },
    });
  }

  /**
   * Report a comment
   */
  async reportComment(commentId) {
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        reportsCount: {
          increment: 1
        }
      }
    });
    
    return { success: true, reportsCount: comment.reportsCount };
  }
}

module.exports = new CommentService();
