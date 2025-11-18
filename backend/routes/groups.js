const express = require('express');
const groupChatController = require('../controllers/groupChatController');
const { verifyAuthToken } = require('../middleware/auth');
const { requireGroupAdmin } = require('../middleware/groupAdmin');

const router = express.Router();

// All group chat routes require authentication

// Get all groups for current user
router.get('/', verifyAuthToken, groupChatController.getMyGroups.bind(groupChatController));

// Create a new group
router.post('/', verifyAuthToken, groupChatController.createGroup.bind(groupChatController));

// Get group details
router.get('/:groupId', verifyAuthToken, groupChatController.getGroupDetails.bind(groupChatController));

// Add a member to a group (admin only)
router.post('/:groupId/members', verifyAuthToken, requireGroupAdmin, groupChatController.addMember.bind(groupChatController));

// Remove a member from a group (admin only)
router.delete('/:groupId/members/:userId', verifyAuthToken, requireGroupAdmin, groupChatController.removeMember.bind(groupChatController));

// Leave a group (any member can leave themselves)
router.post('/:groupId/leave', verifyAuthToken, groupChatController.leaveGroup.bind(groupChatController));

// Update group avatar (admin only)
router.put('/:groupId/avatar', verifyAuthToken, requireGroupAdmin, groupChatController.updateGroupAvatar.bind(groupChatController));

// Update group name (admin only)
router.put('/:groupId/name', verifyAuthToken, requireGroupAdmin, groupChatController.updateGroupName.bind(groupChatController));

// Update group description (admin only)
router.put('/:groupId/description', verifyAuthToken, requireGroupAdmin, groupChatController.updateGroupDescription.bind(groupChatController));

module.exports = router;
