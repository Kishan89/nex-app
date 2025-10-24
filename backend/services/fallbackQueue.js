// Fallback queue service for when Redis is not available
// Uses in-memory processing with setTimeout for background jobs

const notificationService = require('./notificationService');
const { sendFollowNotification } = require('./fcmService');
const xpService = require('./xpService');
const socketService = require('./socketService');

class FallbackQueueService {
  constructor() {
    this.jobId = 0;
    console.log('⚠️ Using fallback queue service (in-memory processing)');
  }

  // Process follow notification job
  async processFollowNotification(userId, followerId, followerUsername) {
    try {
      console.log(`🔔 Processing follow notification: ${followerUsername} -> ${userId}`);
      
      // Create in-app notification
      await notificationService.createNotification({
        userId: userId,
        fromUserId: followerId,
        type: 'FOLLOW',
        message: `${followerUsername} started following you`
      });

      // Send FCM push notification
      await sendFollowNotification(userId, followerId, followerUsername);
      
      // Emit real-time update via WebSocket
      socketService.emitToUser(userId, 'notification', {
        type: 'FOLLOW',
        message: `${followerUsername} started following you`,
        fromUserId: followerId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Follow notification sent successfully`);
    } catch (error) {
      console.error('❌ Failed to send follow notification:', error);
    }
  }

  // Process XP award job
  async processXpAward(userId) {
    try {
      console.log(`🎯 Processing XP award for user: ${userId}`);
      
      const result = await xpService.awardPostCreationXP(userId);
      
      // Emit XP update via WebSocket
      socketService.emitToUser(userId, 'xp-update', {
        type: 'POST_CREATION',
        xpAwarded: result.xpAwarded,
        totalXp: result.totalXp,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ XP awarded successfully: ${result.xpAwarded} XP`);
    } catch (error) {
      console.error('❌ Failed to award XP:', error);
    }
  }

  // Process follow count update job
  async processFollowCountUpdate(userId, followedUserId) {
    try {
      console.log(`📊 Processing follow count updates: ${userId} -> ${followedUserId}`);
      
      const followService = require('./followService');
      
      // Update both users' follow counts
      const [followerCounts, followedCounts] = await Promise.all([
        followService.getAndUpdateFollowCounts(userId),
        followService.getAndUpdateFollowCounts(followedUserId)
      ]);
      
      // Emit updates via WebSocket
      socketService.emitToUser(userId, 'follow-counts-update', {
        userId,
        counts: followerCounts,
        timestamp: new Date().toISOString()
      });
      
      socketService.emitToUser(followedUserId, 'follow-counts-update', {
        userId: followedUserId,
        counts: followedCounts,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Follow counts updated successfully`);
    } catch (error) {
      console.error('❌ Failed to update follow counts:', error);
    }
  }

  // Add follow notification job
  addFollowNotificationJob(userId, followerId, followerUsername) {
    const jobId = ++this.jobId;
    console.log(`📋 Queuing follow notification job ${jobId} (fallback)`);
    
    // Process in background with small delay
    setTimeout(() => {
      this.processFollowNotification(userId, followerId, followerUsername);
    }, 100);
    
    return Promise.resolve({ id: jobId });
  }

  // Add XP job
  addXpJob(userId) {
    const jobId = ++this.jobId;
    console.log(`📋 Queuing XP job ${jobId} (fallback)`);
    
    // Process in background with small delay
    setTimeout(() => {
      this.processXpAward(userId);
    }, 50);
    
    return Promise.resolve({ id: jobId });
  }

  // Add follow count update job
  addFollowCountUpdateJob(userId, followedUserId) {
    const jobId = ++this.jobId;
    console.log(`📋 Queuing follow count update job ${jobId} (fallback)`);
    
    // Process in background with small delay
    setTimeout(() => {
      this.processFollowCountUpdate(userId, followedUserId);
    }, 200);
    
    return Promise.resolve({ id: jobId });
  }
}

module.exports = new FallbackQueueService();
