const express = require('express');
const commentController = require('../controllers/commentController');
const { verifyAuthToken } = require('../middleware/auth'); 

const router = express.Router({ mergeParams: true });

// Get comments for a post (public read access)
router.get('/', commentController.getComments);

// Create a new comment (requires a logged-in user)
router.post('/', verifyAuthToken, commentController.createComment);

// Update a comment (requires a logged-in user who owns the comment)
router.put('/:commentId', verifyAuthToken, commentController.updateComment);

// Delete a comment (requires a logged-in user who owns the comment)
router.delete('/:commentId', verifyAuthToken, commentController.deleteComment);

module.exports = router;