const express = require('express');
const followController = require('../controllers/followController');
const { verifyAuthToken } = require('../middleware/auth');

const router = express.Router();

// Follow/Unfollow routes
router.post('/:userId/follow', verifyAuthToken, followController.followUser);
router.delete('/:userId/follow', verifyAuthToken, followController.unfollowUser);

// Check follow status
router.get('/:userId/follow-status', verifyAuthToken, followController.checkFollowStatus);

// Get following/followers lists
router.get('/:userId/following', followController.getFollowing);
router.get('/:userId/followers', followController.getFollowers);

// Get follow counts
router.get('/:userId/follow-counts', followController.getFollowCounts);

// Get updated follow counts (ensures consistency)
router.get('/:userId/follow-counts-updated', followController.getUpdatedFollowCounts);

// Get messagable users (users that current user follows)
router.get('/messagable', verifyAuthToken, followController.getMessagableUsers);

module.exports = router;
