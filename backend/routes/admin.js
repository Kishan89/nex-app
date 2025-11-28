// routes/admin.js
const express = require('express');
const router = express.Router();
const { 
  banUser, 
  unbanUser, 
  getBannedUsers, 
  checkBanStatus 
} = require('../controllers/userAdminController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

// All admin routes require authentication and admin privileges
router.use(authenticate);

// Ban/unban user endpoints - require admin
router.post('/users/ban', requireAdmin, banUser);
router.post('/users/unban', requireAdmin, unbanUser);
router.get('/users/banned', requireAdmin, getBannedUsers);

// Check ban status - authenticated users can check
router.get('/users/:userId/ban-status', checkBanStatus);

module.exports = router;
