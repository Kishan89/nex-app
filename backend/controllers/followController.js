const followService = require('../services/followService');
const { addFollowNotificationJob, addFollowCountUpdateJob } = require('../services/queueService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

const logger = createLogger('FollowController');

class FollowController {
  /**
   * Follow a user
   */
  async followUser(req, res, next) {
    try {
      const { userId } = req.params;
      const followerId = req.user?.userId;

      logger.debug(`Follow request: ${followerId} wants to follow ${userId}`);

      if (!followerId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      if (followerId === userId) {
        throw new BadRequestError('Cannot follow yourself');
      }

      const follow = await followService.followUser(followerId, userId);

      logger.info(`Follow successful: ${followerId} -> ${userId}`);
      res.status(HTTP_STATUS.CREATED).json(successResponse(follow, 'User followed successfully'));
      
      setImmediate(async () => {
        try {
          const followerUsername = follow.follower?.username || 'Someone';
          await addFollowNotificationJob(userId, followerId, followerUsername);
          await addFollowCountUpdateJob(followerId, userId);
          logger.debug(`Background jobs queued for follow: ${followerId} -> ${userId}`);
        } catch (queueError) {
          logger.error('Failed to queue background jobs:', queueError);
        }
      });
    } catch (error) {
      logger.error('Error in followUser:', error);
      if (error.message === 'Already following this user') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(error.message));
      }
      next(error);
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(req, res, next) {
    try {
      const { userId } = req.params;
      const followerId = req.user?.userId;

      logger.debug(`Unfollow request: ${followerId} wants to unfollow ${userId}`);

      if (!followerId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const success = await followService.unfollowUser(followerId, userId);

      if (!success) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Follow relationship not found'));
      }

      logger.info(`Unfollow successful: ${followerId} -> ${userId}`);
      res.status(HTTP_STATUS.OK).json(successResponse(null, 'User unfollowed successfully'));

      setImmediate(async () => {
        try {
          await addFollowCountUpdateJob(followerId, userId);
          logger.debug(`Background count update queued for unfollow: ${followerId} -> ${userId}`);
        } catch (queueError) {
          logger.error('Failed to queue background jobs for unfollow:', queueError);
        }
      });
    } catch (error) {
      logger.error('Error in unfollowUser:', error);
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
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      if (currentUserId === userId) {
        return res.status(HTTP_STATUS.OK).json(successResponse({ isFollowing: false }, 'Cannot follow yourself'));
      }

      const isFollowing = await followService.isFollowing(currentUserId, userId);

      res.status(HTTP_STATUS.OK).json(successResponse({ isFollowing }, 'Follow status retrieved'));
    } catch (error) {
      logger.error('Error in checkFollowStatus:', error);
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

      res.status(HTTP_STATUS.OK).json(successResponse(following, 'Following list retrieved'));
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

      res.status(HTTP_STATUS.OK).json(successResponse(followers, 'Followers list retrieved'));
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

      res.status(HTTP_STATUS.OK).json(successResponse(counts, 'Follow counts retrieved'));
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

      res.status(HTTP_STATUS.OK).json(successResponse(counts, 'Follow counts updated and retrieved'));
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
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const users = await followService.getMessagableUsers(currentUserId);

      res.status(HTTP_STATUS.OK).json(successResponse(users, 'Messagable users retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FollowController();
