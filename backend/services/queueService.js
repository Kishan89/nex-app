// Smart Queue Service with Redis + Fallback
// Provides instant responses with background processing

const { createLogger } = require('../utils/logger');
const logger = createLogger('QueueService');

logger.info('Using fallback queue service (in-memory processing)');
const fallbackQueue = require('./fallbackQueue');

module.exports = {
  addFollowNotificationJob: fallbackQueue.addFollowNotificationJob.bind(fallbackQueue),
  addXpJob: fallbackQueue.addXpJob.bind(fallbackQueue),
  addFollowCountUpdateJob: fallbackQueue.addFollowCountUpdateJob.bind(fallbackQueue)
};
