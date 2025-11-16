const commentService = require('../services/commentService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

const logger = createLogger('CommentController');

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
        return res.status(HTTP_STATUS.OK).json(successResponse([], 'Comments fetched successfully'));
      }
      
      res.status(HTTP_STATUS.OK).json(successResponse(comments, 'Comments fetched successfully'));
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
      const { text, parentId, isAnonymous } = req.body;
      const { userId } = req.user || {}; 
      
      if (!text || !userId) {
        throw new BadRequestError('Comment text and authentication are required.');
      }
      
      const comment = await commentService.createComment({ text, postId, userId, parentId, isAnonymous });
      
      res.status(HTTP_STATUS.CREATED).json(successResponse(comment, 'Comment created successfully.'));
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
          throw new BadRequestError('Comment text and authentication are required for an update.');
      }

      const updatedComment = await commentService.updateComment(commentId, userId, { text });

      res.status(HTTP_STATUS.OK).json(successResponse(updatedComment, 'Comment updated successfully.'));
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
      
      logger.debug('Comment deletion request:', { commentId, userId });
      
      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      if (!commentId) {
        throw new BadRequestError('Comment ID is required.');
      }
      
      const result = await commentService.deleteComment(commentId, userId);
      
      logger.info('Comment deleted successfully:', commentId);
      res.status(HTTP_STATUS.OK).json(successResponse(null, 'Comment deleted successfully.'));
    } catch (error) {
      logger.error('Comment deletion error:', error);
      next(error);
    }
  }

  /**
   * Report a comment
   */
  async reportComment(req, res, next) {
    try {
      const { commentId } = req.params;
      
      const result = await commentService.reportComment(commentId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(result, 'Comment reported successfully'));
    } catch (error) {
      logger.error('Error in reportComment:', error);
      next(error);
    }
  }
}

module.exports = new CommentController();
