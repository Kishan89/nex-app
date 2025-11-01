const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/:userId', notificationController.getNotificationsByUserId);
router.put('/:userId/mark-read', notificationController.markNotificationsAsRead);

module.exports = router;