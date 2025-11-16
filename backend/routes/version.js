const express = require('express');
const router = express.Router();

// Debug: Check if versionController loads properly
let versionController;
try {
  versionController = require('../controllers/versionController');
  console.log('✅ versionController loaded:', {
    checkVersion: typeof versionController.checkVersion,
    getCurrentVersion: typeof versionController.getCurrentVersion,
    updateVersion: typeof versionController.updateVersion
  });
} catch (error) {
  console.error('❌ Failed to load versionController:', error.message);
  // Provide fallback handlers to prevent crash
  versionController = {
    checkVersion: (req, res) => res.status(503).json({ success: false, message: 'Version service unavailable' }),
    getCurrentVersion: (req, res) => res.status(503).json({ success: false, message: 'Version service unavailable' }),
    updateVersion: (req, res) => res.status(503).json({ success: false, message: 'Version service unavailable' })
  };
}

const { verifyAuthToken } = require('../middleware/auth');

// Public route - no authentication required
// GET /api/version/check?version=1.0.11&platform=android
router.get('/check', versionController.checkVersion);

// Public route - get current version info
// GET /api/version/current?platform=android
router.get('/current', versionController.getCurrentVersion);

// Protected route - admin only (you can add admin middleware later)
// POST /api/version/update
router.post('/update', verifyAuthToken, versionController.updateVersion);

module.exports = router;
