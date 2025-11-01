const express = require('express');
const userSearchController = require('../controllers/userSearchController');
const { optionalAuth, verifyAuthToken } = require('../middleware/auth');

const router = express.Router();

// Search users (public endpoint with optional auth for follow status)
router.get('/users', optionalAuth, userSearchController.searchUsers);

// Get suggested users (requires auth)
router.get('/users/suggested', verifyAuthToken, userSearchController.getSuggestedUsers);

// Get recent users (requires auth)
router.get('/users/recent', verifyAuthToken, userSearchController.getRecentUsers);

// Get top XP users (requires auth)
router.get('/users/top-xp', verifyAuthToken, userSearchController.getTopXPUsers);

module.exports = router;
