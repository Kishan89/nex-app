// Script to fix likesCount for all comments
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllCommentLikes() {
  try {
    console.log('🔧 Fixing likesCount for all comments...\n');
    
    // Get all comments with their actual like counts
    const comments = await prisma.comment.findMany({
      select: {
        id: true,
        likesCount: true,
        _count: {
          select: { likes: true }
        }
      }
    });
    
    console.log(`📊 Found ${comments.length} comments\n`);
    
    let fixed = 0;
    let alreadyCorrect = 0;
    
    for (const comment of comments) {
      const actualLikes = comment._count.likes;
      const storedLikes = comment.likesCount;
      
      if (storedLikes !== actualLikes) {
        console.log(`🔧 Fixing comment ${comment.id.substring(0, 8)}: ${storedLikes} → ${actualLikes}`);
        
        await prisma.comment.update({
          where: { id: comment.id },
          data: { likesCount: actualLikes }
        });
        
        fixed++;
      } else {
        alreadyCorrect++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} comments`);
    console.log(`✅ ${alreadyCorrect} comments were already correct`);
    console.log('\n🎉 All done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCommentLikes();
