// controllers/pollController.js
const pollService = require('../services/pollService');
const { successResponse, errorResponse } = require('../utils/helpers');

class PollController {
 
  async castVote(req, res, next) {
    try {
      const { pollId } = req.params;
      const { optionId } = req.body;
      const { userId } = req.user; 

      if (!optionId) {
        return res.status(400).json(errorResponse('optionId is required'));
      }

      const result = await pollService.castVote({ pollId, optionId, userId });

      res.status(201).json(successResponse(result));
    } catch (error) {
      if (error.message.includes('already voted')) {
        return res.status(409).json(errorResponse(error.message)); 
      }
      next(error);
    }
  }
}

module.exports = new PollController();