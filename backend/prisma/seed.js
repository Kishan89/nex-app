const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alex@example.com',
        username: 'alexsmith',
        name: 'Alex Smith',
        avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
        bio: 'Tech enthusiast and app developer',
        verified: true,
        isOnline: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'design@example.com',
        username: 'designguru',
        name: 'Design Guru',
        avatar: 'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=100',
        bio: 'UI/UX Designer passionate about clean design',
        verified: true,
        isOnline: false,
        lastSeen: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
    }),
    prisma.user.create({
      data: {
        email: 'tech@example.com',
        username: 'techvision',
        name: 'Tech Vision',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100',
        bio: 'Future of technology and innovation',
        verified: false,
        isOnline: false,
        lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
    }),
    prisma.user.create({
      data: {
        email: 'you@example.com',
        username: 'you',
        name: 'You',
        avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100',
        bio: 'Your profile',
        verified: false,
        isOnline: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        content: 'Just launched my new app! Excited to share this journey with everyone. The future of social media is here! 🚀',
        imageUrl: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
        userId: users[0].id, // Alex Smith
      },
    }),
    prisma.post.create({
      data: {
        content: 'Working on some amazing UI concepts today. The intersection of technology and art never ceases to amaze me.',
        userId: users[1].id, // Design Guru
      },
    }),
    prisma.post.create({
      data: {
        content: 'The next wave of innovation is coming. Are you ready to be part of something extraordinary?',
        imageUrl: 'https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800',
        userId: users[2].id, // Tech Vision
      },
    }),
  ]);

  console.log(`✅ Created ${posts.length} posts`);

  // Create some likes
  await prisma.like.createMany({
    data: [
      { userId: users[1].id, postId: posts[0].id },
      { userId: users[2].id, postId: posts[0].id },
      { userId: users[3].id, postId: posts[0].id },
      { userId: users[0].id, postId: posts[1].id },
      { userId: users[2].id, postId: posts[1].id },
      { userId: users[3].id, postId: posts[1].id },
      { userId: users[0].id, postId: posts[2].id },
      { userId: users[1].id, postId: posts[2].id },
    ],
  });

  console.log('✅ Created likes');

  // Create comments
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        text: "This looks amazing! Can't wait to try it out.",
        postId: posts[0].id,
        userId: users[2].id,
      },
    }),
    prisma.comment.create({
      data: {
        text: 'Great work on the UI! Very clean and modern.',
        postId: posts[0].id,
        userId: users[1].id,
      },
    }),
    prisma.comment.create({
      data: {
        text: 'The color palette is perfect! 🎨',
        postId: posts[1].id,
        userId: users[0].id,
      },
    }),
  ]);

  console.log(`✅ Created ${comments.length} comments`);

  // Create follow relationships
  await prisma.follow.createMany({
    data: [
      { followerId: users[0].id, followingId: users[1].id },
      { followerId: users[0].id, followingId: users[2].id },
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[1].id, followingId: users[2].id },
      { followerId: users[2].id, followingId: users[0].id },
      { followerId: users[3].id, followingId: users[0].id },
      { followerId: users[3].id, followingId: users[1].id },
    ],
  });

  console.log('✅ Created follow relationships');

  // Create a chat between Alex and Design Guru
  const chat = await prisma.chat.create({
    data: {
      isGroup: false,
    },
  });

  // Add participants to the chat
  await prisma.chatParticipant.createMany({
    data: [
      { chatId: chat.id, userId: users[0].id },
      { chatId: chat.id, userId: users[1].id },
    ],
  });

  // Create messages in the chat
  await prisma.message.createMany({
    data: [
      {
        content: "Hey! How are you doing?",
        senderId: users[0].id,
        receiverId: users[1].id,
        chatId: chat.id,
        status: 'READ',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        content: "I'm doing great! Just working on some new designs. How about you?",
        senderId: users[1].id,
        receiverId: users[0].id,
        chatId: chat.id,
        status: 'READ',
        createdAt: new Date(Date.now() - 28 * 60 * 1000), // 28 minutes ago
      },
      {
        content: "That's awesome! I'd love to see them when you're ready to share.",
        senderId: users[0].id,
        receiverId: users[1].id,
        chatId: chat.id,
        status: 'READ',
        createdAt: new Date(Date.now() - 27 * 60 * 1000), // 27 minutes ago
      },
      {
        content: "Sure thing! I'll send them over once I finish this current project. Should be ready by tomorrow.",
        senderId: users[1].id,
        receiverId: users[0].id,
        chatId: chat.id,
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      },
      {
        content: "Perfect! Take your time, no rush at all 😊",
        senderId: users[0].id,
        receiverId: users[1].id,
        chatId: chat.id,
        status: 'READ',
        createdAt: new Date(Date.now() - 24 * 60 * 1000), // 24 minutes ago
      },
    ],
  });

  console.log('✅ Created chat and messages');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        type: 'LIKE',
        userId: users[0].id,
        fromUserId: users[1].id,
        postId: posts[0].id,
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      },
      {
        type: 'COMMENT',
        userId: users[0].id,
        fromUserId: users[2].id,
        postId: posts[0].id,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
      {
        type: 'FOLLOW',
        userId: users[1].id,
        fromUserId: users[0].id,
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      },
    ],
  });

  console.log('✅ Created notifications');

  // Create some bookmarks
  await prisma.bookmark.createMany({
    data: [
      { userId: users[3].id, postId: posts[1].id },
      { userId: users[3].id, postId: posts[2].id },
    ],
  });

  console.log('✅ Created bookmarks');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });