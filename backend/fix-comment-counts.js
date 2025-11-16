const { prisma } = require('./config/database');

async function fixCommentCounts() {
  try {
    console.log('🔄 Updating comment counts for all posts...');
    
    // Update commentsCount for all posts
    const result = await prisma.$executeRaw`
      UPDATE posts 
      SET "commentsCount" = (
        SELECT COUNT(*) 
        FROM comments 
        WHERE comments."postId" = posts.id
      )
    `;
    
    console.log('✅ Comment counts updated successfully!');
    console.log(`📊 Updated ${result} posts`);
    
    // Verify the update
    const postsWithComments = await prisma.post.findMany({
      where: {
        commentsCount: {
          gt: 0
        }
      },
      select: {
        id: true,
        commentsCount: true,
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    console.log(`📈 Found ${postsWithComments.length} posts with comments:`);
    postsWithComments.forEach(post => {
      console.log(`  Post ${post.id.substring(0, 8)}: commentsCount=${post.commentsCount}, actual=${post._count.comments}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating comment counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommentCounts();