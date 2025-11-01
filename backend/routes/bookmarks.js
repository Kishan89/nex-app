const express = require('express');
const bookmarkController = require('../controllers/bookmarkController');
const { verifyAuthToken } = require('../middleware/auth'); 

const router = express.Router({ mergeParams: true });

router.post('/', verifyAuthToken, bookmarkController.toggleBookmark);

module.exports = router;