// controllers/likeController.js
const likeService = require("../services/likeService");
const { successResponse, errorResponse } = require("../utils/helpers");

class LikeController {
  async toggleLike(req, res, next) {
    try {
      const { postId } = req.params;
      const { userId } = req.user || {};

      console.log("🔹 toggleLike called for postId:", postId, "by userId:", userId);

      if (!userId) {
        console.log("❌ No userId found, authentication required.");
        return res.status(401).json(errorResponse("Authentication required."));
      }

      // Toggle like (notifications are handled in the service)
      const result = await likeService.toggleLike({ postId, userId });
      console.log("🔹 Result from likeService:", result);

      // XP is handled in likeService to avoid duplication

      const message = result.liked
        ? "Post liked successfully"
        : "Post unliked successfully";

      res.status(200).json(successResponse(result, message));

    } catch (error) {
      console.error("❌ Error in toggleLike:", error);
      next(error);
    }
  }
}

module.exports = new LikeController();
