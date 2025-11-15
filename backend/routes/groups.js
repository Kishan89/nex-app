const express = require('express');
const groupChatController = require('../controllers/groupChatController');
const { verifyAuthToken } = require('../middleware/auth');

const router = express.Router();

// All group chat routes require authentication

// Get all groups for current user
router.get('/', verifyAuthToken, groupChatController.getMyGroups.bind(groupChatController));

// Create a new group
router.post('/', verifyAuthToken, groupChatController.createGroup.bind(groupChatController));

// Add a member to a group
router.post('/:groupId/members', verifyAuthToken, groupChatController.addMember.bind(groupChatController));

// Remove a member from a group
router.delete('/:groupId/members/:userId', verifyAuthToken, groupChatController.removeMember.bind(groupChatController));

// Update group avatar
router.put('/:groupId/avatar', verifyAuthToken, groupChatController.updateGroupAvatar.bind(groupChatController));

// Update group name
router.put('/:groupId/name', verifyAuthToken, groupChatController.updateGroupName.bind(groupChatController));

// Update group description
router.put('/:groupId/description', verifyAuthToken, groupChatController.updateGroupDescription.bind(groupChatController));

module.exports = router;
