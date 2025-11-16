const commentLikeService = require('../services/commentLikeService');
const { successResponse } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { UnauthorizedError } = require('../utils/errors');

const logger = createLogger('CommentLikeController');

class CommentLikeController {
  async toggleLike(req, res, next) {
    try {
      const { commentId } = req.params;
      const { userId } = req.user || {};

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const result = await commentLikeService.toggleLike({ commentId, userId });
      const message = result.liked ? 'Comment liked' : 'Comment unliked';

      res.status(HTTP_STATUS.OK).json(successResponse(result, message));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentLikeController();
