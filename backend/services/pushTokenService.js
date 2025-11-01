const { prisma } = require('../config/database');

async function savePushTokenService({ token, userId }) {
  // Upsert token in DB (if exists, update timestamp & user; else create)
  return await prisma.pushToken.upsert({
    where: { token },
    update: { userId, createdAt: new Date() },
    create: { token, userId },
  });
}

module.exports = { savePushTokenService };
