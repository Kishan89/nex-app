const bookmarkService = require('../services/bookmarkService');
const { successResponse, errorResponse } = require('../utils/helpers');

class BookmarkController {
  async toggleBookmark(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.user;

      if (!userId) {
        return res.status(401).json(errorResponse('Authentication required.'));
      }

      const bookmark = await bookmarkService.toggleBookmark({ postId, userId });
      
      // Check if a bookmark was created or deleted
      const message = bookmark ? 'Post bookmarked successfully' : 'Post un-bookmarked successfully';

      res.status(200).json(successResponse(bookmark, message));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookmarkController();