// routes/auth.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Google OAuth route
router.post('/google/mobile', userController.googleLogin);

module.exports = router;
