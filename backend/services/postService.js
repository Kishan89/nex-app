const { prisma } = require('../config/database');
const { transformPost } = require('../utils/helpers');
const { removePostDeletionXP, removeCommentXP, removeLikeXP } = require('./xpService');
const youtubeService = require('./youtubeService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PostService');

class PostService {
  async getAllPosts(options = {}) {
    const { page = 1, limit = 15, userId } = options;
    const skip = (page - 1) * limit;
    
    // OPTIMIZED: Single query with custom ordering
    const posts = await prisma.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true
          }
        },
        poll: {
          select: {
            id: true,
            question: true,
            options: {
              select: {
                id: true,
                text: true,
                votesCount: true,
                _count: { select: { votes: true } }
              }
            }
          }
        },
        likes: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
        bookmarks: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
      },
      orderBy: [
        { isLive: 'desc' },      // Live posts first
        { isPinned: 'desc' },    // Then pinned posts
        { createdAt: 'desc' }    // Then by newest
      ],
      skip,
      take: limit,
    });
    
    return posts.map((post) => {
      const postWithStatus = {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
      };
      delete postWithStatus.likes;
      delete postWithStatus.bookmarks;
      return transformPost(postWithStatus);
    });
  }

  async getPostById(postId, userId = null) {

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatar: true, verified: true },
        },
        poll: {
          select: {
            id: true,
            question: true,
            options: {
              select: {
                id: true,
                text: true,
                votesCount: true,
                _count: { select: { votes: true } }
              }
            }
          }
        },
        // Include like status for authenticated user
        likes: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
        bookmarks: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
      },
    });

    if (!post) {
      return null;
    }

    // Add like status to post object
    const postWithStatus = {
      ...post,
      isLiked: userId ? post.likes.length > 0 : false,
      isBookmarked: userId ? post.bookmarks.length > 0 : false,
    };

    return transformPost(postWithStatus);
  }

  async createPost(postData) {
    const { content, imageUrl, userId, pollData, isAnonymous } = postData;

    // Process content for YouTube links
    let processedContent = content || '';
    let youtubeData = null;

    try {
      const processed = await youtubeService.processPostContent(processedContent);
      processedContent = processed.content;
      youtubeData = processed.youtubeData;
    } catch (error) {
      logger.error('Error processing YouTube content:', error);
      // Continue with original content if YouTube processing fails
    }

    // Create post with potential poll in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare post data
      const postCreateData = { 
        content: processedContent, 
        imageUrl, 
        userId,
        isAnonymous: Boolean(isAnonymous)
      };

      // Add YouTube data if available
      if (youtubeData) {
        postCreateData.youtubeVideoId = youtubeData.videoId;
        postCreateData.youtubeTitle = youtubeData.title;
        postCreateData.youtubeAuthor = youtubeData.author;
        postCreateData.youtubeThumbnail = youtubeData.thumbnail;
        postCreateData.youtubeUrl = youtubeData.url;
        postCreateData.youtubeDuration = youtubeData.duration;
      }

      // Create the post first
      const post = await tx.post.create({
        data: postCreateData,
      });

      // If poll data is provided, create the poll and options
      if (pollData && pollData.question && pollData.options && pollData.options.length >= 2) {
        const poll = await tx.poll.create({
          data: {
            question: pollData.question,
            postId: post.id,
          },
        });

        // Create poll options
        const optionPromises = pollData.options.map((optionText) =>
          tx.pollOption.create({
            data: {
              text: optionText,
              pollId: poll.id,
            },
          })
        );

        await Promise.all(optionPromises);
      }

      // Return the complete post with all relations
      return await tx.post.findUnique({
        where: { id: post.id },
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true, verified: true } },
          _count: { select: { likes: true, comments: true, bookmarks: true } },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } }
                }
              }
            }
          }
        },
      });
    });

    return transformPost(result);
  }

  async updatePost(postId, updateData) {

    const post = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true, bookmarks: true } },
        poll: {
          include: {
            options: {
              include: {
                _count: { select: { votes: true } }
              }
            }
          }
        }
      },
    });

    return transformPost(post);
  }

  async reportPost(postId) {
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        reportsCount: {
          increment: 1
        }
      }
    });
    
    return { success: true, reportsCount: post.reportsCount };
  }

  async deletePost(postId, userId = null) {
    try {
      // Get post details before deletion to calculate XP reductions
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          _count: {
            select: {
              likes: true,
              comments: true
            }
          },
          likes: {
            select: { id: true }
          },
          comments: {
            select: { id: true }
          }
        }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Delete the post (cascade will handle likes, comments, etc.)
      await prisma.post.delete({ where: { id: postId } });

      // Remove XP from post owner for deleting their post
      if (post.userId) {
        try {
          await removePostDeletionXP(post.userId);
          logger.info('XP removed from user for post deletion');
        } catch (xpError) {
          logger.error('Failed to remove post deletion XP:', xpError);
        }

        // Remove XP for all likes the post received
        if (post._count.likes > 0) {
          try {
            // Remove XP for each like (1 XP per like)
            for (let i = 0; i < post._count.likes; i++) {
              await removeLikeXP(post.userId);
            }
            logger.info('XP removed for likes on deleted post', { likesCount: post._count.likes });
          } catch (xpError) {
            logger.error('Failed to remove like XP for deleted post:', xpError);
          }
        }

        // Remove XP for all comments the post received  
        if (post._count.comments > 0) {
          try {
            // Remove XP for each comment (2 XP per comment)
            for (let i = 0; i < post._count.comments; i++) {
              await removeCommentXP(post.userId);
            }
            logger.info('XP removed for comments on deleted post', { commentsCount: post._count.comments });
          } catch (xpError) {
            logger.error('Failed to remove comment XP for deleted post:', xpError);
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Error in deletePost:', error);
      throw error;
    }
  }

  async toggleLike(postId, userId) {

    const existingLike = await prisma.like.findFirst({ where: { postId, userId } });

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      await prisma.$transaction([
        prisma.like.create({ data: { postId, userId } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      return { liked: true };
    }
  }

  async getFollowingPosts(options = {}) {
    try {
      const { page = 1, limit = 15, userId } = options;
      const skip = (page - 1) * limit;

      logger.debug('getFollowingPosts called', { page, limit, userId });

      if (!userId) {
        logger.warn('No userId provided for getFollowingPosts');
        return [];
      }

      // Get list of users that current user follows
      logger.debug('Fetching followed users', { userId });
      const followedUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });

      const followedUserIds = followedUsers.map(follow => follow.followingId);
      logger.debug('Found followed users', { count: followedUserIds.length });

      if (followedUserIds.length === 0) {
        logger.debug('User follows no one');
        return [];
      }

      // OPTIMIZED: Single query with OR condition for followed users
      // IMPORTANT: Exclude anonymous posts from Following feed (can't follow anonymous users)
      const posts = await prisma.post.findMany({
        where: {
          AND: [
            { isAnonymous: false }, // Exclude anonymous posts from Following feed
            {
              OR: [
                { isLive: true },  // Always show live posts
                { isPinned: true }, // Always show pinned posts
                { userId: { in: followedUserIds } } // Show posts from followed users
              ]
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              verified: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true
            }
          },
          poll: {
            select: {
              id: true,
              question: true,
              options: {
                select: {
                  id: true,
                  text: true,
                  votesCount: true,
                  _count: { select: { votes: true } }
                }
              }
            }
          },
          likes: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
          bookmarks: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
        },
        orderBy: [
          { isLive: 'desc' },    // Live posts first
          { isPinned: 'desc' },  // Pinned posts second
          { createdAt: 'desc' }  // Then by newest
        ],
        skip,
        take: limit,
      });
      
      return posts.map((post) => {
        const postWithStatus = {
          ...post,
          isLiked: userId ? post.likes.length > 0 : false,
          isBookmarked: userId ? post.bookmarks.length > 0 : false,
        };
        delete postWithStatus.likes;
        delete postWithStatus.bookmarks;
        return transformPost(postWithStatus);
      });
    } catch (error) {
      logger.error('Error in getFollowingPosts:', error);
      throw error;
    }
  }

  async toggleBookmark(postId, userId) {

    const existingBookmark = await prisma.bookmark.findFirst({ where: { postId, userId } });

    if (existingBookmark) {
      await prisma.$transaction([
        prisma.bookmark.delete({ where: { id: existingBookmark.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { bookmarksCount: { decrement: 1 } },
        }),
      ]);
      return { bookmarked: false };
    } else {
      await prisma.$transaction([
        prisma.bookmark.create({ data: { postId, userId } }),
        prisma.post.update({
          where: { id: postId },
          data: { bookmarksCount: { increment: 1 } },
        }),
      ]);
      return { bookmarked: true };
    }
  }

  async getTrendingPosts(options = {}) {
    const { page = 1, limit = 15, userId } = options;

    console.log('📊 getTrendingPosts called:', { page, limit, userId });

    // Calculate date 7 days ago for trending
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch ALL posts from last 7 days (no skip/take yet)
    const allPosts = await prisma.post.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true
          }
        },
        poll: {
          select: {
            id: true,
            question: true,
            options: {
              select: {
                id: true,
                text: true,
                votesCount: true,
                _count: { select: { votes: true } }
              }
            }
          }
        },
        likes: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
        bookmarks: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
      },
    });

    // Calculate trending score: (1 * likes) + (2 * comments)
    const postsWithScore = allPosts.map((post) => {
      const trendingScore = (post.likesCount * 1) + (post.commentsCount * 2);
      return {
        ...post,
        trendingScore,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
      };
    });

    // Sort by: Live > Pinned > Trending Score > Newest
    const sortedPosts = postsWithScore.sort((a, b) => {
      // Live posts first (highest priority)
      if (a.isLive !== b.isLive) return b.isLive ? 1 : -1;
      // Pinned posts second
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      // Trending score (higher is better) - main sort for regular posts
      if (a.trendingScore !== b.trendingScore) return b.trendingScore - a.trendingScore;
      // Newest first as tiebreaker
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedPosts = sortedPosts.slice(skip, skip + limit);

    console.log('📊 Trending results:', { 
      totalPosts: allPosts.length, 
      sortedCount: sortedPosts.length,
      page, 
      skip, 
      limit,
      returning: paginatedPosts.length 
    });

    return paginatedPosts.map((post) => {
      const postWithoutLikes = { ...post };
      delete postWithoutLikes.likes;
      delete postWithoutLikes.bookmarks;
      delete postWithoutLikes.trendingScore; // Remove score from response
      return transformPost(postWithoutLikes);
    });
  }
}

module.exports = new PostService();
