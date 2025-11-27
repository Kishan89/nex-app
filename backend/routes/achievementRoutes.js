// routes/achievementRoutes.js
const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authMiddleware } = require('../middleware/auth');

// Get all achievement definitions (no auth required - can be viewed by anyone)
router.get('/definitions', achievementController.getDefinitions);

// Get user achievements with progress
router.get('/:userId', achievementController.getUserAchievements);

// Get user stats for achievements
router.get('/stats/:userId', achievementController.getUserStats);

// Get completion percentage
router.get('/completion/:userId', achievementController.getCompletionPercentage);

// Get unseen achievements
router.get('/unseen/:userId', authMiddleware, achievementController.getUnseenAchievements);

// Unlock achievement (protected)
router.post('/:userId/:achievementId/unlock', authMiddleware, achievementController.unlockAchievement);

// Update achievement progress (protected)
router.put('/:userId/:achievementId/progress', authMiddleware, achievementController.updateProgress);

// Mark achievement as seen (protected)
router.put('/:userId/:achievementId/seen', authMiddleware, achievementController.markAsSeen);

module.exports = router;
