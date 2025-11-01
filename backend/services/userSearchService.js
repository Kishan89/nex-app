const { prisma } = require('../config/database');

class UserSearchService {
  /**
   * Search for users by username, name, or email
   * @param {string} query - Search query
   * @param {string} currentUserId - ID of the user performing the search
   * @param {number} limit - Number of results to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - List of users matching the search
   */
  async searchUsers(query, currentUserId, limit = 20, offset = 0) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchTerm = query.trim().toLowerCase();

      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              id: {
                not: currentUserId // Exclude current user from search results
              }
            },
            {
              OR: [
                {
                  username: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  email: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          ]
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
          isOnline: true,
          lastSeen: true,
          // Include follow relationship with current user
          followers: {
            where: {
              followerId: currentUserId
            },
            select: {
              id: true
            }
          },
          following: {
            where: {
              followingId: currentUserId
            },
            select: {
              id: true
            }
          }
        },
        orderBy: [
          {
            verified: 'desc' // Verified users first
          },
          {
            username: 'asc' // Then alphabetical
          }
        ],
        take: limit,
        skip: offset
      });

      // Add follow status to each user
      return users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isFollowing: user.followers.length > 0,
        isFollower: user.following.length > 0
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get suggested users to follow
   * @param {string} currentUserId - ID of the current user
   * @param {number} limit - Number of suggestions to return
   * @returns {Promise<Array>} - List of suggested users
   */
  async getSuggestedUsers(currentUserId, limit = 10) {
    try {
      // Get users that current user is not following
      const suggestedUsers = await prisma.user.findMany({
        where: {
          AND: [
            {
              id: {
                not: currentUserId
              }
            },
            {
              NOT: {
                followers: {
                  some: {
                    followerId: currentUserId
                  }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
          isOnline: true,
          // Count followers for popularity
          _count: {
            select: {
              followers: true,
              posts: true
            }
          }
        },
        orderBy: [
          {
            verified: 'desc'
          },
          {
            followers: {
              _count: 'desc'
            }
          }
        ],
        take: limit
      });

      return suggestedUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        isOnline: user.isOnline,
        followersCount: user._count.followers,
        postsCount: user._count.posts,
        isFollowing: false
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent users (for quick access)
   * @param {string} currentUserId - ID of the current user
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} - List of recent users
   */
  async getRecentUsers(currentUserId, limit = 10) {
    try {
      const recentUsers = await prisma.user.findMany({
        where: {
          id: {
            not: currentUserId
          }
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
          isOnline: true,
          lastSeen: true,
          followers: {
            where: {
              followerId: currentUserId
            },
            select: {
              id: true
            }
          }
        },
        orderBy: {
          lastSeen: 'desc'
        },
        take: limit
      });

      return recentUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isFollowing: user.followers.length > 0
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top XP users for search suggestions
   * @param {string} currentUserId - ID of the current user
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} - List of top XP users
   */
  async getTopXPUsers(currentUserId, limit = 10) {
    try {
      
      const topXPUsers = await prisma.user.findMany({
        // Remove the exclusion of current user - include everyone
        where: {},
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
          isOnline: true,
          xp: true,
          followers: {
            where: {
              followerId: currentUserId
            },
            select: {
              id: true
            }
          },
          _count: {
            select: {
              followers: true,
              posts: true
            }
          }
        },
        orderBy: [
          {
            xp: 'desc'
          },
          {
            verified: 'desc'
          }
        ],
        take: limit
      });

      
      const mappedUsers = topXPUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        isOnline: user.isOnline,
        xp: user.xp,
        followersCount: user._count.followers,
        postsCount: user._count.posts,
        isFollowing: user.followers.length > 0
      }));
      
      
      return mappedUsers;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserSearchService();
