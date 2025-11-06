const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');
const { authenticate } = require('../middleware/auth');

// Public route - no authentication required
// GET /api/version/check?version=1.0.11&platform=android
router.get('/check', versionController.checkVersion);

// Public route - get current version info
// GET /api/version/current?platform=android
router.get('/current', versionController.getCurrentVersion);

// Protected route - admin only (you can add admin middleware later)
// POST /api/version/update
router.post('/update', authenticate, versionController.updateVersion);

module.exports = router;
