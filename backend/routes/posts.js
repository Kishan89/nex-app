const express = require('express');
const postController = require('../controllers/postController');
const likeController = require('../controllers/likeController');
const { verifyAuthToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all posts (with optional authentication to determine like status)
router.get('/', optionalAuth, postController.getAllPosts);

// Get posts from followed users only (requires authentication)
router.get('/following', verifyAuthToken, postController.getFollowingPosts);

// Get trending posts (with optional authentication to determine like status)
router.get('/trending', optionalAuth, postController.getTrendingPosts);

// Get a single post (with optional authentication to determine like status)
router.get('/:postId', optionalAuth, postController.getPost);

// Create a new post
router.post('/', verifyAuthToken, postController.createPost);

// Update a post
router.put('/:postId', verifyAuthToken, postController.updatePost);

// Report a post
router.post('/:postId/report', verifyAuthToken, postController.reportPost);

// Delete a post
router.delete('/:postId', verifyAuthToken, postController.deletePost);

// Like/unlike a post - use likeController which has notification logic
router.post('/:postId/like', verifyAuthToken, likeController.toggleLike);

// Bookmark/unbookmark a post
router.post('/:postId/bookmark', verifyAuthToken, postController.toggleBookmark);

// Pin/unpin a post (admin only - add admin middleware later if needed)
router.post('/:postId/pin', verifyAuthToken, postController.togglePinPost);

module.exports = router;