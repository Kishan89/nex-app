const commentService = require('../services/commentService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { UnauthorizedError } = require('../utils/errors');

class CommentController {
  /**
   * Get comments for a post
   */
  async getComments(req, res, next) {
    try {
      const { postId } = req.params;
      const { page, limit } = req.query;

      const comments = await commentService.getCommentsByPostId(postId, { page, limit });
      if (!Array.isArray(comments)) {
        return res.json(successResponse([], 'Comments fetched successfully'));
      }
      
      res.json(successResponse(comments, 'Comments fetched successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new comment
   */
  async createComment(req, res, next) {
    try {
      const { postId } = req.params;
      const { text, parentId } = req.body;
      const { userId } = req.user || {}; 
      
      if (!text || !userId) {
        return res.status(400).json(errorResponse('Comment text and authentication are required.'));
      }
      
      const comment = await commentService.createComment({ text, postId, userId, parentId });
      
      // XP is handled in commentService to avoid duplication
      
      res.status(201).json(successResponse(comment, 'Comment created successfully.'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a comment
   */
  async updateComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { text } = req.body;
      const { userId } = req.user || {};

      if (!text || !userId) {
          return res.status(400).json(errorResponse('Comment text and authentication are required for an update.'));
      }

      const updatedComment = await commentService.updateComment(commentId, userId, { text });

      res.status(200).json(successResponse(updatedComment, 'Comment updated successfully.'));
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a comment
   */
  async deleteComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const { userId } = req.user || {}; 
      
      console.log('🗑️ Comment deletion request:', {
        commentId,
        userId,
        userAgent: req.headers['user-agent']
      });
      
      if (!userId) {
        return res.status(400).json(errorResponse('Authentication is required.'));
      }
      
      if (!commentId) {
        return res.status(400).json(errorResponse('Comment ID is required.'));
      }
      
      const result = await commentService.deleteComment(commentId, userId);
      
      console.log('✅ Comment deleted successfully:', commentId);
      res.status(200).json(successResponse(null, 'Comment deleted successfully.'));
    } catch (error) {
      console.error('❌ Comment deletion controller error:', error);
      console.error('❌ Controller error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      next(error);
    }
  }
}

module.exports = new CommentController();