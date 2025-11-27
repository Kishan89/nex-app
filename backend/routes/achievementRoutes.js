// routes/achievementRoutes.js
const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');

// Get all achievement definitions (no auth required)
router.get('/definitions', achievementController.getDefinitions);

// Get user stats for achievements - MUST come before /:userId
router.get('/stats/:userId', achievementController.getUserStats);

// Get completion percentage - MUST come before /:userId
router.get('/completion/:userId', achievementController.getCompletionPercentage);

// Get unseen achievements - MUST come before /:userId
router.get('/unseen/:userId', achievementController.getUnseenAchievements);

// Get user achievements with progress - This should be LAST among GET routes
router.get('/:userId', achievementController.getUserAchievements);

// Unlock achievement
router.post('/:userId/:achievementId/unlock', achievementController.unlockAchievement);

// Update achievement progress
router.put('/:userId/:achievementId/progress', achievementController.updateProgress);

// Mark achievement as seen
router.put('/:userId/:achievementId/seen', achievementController.markAsSeen);

module.exports = router;
