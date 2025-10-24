const followService = require('../services/followService');
const { addFollowNotificationJob, addFollowCountUpdateJob } = require('../services/queueService');
const { successResponse, errorResponse } = require('../utils/helpers');

class FollowController {
  /**
   * Follow a user
   */
  async followUser(req, res, next) {
    try {
      const { userId } = req.params; // User to follow
      const followerId = req.user?.userId; // Current user

      console.log(`Follow request: ${followerId} wants to follow ${userId}`);

      if (!followerId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      if (followerId === userId) {
        return res.status(400).json(errorResponse('Cannot follow yourself'));
      }

      const follow = await followService.followUser(followerId, userId);

      // 🚀 INSTANT RESPONSE - Send success immediately
      console.log(`Follow successful: ${followerId} -> ${userId}`);
      res.status(201).json(successResponse(follow, 'User followed successfully'));

      // 🔄 BACKGROUND PROCESSING - Queue notification and count updates
      try {
        const followerUsername = follow.follower?.username || 'Someone';
        
        // Add notification job to queue (processed in background)
        await addFollowNotificationJob(userId, followerId, followerUsername);
        
        // Add follow count update job to queue
        await addFollowCountUpdateJob(followerId, userId);
        
        console.log(`📋 Background jobs queued for follow: ${followerId} -> ${userId}`);
      } catch (queueError) {
        console.error('Failed to queue background jobs:', queueError);
        // Don't affect the response since it's already sent
      }
    } catch (error) {
      console.error('Error in followUser:', error);
      if (error.message === 'Already following this user') {
        return res.status(400).json(errorResponse(error.message));
      }
      next(error);
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(req, res, next) {
    try {
      const { userId } = req.params; // User to unfollow
      const followerId = req.user?.userId; // Current user

      console.log(`Unfollow request: ${followerId} wants to unfollow ${userId}`);

      if (!followerId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      const success = await followService.unfollowUser(followerId, userId);

      if (!success) {
        return res.status(404).json(errorResponse('Follow relationship not found'));
      }

      console.log(`Unfollow successful: ${followerId} -> ${userId}`);
      res.status(200).json(successResponse(null, 'User unfollowed successfully'));
    } catch (error) {
      console.error('Error in unfollowUser:', error);
      next(error);
    }
  }

  /**
   * Check if current user follows a specific user
   */
  async checkFollowStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      if (currentUserId === userId) {
        return res.status(200).json(successResponse({ isFollowing: false }, 'Cannot follow yourself'));
      }

      const isFollowing = await followService.isFollowing(currentUserId, userId);

      res.status(200).json(successResponse({ isFollowing }, 'Follow status retrieved'));
    } catch (error) {
      console.error('Error in checkFollowStatus:', error);
      next(error);
    }
  }

  /**
   * Get users that current user is following
   */
  async getFollowing(req, res, next) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const following = await followService.getFollowing(userId, parseInt(limit), offset);

      res.status(200).json(successResponse(following, 'Following list retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users that follow the specified user
   */
  async getFollowers(req, res, next) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const followers = await followService.getFollowers(userId, parseInt(limit), offset);

      res.status(200).json(successResponse(followers, 'Followers list retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow counts for a user
   */
  async getFollowCounts(req, res, next) {
    try {
      const { userId } = req.params;

      const counts = await followService.getFollowCounts(userId);

      res.status(200).json(successResponse(counts, 'Follow counts retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get and update follow counts for a user (ensures consistency)
   */
  async getUpdatedFollowCounts(req, res, next) {
    try {
      const { userId } = req.params;

      const counts = await followService.getAndUpdateFollowCounts(userId);

      res.status(200).json(successResponse(counts, 'Follow counts updated and retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users that can be messaged (followed users)
   */
  async getMessagableUsers(req, res, next) {
    try {
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      const users = await followService.getMessagableUsers(currentUserId);

      res.status(200).json(successResponse(users, 'Messagable users retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FollowController();
