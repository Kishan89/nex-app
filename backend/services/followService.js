const { prisma } = require('../config/database');

class FollowService {
  /**
   * Follow a user
   * @param {string} followerId - ID of the user who wants to follow
   * @param {string} followingId - ID of the user to be followed
   * @returns {Promise<Object>} - Follow relationship
   */
  async followUser(followerId, followingId) {
    try {
      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      const follow = await prisma.follow.create({
        data: {
          followerId,
          followingId
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          following: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        }
      });

      // 🚀 INSTANT RETURN: Skip count updates for speed
      // Count updates will be handled by background queue
      return follow;
    } catch (error) {
      console.error('Error in followUser:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param {string} followerId - ID of the user who wants to unfollow
   * @param {string} followingId - ID of the user to be unfollowed
   * @returns {Promise<boolean>} - Success status
   */
  async unfollowUser(followerId, followingId) {
    try {
      const deletedFollow = await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      // 🚀 INSTANT RETURN: Skip count updates for speed
      // Count updates will be handled by background queue
      return !!deletedFollow;
    } catch (error) {
      console.error('Error in unfollowUser:', error);
      throw error;
    }
  }

  /**
   * Check if user A follows user B
   * @param {string} followerId - ID of the follower
   * @param {string} followingId - ID of the user being followed
   * @returns {Promise<boolean>} - Follow status
   */
  async isFollowing(followerId, followingId) {
    try {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      return !!follow;
    } catch (error) {
      console.error('Error in isFollowing:', error);
      return false;
    }
  }

  /**
   * Get users that a user is following
   * @param {string} userId - User ID
   * @param {number} limit - Number of results to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - List of followed users
   */
  async getFollowing(userId, limit = 20, offset = 0) {
    try {
      const following = await prisma.follow.findMany({
        where: {
          followerId: userId
        },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              verified: true,
              isOnline: true,
              lastSeen: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return following.map(f => f.following);
    } catch (error) {
      console.error('Error in getFollowing:', error);
      throw error;
    }
  }

  /**
   * Get users that follow a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of results to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - List of followers
   */
  async getFollowers(userId, limit = 20, offset = 0) {
    try {
      const followers = await prisma.follow.findMany({
        where: {
          followingId: userId
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              verified: true,
              isOnline: true,
              lastSeen: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return followers.map(f => f.follower);
    } catch (error) {
      console.error('Error in getFollowers:', error);
      throw error;
    }
  }

  /**
   * Get follow counts for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Follow counts
   */
  async getFollowCounts(userId) {
    try {
      const [followingCount, followersCount] = await Promise.all([
        prisma.follow.count({
          where: { followerId: userId }
        }),
        prisma.follow.count({
          where: { followingId: userId }
        })
      ]);

      return {
        following: followingCount,
        followers: followersCount
      };
    } catch (error) {
      console.error('Error in getFollowCounts:', error);
      throw error;
    }
  }

  /**
   * Get and update follow counts for a user (ensures database consistency)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated follow counts
   */
  async getAndUpdateFollowCounts(userId) {
    try {
      // Get actual counts from follow relationships
      const counts = await this.getFollowCounts(userId);
      
      // Note: User table doesn't have following_count/followers_count columns
      // So we just return the calculated counts without updating stored values
      console.log(`✅ Retrieved follow counts for user ${userId}: following: ${counts.following}, followers: ${counts.followers}`);
      return counts;
    } catch (error) {
      console.error('Error in getAndUpdateFollowCounts:', error);
      throw error;
    }
  }

  /**
   * Get users that can be messaged (followed users)
   * @param {string} userId - Current user ID
   * @returns {Promise<Array>} - List of users that can be messaged
   */
  async getMessagableUsers(userId) {
    try {
      const following = await this.getFollowing(userId, 100, 0);
      return following.filter(user => user.id !== userId);
    } catch (error) {
      console.error('Error in getMessagableUsers:', error);
      throw error;
    }
  }

  /**
   * Update follow counts (helper method)
   * @private
   */
  async updateFollowCounts(followerId, followingId) {
    try {
      // Get actual counts from database for logging
      const [followerCounts, followingCounts] = await Promise.all([
        this.getFollowCounts(followerId),
        this.getFollowCounts(followingId)
      ]);

      // Note: User table doesn't have following_count/followers_count columns
      // Counts are calculated dynamically from Follow relationships
      console.log(`✅ Follow counts calculated: ${followerId} following: ${followerCounts.following}, ${followingId} followers: ${followingCounts.followers}`);
    } catch (error) {
      console.error('❌ Error calculating follow counts:', error);
      // Don't throw error to prevent follow/unfollow operation from failing
    }
  }
}

module.exports = new FollowService();
