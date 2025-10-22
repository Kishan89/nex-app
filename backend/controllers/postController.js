const postService = require('../services/postService');
const xpService = require('../services/xpService');
const { successResponse, errorResponse } = require('../utils/helpers');

class PostController {
  /**
   * Get all posts
   */
  async getAllPosts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      // Use authenticated user's ID for like status (null if not authenticated)
      const userId = req.user?.userId || null;
      
      // Convert string parameters to numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      
      const posts = await postService.getAllPosts({ page: pageNum, limit: limitNum, userId });
      res.json(posts);
    } catch (error) {
      console.error('❌ Error in getAllPosts:', error);
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
      console.log('🔹 getPost - userId:', userId || 'guest');
      
      const post = await postService.getPostById(postId, userId);
      
      if (!post) {
        return res.status(404).json(errorResponse('Post not found'));
      }
      
      res.json(successResponse(post));
    } catch (error) {
      console.error('❌ Error in getPost:', error);
      next(error);
    }
  }

  /**
   * Create a new post
   */
  async createPost(req, res, next) {
    try {
      const { content, imageUrl, pollData } = req.body;
      const userId = req.user?.userId; // Get from authenticated user
      
      // At least content, image, or poll must be provided
      if (!content && !imageUrl && !pollData) {
        return res.status(400).json(errorResponse('Content, image, or poll data is required'));
      }
      
      if (!userId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }
      
      const post = await postService.createPost({ content, imageUrl, userId, pollData });
      
      // Award XP for creating a post
      try {
        await xpService.awardPostCreationXP(userId);
      } catch (xpError) {
        console.error('❌ Error awarding XP for post creation:', xpError);
        // Don't fail the post creation if XP fails
      }
      
      res.status(201).json(successResponse(post, 'Post created successfully'));
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
      
      res.json(successResponse(post, 'Post updated successfully'));
    } catch (error) {
      console.error('❌ Error in updatePost:', error);
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
      
      res.json(successResponse(result, 'Post reported successfully'));
    } catch (error) {
      console.error('❌ Error in reportPost:', error);
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
      
      res.json(successResponse(null, 'Post deleted successfully'));
    } catch (error) {
      console.error('❌ Error in deletePost:', error);
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
        return res.status(400).json(errorResponse('userId is required'));
      }
      
      const result = await postService.toggleLike(postId, userId);
      
      res.json(successResponse(result, result.liked ? 'Post liked' : 'Post unliked'));
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
        return res.status(401).json(errorResponse('Authentication required'));
      }
      
      console.log('🔹 getFollowingPosts - userId:', userId);
      
      const posts = await postService.getFollowingPosts({ page, limit, userId });
      
      res.json(posts);
    } catch (error) {
      console.error('❌ Error in getFollowingPosts:', error);
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
        return res.status(400).json(errorResponse('userId is required'));
      }
      
      const result = await postService.toggleBookmark(postId, userId);
      
      res.json(successResponse(result, result.bookmarked ? 'Post bookmarked' : 'Bookmark removed'));
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
      console.log('🔹 getTrendingPosts - userId:', userId || 'guest');
      
      const posts = await postService.getTrendingPosts({ page, limit, userId });
      
      res.json(posts);
    } catch (error) {
      console.error('❌ Error in getTrendingPosts:', error);
      next(error);
    }
  }
}

module.exports = new PostController();