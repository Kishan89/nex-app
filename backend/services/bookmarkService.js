const { prisma } = require('../config/database');

class BookmarkService {
  async toggleBookmark({ postId, userId }) {
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingBookmark) {
      await prisma.$transaction([
        prisma.bookmark.delete({
          where: { id: existingBookmark.id },
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            bookmarksCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { bookmarked: false };
    } else {
      await prisma.$transaction([
        prisma.bookmark.create({
          data: {
            userId,
            postId,
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: {
            bookmarksCount: {
              increment: 1,
            },
          },
        }),
      ]);
      return { bookmarked: true };
    }
  }
}

module.exports = new BookmarkService();