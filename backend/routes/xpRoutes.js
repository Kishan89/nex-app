// routes/xpRoutes.js
const express = require('express');
const xpController = require('../controllers/xpController');
const { verifyAuthToken } = require('../middleware/auth');

const router = express.Router();

// Get XP rules (public endpoint)
router.get('/rules', xpController.getXPRules);

// Get user's XP (protected endpoint)
router.get('/user/:userId', verifyAuthToken, xpController.getUserXP);

module.exports = router;
