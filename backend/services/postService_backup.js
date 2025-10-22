const { prisma } = require('../config/database');
const { transformPost } = require('../utils/helpers');

class PostService {
  async getAllPosts(options = {}) {
    const { page = 1, limit = 20, userId } = options;
    const skip = (page - 1) * limit;

    console.log('🔹 getAllPosts called', { page, limit, skip, userId });

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
          select: { likes: true, comments: true, bookmarks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    console.log(`🔹 getAllPosts fetched ${posts.length} posts`);
    posts.forEach((p) =>
      console.log(
        '   ➡️ Post:',
        p.id,
        'likes:',
        p._count.likes,
        'comments:',
        p._count.comments,
        'bookmarks:',
        p._count.bookmarks
      )
    );

    return posts.map((post) => {
      const transformed = transformPost(post);
      console.log('   ➡️ Transformed post:', transformed.id);
      return transformed;
    });
  }

  async getPostById(postId) {
    console.log('🔹 getPostById called', { postId });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatar: true, verified: true },
        },
        _count: { select: { likes: true, comments: true, bookmarks: true } },
      },
    console.log('🔹 getPostById result:', post ? post.id : null);
    return post ? transformPost(post) : null;
  }

  async createPost(postData) {
    console.log('🔹 createPost called', postData);

    const { content, imageUrl, userId, pollData } = postData;

    // Create post with potential poll in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the post first
      const post = await tx.post.create({
        data: { 
          content: content || '', 
          imageUrl, 
          userId 
        },
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
      where: { id: postId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, name: true, avatar: true, verified: true } },
        _count: { select: { likes: true, comments: true, bookmarks: true } },
      },
    });

    console.log('🔹 updatePost updated', post.id);
    return transformPost(post);
  }

  async deletePost(postId) {
    console.log('🔹 deletePost called', { postId });

    await prisma.post.delete({ where: { id: postId } });

    console.log('🔹 deletePost completed', { postId });
    return true;
  }

  async toggleLike(postId, userId) {
    console.log('🔹 toggleLike called', { postId, userId });

    const existingLike = await prisma.like.findFirst({ where: { postId, userId } });
    console.log('   ➡️ Existing like:', existingLike ? existingLike.id : null);

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      console.log('   ➡️ Like removed');
      return { liked: false };
    } else {
      await prisma.$transaction([
        prisma.like.create({ data: { postId, userId } }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      console.log('   ➡️ Like added');
      return { liked: true };
    }
  }

  async toggleBookmark(postId, userId) {
    console.log('🔹 toggleBookmark called', { postId, userId });

    const existingBookmark = await prisma.bookmark.findFirst({ where: { postId, userId } });
    console.log('   ➡️ Existing bookmark:', existingBookmark ? existingBookmark.id : null);

    if (existingBookmark) {
      await prisma.$transaction([
        prisma.bookmark.delete({ where: { id: existingBookmark.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { bookmarksCount: { decrement: 1 } },
        }),
      ]);
      console.log('   ➡️ Bookmark removed');
      return { bookmarked: false };
    } else {
      await prisma.$transaction([
        prisma.bookmark.create({ data: { postId, userId } }),
        prisma.post.update({
          where: { id: postId },
          data: { bookmarksCount: { increment: 1 } },
        }),
      ]);
      console.log('   ➡️ Bookmark added');
      return { bookmarked: true };
    }
  }
}

module.exports = new PostService();