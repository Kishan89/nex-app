const express = require('express');
const likeController = require('../controllers/likeController');
const { verifyAuthToken } = require('../middleware/auth'); 

const router = express.Router({ mergeParams: true });


router.post('/', verifyAuthToken, likeController.toggleLike);

module.exports = router;