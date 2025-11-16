const { prisma } = require('../config/database');

async function fixGroupAdmins() {
  console.log('🔧 Starting group admin fix...\n');

  try {
    // Get all groups
    const groups = await prisma.chat.findMany({
      where: { isGroup: true },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${groups.length} groups\n`);

    for (const group of groups) {
      console.log(`\n🔍 Checking group: ${group.name} (ID: ${group.id})`);
      console.log(`   Creator ID: ${group.createdById}`);

      // Find creator's participant record
      const creatorParticipant = group.participants.find(
        p => p.userId === group.createdById
      );

      if (!creatorParticipant) {
        console.log(`   ⚠️  Creator not found in participants!`);
        continue;
      }

      console.log(`   Creator: ${creatorParticipant.user.username}`);
      console.log(`   Is Admin: ${creatorParticipant.isAdmin}`);

      // Fix if creator is not admin
      if (!creatorParticipant.isAdmin) {
        console.log(`   🔧 Fixing: Setting creator as admin...`);
        
        await prisma.chatParticipant.update({
          where: {
            id: creatorParticipant.id
          },
          data: {
            isAdmin: true
          }
        });

        console.log(`   ✅ Fixed! Creator is now admin.`);
      } else {
        console.log(`   ✅ Already correct - creator is admin`);
      }

      // Show all admins
      const admins = group.participants.filter(p => p.isAdmin);
      console.log(`   👥 Total admins: ${admins.length}`);
      admins.forEach(admin => {
        console.log(`      - ${admin.user.username} (${admin.userId})`);
      });
    }

    console.log('\n\n✅ Group admin fix completed successfully!');
  } catch (error) {
    console.error('\n❌ Error fixing group admins:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixGroupAdmins()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
