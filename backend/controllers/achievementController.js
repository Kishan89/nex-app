// controllers/achievementController.js
const achievementService = require('../services/achievementService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AchievementController');

/**
 * Get all achievement definitions
 */
const getDefinitions = async (req, res) => {
  try {
    const definitions = await achievementService.getAchievementDefinitions();
    res.json({ success: true, data: definitions });
  } catch (error) {
    logger.error('Error getting achievement definitions:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get achievement definitions' });
  }
};

/**
 * Get user achievements with progress
 */
const getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const achievements = await achievementService.getUserAchievements(userId);
    res.json({ success: true, data: achievements });
  } catch (error) {
    logger.error('Error getting user achievements:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get user achievements' });
  }
};

/**
 * Get user stats for achievements
 */
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const stats = await achievementService.getUserStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error getting user stats:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get user stats' });
  }
};

/**
 * Unlock an achievement
 */
const unlockAchievement = async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    
    if (!userId || !achievementId) {
      return res.status(400).json({ success: false, error: 'User ID and Achievement ID are required' });
    }
    
    await achievementService.unlockAchievement(userId, achievementId);
    res.json({ success: true, message: 'Achievement unlocked successfully' });
  } catch (error) {
    logger.error('Error unlocking achievement:', error.message);
    res.status(500).json({ success: false, error: 'Failed to unlock achievement' });
  }
};

/**
 * Update achievement progress
 */
const updateProgress = async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    const { progress } = req.body;
    
    if (!userId || !achievementId || progress === undefined) {
      return res.status(400).json({ success: false, error: 'User ID, Achievement ID, and progress are required' });
    }
    
    await achievementService.updateProgress(userId, achievementId, progress);
    res.json({ success: true, message: 'Progress updated successfully' });
  } catch (error) {
    logger.error('Error updating progress:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
};

/**
 * Mark achievement as seen
 */
const markAsSeen = async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    
    if (!userId || !achievementId) {
      return res.status(400).json({ success: false, error: 'User ID and Achievement ID are required' });
    }
    
    await achievementService.markAsSeen(userId, achievementId);
    res.json({ success: true, message: 'Achievement marked as seen' });
  } catch (error) {
    logger.error('Error marking achievement as seen:', error.message);
    res.status(500).json({ success: false, error: 'Failed to mark achievement as seen' });
  }
};

/**
 * Get unseen achievements
 */
const getUnseenAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const unseen = await achievementService.getUnseenAchievements(userId);
    res.json({ success: true, data: unseen });
  } catch (error) {
    logger.error('Error getting unseen achievements:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get unseen achievements' });
  }
};

/**
 * Get completion percentage
 */
const getCompletionPercentage = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const percentage = await achievementService.getCompletionPercentage(userId);
    res.json({ success: true, data: { percentage } });
  } catch (error) {
    logger.error('Error getting completion percentage:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get completion percentage' });
  }
};

module.exports = {
  getDefinitions,
  getUserAchievements,
  getUserStats,
  unlockAchievement,
  updateProgress,
  markAsSeen,
  getUnseenAchievements,
  getCompletionPercentage
};
