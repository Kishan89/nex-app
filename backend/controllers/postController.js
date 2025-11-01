const postService = require('../services/postService');
const { addXpJob } = require('../services/queueService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../utils/errors');

const logger = createLogger('PostController');

class PostController {
  /**
   * Get all posts
   */
  async getAllPosts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.userId || null;
      
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      
      const posts = await postService.getAllPosts({ page: pageNum, limit: limitNum, userId });
      res.status(HTTP_STATUS.OK).json(posts);
    } catch (error) {
      logger.error('Error in getAllPosts:', error);
      next(error);
    }
  }

  /**
   * Get a single post
   */
  async getPost(req, res, next) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId || null;
      logger.debug('getPost - userId:', userId || 'guest');
      
      const post = await postService.getPostById(postId, userId);
      
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      
      res.status(HTTP_STATUS.OK).json(successResponse(post));
    } catch (error) {
      logger.error('Error in getPost:', error);
      next(error);
    }
  }

  /**
   * Create a new post
   */
  async createPost(req, res, next) {
    try {
      const { content, imageUrl, pollData } = req.body;
      const userId = req.user?.userId;
      
      if (!content && !imageUrl && !pollData) {
        throw new BadRequestError('Content, image, or poll data is required');
      }
      
      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      const post = await postService.createPost({ content, imageUrl, userId, pollData });
      
      res.status(HTTP_STATUS.CREATED).json(successResponse(post, 'Post created successfully'));
      
      setImmediate(async () => {
        try {
          await addXpJob(userId);
          logger.debug(`XP job queued for user: ${userId}`);
        } catch (queueError) {
          logger.error('Error queuing XP job:', queueError);
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a post
   */
  async updatePost(req, res, next) {
    try {
      const { postId } = req.params;
      const updateData = req.body;
      
      const post = await postService.updatePost(postId, updateData);
      
      res.status(HTTP_STATUS.OK).json(successResponse(post, 'Post updated successfully'));
    } catch (error) {
      logger.error('Error in updatePost:', error);
      next(error);
    }
  }

  /**
   * Report a post
   */
  async reportPost(req, res, next) {
    try {
      const { postId } = req.params;
      
      const result = await postService.reportPost(postId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(result, 'Post reported successfully'));
    } catch (error) {
      logger.error('Error in reportPost:', error);
      next(error);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(req, res, next) {
    try {
      const { postId } = req.params;
      
      await postService.deletePost(postId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(null, 'Post deleted successfully'));
    } catch (error) {
      logger.error('Error in deletePost:', error);
      next(error);
    }
  }

  /**
   * Toggle like on a post
   */
  async toggleLike(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        throw new BadRequestError('userId is required');
      }
      
      const result = await postService.toggleLike(postId, userId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(result, result.liked ? 'Post liked' : 'Post unliked'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get posts from followed users only
   */
  async getFollowingPosts(req, res, next) {
    try {
      const { page, limit } = req.query;
      const userId = req.user?.userId;
      
      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      logger.debug('getFollowingPosts - userId:', userId);
      
      const posts = await postService.getFollowingPosts({ page, limit, userId });
      
      res.status(HTTP_STATUS.OK).json(posts);
    } catch (error) {
      logger.error('Error in getFollowingPosts:', error);
      next(error);
    }
  }

  /**
   * Toggle bookmark on a post
   */
  async toggleBookmark(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        throw new BadRequestError('userId is required');
      }
      
      const result = await postService.toggleBookmark(postId, userId);
      
      res.status(HTTP_STATUS.OK).json(successResponse(result, result.bookmarked ? 'Post bookmarked' : 'Bookmark removed'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(req, res, next) {
    try {
      const { page, limit } = req.query;
      // Use authenticated user's ID for like status (null if not authenticated)
      const userId = req.user?.userId || null;
      
      logger.info('getTrendingPosts request', { userId: userId || 'guest' });
      
      const posts = await postService.getTrendingPosts({ page, limit, userId });
      
      res.json(posts);
    } catch (error) {
      logger.error('Error in getTrendingPosts', { error: error.message });
;
      next(error);
    }
  }

  /**
   * Toggle pin status on a post (admin only)
   */
  async togglePinPost(req, res, next) {
    try {
      const { postId } = req.params;
      const { isPinned } = req.body;
      
      if (typeof isPinned !== 'boolean') {
        return res.status(400).json(errorResponse('isPinned must be a boolean value'));
      }
      
      const post = await postService.updatePost(postId, { isPinned });
      
      res.json(successResponse(post, isPinned ? 'Post pinned successfully' : 'Post unpinned successfully'));
    } catch (error) {
      logger.error('Error in togglePinPost', { error: error.message, postId: req.params.postId });
      next(error);
    }
  }
}

module.exports = new PostController();