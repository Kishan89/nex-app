const { prisma } = require('../config/database');
const { transformPost } = require('../utils/helpers');
const { removePostDeletionXP, removeCommentXP, removeLikeXP } = require('./xpService');
const youtubeService = require('./youtubeService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PostService');

class PostService {
  async getAllPosts(options = {}) {
    const { page = 1, limit = 20, userId } = options;
    
    // For page 1, include pinned posts at the top
    if (page === 1) {
      // Fetch pinned posts
      const pinnedPosts = await prisma.post.findMany({
        where: { isPinned: true },
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
        orderBy: { createdAt: 'desc' },
      });

      const pinnedCount = pinnedPosts.length;
      
      // Fetch regular posts (limit minus pinned posts count)
      const regularPostsLimit = Math.max(1, limit - pinnedCount);
      const posts = await prisma.post.findMany({
        where: { isPinned: false },
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
        orderBy: { createdAt: 'desc' },
        take: regularPostsLimit,
      });

      // Combine pinned posts first, then regular posts
      const allPosts = [...pinnedPosts, ...posts];
      
      return allPosts.map((post) => {
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
    
    // For page 2+, skip pinned posts and paginate regular posts
    const skip = (page - 1) * limit;
    const posts = await prisma.post.findMany({
      where: { isPinned: false },
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const allPosts = posts;
    
    return allPosts.map((post) => {
      // Add like status to post object
      const postWithStatus = {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
      };
      
      const transformed = transformPost(postWithStatus);
      return transformed;
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
    const { content, imageUrl, userId, pollData } = postData;

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
        userId 
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
      const { page = 1, limit = 20, userId } = options;
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

    // Fetch pinned posts separately (always from page 1)
    const pinnedPosts = page === 1 ? await prisma.post.findMany({
      where: { isPinned: true },
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
      orderBy: { createdAt: 'desc' },
    }) : [];

    // Get posts only from followed users (excluding pinned)
    const posts = await prisma.post.findMany({
      where: {
        isPinned: false,
        userId: {
          in: followedUserIds
        }
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Combine pinned posts first, then regular posts
    const allPosts = [...pinnedPosts, ...posts];
    
    return allPosts.map((post) => {
      // Add like status to post object
      const postWithStatus = {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
      };
      
      const transformed = transformPost(postWithStatus);
      return transformed;
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
    const { page = 1, limit = 20, userId } = options;
    const skip = (page - 1) * limit;

    // Fetch pinned posts separately (always from page 1)
    const pinnedPosts = page === 1 ? await prisma.post.findMany({
      where: { isPinned: true },
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
      orderBy: { createdAt: 'desc' },
    }) : [];

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get posts from the last 7 days with their counts (excluding pinned)
    const posts = await prisma.post.findMany({
      where: {
        isPinned: false,
        createdAt: {
          gte: sevenDaysAgo
        }
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
      skip,
      take: limit,
    });

    
    // Calculate trending score and sort
    const postsWithScores = posts.map((post) => {
      // Calculate trending score: likes * 1 + comments * 2
      const trendingScore = (post.likesCount * 1) + (post.commentsCount * 2);
      
      // Add like status to post object
      const postWithStatus = {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
        trendingScore,
      };
      
      const transformed = transformPost(postWithStatus);
      return { ...transformed, trendingScore };
    });

    // Sort by trending score (highest first)
    postsWithScores.sort((a, b) => b.trendingScore - a.trendingScore);

    // Transform pinned posts
    const transformedPinnedPosts = pinnedPosts.map((post) => {
      const postWithStatus = {
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
      };
      return transformPost(postWithStatus);
    });

    // Combine pinned posts first, then trending posts
    const finalPosts = [...transformedPinnedPosts, ...postsWithScores.map(({ trendingScore, ...post }) => post)];

    return finalPosts;
  }
}

module.exports = new PostService();
