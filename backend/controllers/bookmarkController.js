const bookmarkService = require('../services/bookmarkService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { createLogger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const { UnauthorizedError } = require('../utils/errors');

const logger = createLogger('BookmarkController');

class BookmarkController {
  async toggleBookmark(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.user;

      if (!userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.AUTH_REQUIRED);
      }

      const bookmark = await bookmarkService.toggleBookmark({ postId, userId });
      
      const message = bookmark ? 'Post bookmarked successfully' : 'Post un-bookmarked successfully';

      res.status(HTTP_STATUS.OK).json(successResponse(bookmark, message));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookmarkController();