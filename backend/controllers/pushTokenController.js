const { prisma } = require('../config/database');

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

    console.log(`📱 Saving push token for user ${userId}: ${token}`);

    // First check if this token exists but belongs to another user
    const existingToken = await prisma.pushToken.findUnique({
      where: { token },
    });

    if (existingToken && existingToken.userId !== userId) {
      console.log(`⚠️ Token ${token} previously belonged to user ${existingToken.userId}, updating to ${userId}`);
    }

    const upsert = await prisma.pushToken.upsert({
      where: { token },
      update: { userId, updatedAt: new Date() },
      create: { token, userId },
    });

    console.log(`✅ Push token saved successfully for user ${userId}`);
    return res.status(200).json({ message: 'Token saved successfully', token: upsert });
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    return res.status(500).json({ message: 'Failed to save push token' });
  }
};

module.exports = { savePushToken };
