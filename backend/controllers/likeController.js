const likeService = require("../services/likeService");
const { successResponse, errorResponse } = require("../utils/helpers");
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { UnauthorizedError } = require('../utils/errors');

const logger = createLogger('LikeController');

class LikeController {
  async toggleLike(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.user || {};

      logger.debug("toggleLike called for postId:", postId, "by userId:", userId);

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const result = await likeService.toggleLike({ postId, userId });
      logger.debug("Result from likeService:", result);

      const message = result.liked
        ? "Post liked successfully"
        : "Post unliked successfully";

      res.status(HTTP_STATUS.OK).json(successResponse(result, message));

    } catch (error) {
      logger.error("Error in toggleLike:", error);
      next(error);
    }
  }
}

module.exports = new LikeController();
