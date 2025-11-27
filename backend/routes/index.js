const express = require('express');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const chatsRouter = require('./chats');
const notificationsRouter = require('./notifications');
const uploadRouter = require('./upload');
const usersRouter = require('./users');
const authRouter = require('./auth');
const pollRoutes = require('./pollRoutes');
const fcmRouter = require('./fcm');
const followRoutes = require('./followRoutes');
const searchRoutes = require('./searchRoutes');
const xpRoutes = require('./xpRoutes');
const versionRoutes = require('./version');
const groupsRouter = require('./groups');
const debugRouter = require('./debug');
const achievementRoutes = require('./achievementRoutes');


const userController = require('../controllers/userController'); 

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

router.get('/search/users', userController.searchUsers);

router.use('/posts', postsRouter);
router.use('/posts/:postId/comments', commentsRouter);
router.use('/chats', chatsRouter);
router.use('/notifications', notificationsRouter);
router.use('/upload', uploadRouter);
router.use('/users', usersRouter);
router.use('/auth', authRouter);
router.use('/polls', pollRoutes);
router.use('/fcm', fcmRouter);
router.use('/follow', followRoutes);
router.use('/search', searchRoutes);
router.use('/xp', xpRoutes);
router.use('/version', versionRoutes);
router.use('/groups', groupsRouter);
router.use('/debug', debugRouter);
router.use('/achievements', achievementRoutes);


module.exports = router;
