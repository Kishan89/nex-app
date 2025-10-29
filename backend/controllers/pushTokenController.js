const { prisma } = require('../config/database');
const logger = require('../utils/logger');

const savePushToken = async (req, res) => {
  try {
    const { token } = req.body; 
    const userId = req.user?.userId;

    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    logger.info('Saving push token', { userId, tokenPreview: token.substring(0, 20) + '...' });

    // First check if this token exists but belongs to another user
    const existingToken = await prisma.pushToken.findUnique({
      where: { token },
    });

    if (existingToken && existingToken.userId !== userId) {
      logger.info('Updating push token ownership', { oldUserId: existingToken.userId, newUserId: userId });
    }

    const upsert = await prisma.pushToken.upsert({
      where: { token },
      update: { userId, updatedAt: new Date() },
      create: { token, userId },
    });

    logger.info('Push token saved successfully', { userId });
    return res.status(200).json({ message: 'Token saved successfully', token: upsert });
  } catch (error) {
    logger.error('Error saving push token', { error: error.message, userId });
    return res.status(500).json({ message: 'Failed to save push token' });
  }
};

module.exports = { savePushToken };
