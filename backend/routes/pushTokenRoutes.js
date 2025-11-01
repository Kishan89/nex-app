const express = require('express');
const router = express.Router();
const pushTokenController = require('../controllers/pushTokenController');
const { verifyAuthToken } = require('../middleware/auth');

router.post('/', verifyAuthToken, pushTokenController.savePushToken);

module.exports = router;