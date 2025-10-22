// controllers/xpController.js
const xpService = require('../services/xpService');

/**
 * Get XP rules for display in the app
 */
const getXPRules = async (req, res, next) => {
  try {
    const rules = xpService.getXPRules();
    res.status(200).json(rules);
  } catch (error) {
    console.error('❌ Error fetching XP rules:', error);
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
    console.error('❌ Error fetching user XP:', error);
    next(error);
  }
};

module.exports = {
  getXPRules,
  getUserXP
};
