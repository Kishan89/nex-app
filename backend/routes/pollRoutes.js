// routes/pollRoutes.js
const express = require('express');
const pollController = require('../controllers/pollController');
const { verifyAuthToken } = require('../middleware/auth'); 

const router = express.Router();

router.post('/:pollId/vote', verifyAuthToken, pollController.castVote);

module.exports = router;