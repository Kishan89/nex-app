// Test script to verify comment like functionality
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCommentLike() {
  try {
    console.log('🧪 Testing comment like functionality...\n');
    
    // Get a random comment
    const comment = await prisma.comment.findFirst({
      select: {
        id: true,
        likesCount: true,
        _count: {
          select: { likes: true }
        }
      }
    });
    
    if (!comment) {
      console.log('❌ No comments found in database');
      return;
    }
    
    console.log('📝 Comment found:', {
      id: comment.id,
      likesCount: comment.likesCount,
      actualLikes: comment._count.likes
    });
    
    // Check if likesCount matches actual likes
    if (comment.likesCount !== comment._count.likes) {
      console.log('\n⚠️  MISMATCH DETECTED!');
      console.log(`   likesCount field: ${comment.likesCount}`);
      console.log(`   Actual likes: ${comment._count.likes}`);
      console.log('\n🔧 Fixing mismatch...');
      
      // Fix the mismatch
      await prisma.comment.update({
        where: { id: comment.id },
        data: { likesCount: comment._count.likes }
      });
      
      console.log('✅ Fixed!');
    } else {
      console.log('\n✅ likesCount is in sync with actual likes');
    }
    
    // Test increment
    console.log('\n🧪 Testing increment...');
    const before = await prisma.comment.findUnique({
      where: { id: comment.id },
      select: { likesCount: true }
    });
    
    await prisma.comment.update({
      where: { id: comment.id },
      data: { likesCount: { increment: 1 } }
    });
    
    const after = await prisma.comment.findUnique({
      where: { id: comment.id },
      select: { likesCount: true }
    });
    
    console.log(`   Before: ${before.likesCount}`);
    console.log(`   After: ${after.likesCount}`);
    
    if (after.likesCount === before.likesCount + 1) {
      console.log('✅ Increment works!');
    } else {
      console.log('❌ Increment failed!');
    }
    
    // Restore original value
    await prisma.comment.update({
      where: { id: comment.id },
      data: { likesCount: before.likesCount }
    });
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommentLike();
