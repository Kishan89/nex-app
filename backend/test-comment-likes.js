// Test script to check comment likes in database
const { prisma } = require('./config/database');

async function testCommentLikes() {
  try {
    console.log('🔍 Checking comment_likes table...\n');
    
    // Get all comment likes
    const allLikes = await prisma.commentLike.findMany({
      include: {
        user: { select: { username: true } },
        comment: { select: { text: true } }
      },
      take: 10
    });
    
    console.log(`📊 Total comment likes in database: ${allLikes.length}\n`);
    
    if (allLikes.length > 0) {
      console.log('Sample likes:');
      allLikes.forEach((like, i) => {
        console.log(`${i + 1}. User: ${like.user.username}, Comment: "${like.comment.text.substring(0, 50)}..."`);
      });
    } else {
      console.log('⚠️  No comment likes found in database!');
      console.log('Try liking a comment first, then run this script again.');
    }
    
    console.log('\n🔍 Checking comments with likesCount...\n');
    
    // Get comments with likes
    const commentsWithLikes = await prisma.comment.findMany({
      where: {
        likesCount: { gt: 0 }
      },
      select: {
        id: true,
        text: true,
        likesCount: true,
        likes: {
          include: {
            user: { select: { username: true } }
          }
        }
      },
      take: 10
    });
    
    console.log(`📊 Comments with likes: ${commentsWithLikes.length}\n`);
    
    if (commentsWithLikes.length > 0) {
      commentsWithLikes.forEach((comment, i) => {
        console.log(`${i + 1}. Comment: "${comment.text.substring(0, 50)}..."`);
        console.log(`   likesCount: ${comment.likesCount}`);
        console.log(`   Actual likes: ${comment.likes.length}`);
        console.log(`   Liked by: ${comment.likes.map(l => l.user.username).join(', ')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No comments with likesCount > 0 found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommentLikes();
