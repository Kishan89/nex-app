// services/pollService.js
const { prisma } = require('../config/database');

class PollService {
  /**
   * Cast a vote on a poll.
   * @param {object} voteData - The data for the vote.
   * @param {string} voteData.pollId - The ID of the poll.
   * @param {string} voteData.optionId - The ID of the chosen option.
   * @param {string} voteData.userId - The ID of the user voting.
   */
  async castVote({ pollId, optionId, userId }) {
    // Check if the user has already voted on this poll
    const existingVote = await prisma.pollVote.findUnique({
      where: {
        userId_pollId: {
          userId,
          pollId,
        },
      },
    });

    if (existingVote) {
      throw new Error('You have already voted on this poll.');
    }

    // Use a transaction to ensure both operations succeed or fail together
    const [newVote] = await prisma.$transaction([
      // 1. Create a new entry in the PollVote table
      prisma.pollVote.create({
        data: {
          pollId,
          pollOptionId: optionId,
          userId,
        },
      }),
      // 2. Increment the votesCount on the chosen PollOption
      prisma.pollOption.update({
        where: {
          id: optionId,
        },
        data: {
          votesCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { success: true, message: 'Vote cast successfully' };
  }
}

module.exports = new PollService();