const userSearchService = require('../services/userSearchService');
const { successResponse, errorResponse } = require('../utils/helpers');

class UserSearchController {
  /**
   * Search for users
   */
  async searchUsers(req, res, next) {
    try {
      const { q: query, page = 1, limit = 20 } = req.query;
      const currentUserId = req.user?.userId;

      if (!query || query.trim().length < 2) {
        return res.status(400).json(errorResponse('Search query must be at least 2 characters long'));
      }

      const offset = (page - 1) * limit;
      const users = await userSearchService.searchUsers(
        query,
        currentUserId,
        parseInt(limit),
        offset
      );

      res.status(200).json(successResponse({
        users,
        query,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: users.length === parseInt(limit)
      }, 'Users found'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      const users = await userSearchService.getSuggestedUsers(currentUserId, parseInt(limit));

      res.status(200).json(successResponse(users, 'Suggested users retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent users
   */
  async getRecentUsers(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      const users = await userSearchService.getRecentUsers(currentUserId, parseInt(limit));

      res.status(200).json(successResponse(users, 'Recent users retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top XP users
   */
  async getTopXPUsers(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json(errorResponse('Authentication required'));
      }

      const users = await userSearchService.getTopXPUsers(currentUserId, parseInt(limit));

      res.status(200).json(successResponse(users, 'Top XP users retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserSearchController();
