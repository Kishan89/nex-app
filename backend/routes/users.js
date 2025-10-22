const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyAuthToken } = require('../middleware/auth');

// Authentication routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Authenticated current user profile (must be before parameterized routes)
router.get('/me/profile', verifyAuthToken, userController.getMeProfile);

// ⭐️ User profile route (GET request)
router.get('/:userId/profile', userController.getUserProfile);

// ⭐️ User profile update route (PUT request)
router.put('/:userId/profile', userController.updateUserProfile);

// NEW: Route to get a user's bookmarked posts
router.get('/:userId/bookmarks', userController.getBookmarks);

//  Route for searching users
router.get('/search/users', userController.searchUsers);

//  delete routes
router.delete('/:userId/avatar', userController.deleteAvatar);
router.delete('/:userId/banner', userController.deleteBanner);

// Block/unblock routes
router.post('/:userId/block', verifyAuthToken, userController.blockUser);
router.post('/:userId/unblock', verifyAuthToken, userController.unblockUser);

module.exports = router;
