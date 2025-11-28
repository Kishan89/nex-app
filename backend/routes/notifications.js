const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Existing notification routes
router.get('/:userId', notificationController.getNotificationsByUserId);
router.put('/:userId/mark-read', notificationController.markNotificationsAsRead);

// OneSignal broadcast notification routes (admin only)
// TODO: Add admin authentication middleware to these routes
router.post('/broadcast', notificationController.sendBroadcastNotification);
router.post('/send-to-users', notificationController.sendToSpecificUsers);
router.post('/send-to-segment', notificationController.sendToSegment);

// Warning notification route (admin only)
router.post('/warning', notificationController.sendWarningNotification);

module.exports = router;