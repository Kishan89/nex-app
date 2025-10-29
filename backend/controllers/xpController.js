// controllers/xpController.js
const xpService = require('../services/xpService');
const logger = require('../utils/logger');

/**
 * Get XP rules for display in the app
 */
const getXPRules = async (req, res, next) => {
  try {
    const rules = xpService.getXPRules();
    res.status(200).json(rules);
  } catch (error) {
    logger.error('Error fetching XP rules', { error: error.message });
    next(error);
  }
};

/**
 * Get user's current XP
 */
const getUserXP = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const xp = await xpService.getUserXP(userId);
    
    res.status(200).json({ 
      userId,
      xp 
    });
  } catch (error) {
    logger.error('Error fetching user XP', { error: error.message, userId: req.params.userId });
    next(error);
  }
};

module.exports = {
  getXPRules,
  getUserXP
};
