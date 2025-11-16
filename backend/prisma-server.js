const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// CRITICAL FIX: Use singleton Prisma instance from config/database.js
const { prisma } = require('./config/database');
let usingDatabase = false;

async function initializePrisma() {
  try {
    console.log('🔌 Using singleton Prisma instance from config/database.js');
    
    // Test a simple query to verify connection
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    console.log('✅ Singleton Prisma client working correctly');
    usingDatabase = true;
    
  } catch (error) {
    console.error('❌ Failed to use singleton Prisma client:', error.message);
    console.log('🔄 Falling back to mock data');
    usingDatabase = false;
  }
}

// Mock data for fallback
const MOCK_POSTS = [
  {
    id: "cm5uekoq0002blgsrswx3ve1",
    content: "Just launched my new app! Excited to share this journey with everyone. The future of social media is here! 🚀",
    imageUrl: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800",
    createdAt: "2024-01-09T12:00:00.000Z",
    author: {
      id: "cm5uekoq0001blgsrswx3ve0",
      username: "alexsmith",
      avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100"
    },
    _count: { likes: 42, comments: 8, bookmarks: 12 }
  },
  {
    id: "cm5uekoq0003blgsrswx3ve2", 
    content: "Working on some amazing UI concepts today. The intersection of technology and art never ceases to amaze me.",
    imageUrl: null,
    createdAt: "2024-01-09T10:00:00.000Z",
    author: {
      id: "cm5uekoq0004blgsrswx3ve3",
      username: "designguru", 
      avatar: "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=100"
    },
    _count: { likes: 128, comments: 23, bookmarks: 45 }
  },
  {
    id: "cm5uekoq0005blgsrswx3ve4",
    content: "The next wave of innovation is coming. Are you ready to be part of something extraordinary?",
    imageUrl: "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800",
    createdAt: "2024-01-09T08:00:00.000Z",
    author: {
      id: "cm5uekoq0006blgsrswx3ve5",
      username: "techvision", 
      avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100"
    },
    _count: { likes: 89, comments: 15, bookmarks: 31 }
  }
];

const MOCK_COMMENTS = {
  "cm5uekoq0002blgsrswx3ve1": [
    { 
      id: 1, 
      content: "This looks amazing! Can't wait to try it out.", 
      author: { username: "techfan2024", avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100" }, 
      createdAt: "2024-01-09T13:00:00.000Z" 
    },
    { 
      id: 2, 
      content: "Great work on the UI! Very clean and modern.", 
      author: { username: "designlover", avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100" }, 
      createdAt: "2024-01-09T12:30:00.000Z" 
    }
  ]
};

const MOCK_CHATS = [
  {
    id: "cm5uekoq0007blgsrswx3ve6",
    participants: [
      { user: { id: "cm5uekoq0001blgsrswx3ve0", username: "alexsmith", avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" } }
    ],
    messages: [
      { content: "Hey! How are you doing?", createdAt: "2024-01-09T15:30:00.000Z" }
    ]
  }
];

const MOCK_NOTIFICATIONS = [
  {
    id: "cm5uekoq0009blgsrswx3ve8",
    type: "like",
    message: "alexsmith liked your post",
    createdAt: "2024-01-09T15:45:00.000Z",
    fromUser: { username: "alexsmith", avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" }
  }
];

// Routes
app.get('/health', (req, res) => {
  console.log('🔍 Health check requested');
  res.json({ 
    status: 'OK', 
    message: usingDatabase ? 'Connected to Supabase database' : 'Using mock data (database offline)',
    database: usingDatabase ? 'connected' : 'offline',
    timestamp: new Date().toISOString()
  });
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    console.log('📝 Posts requested');
    
    if (usingDatabase && prisma) {
      console.log('🗃️ Fetching posts from database...');
      const posts = await prisma.post.findMany({
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`✅ Found ${posts.length} posts in database`);
      res.json(posts);
    } else {
      console.log('📱 Using mock posts data');
      res.json(MOCK_POSTS);
    }
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    console.log('🔄 Falling back to mock data');
    res.json(MOCK_POSTS);
  }
});

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    console.log('💬 Comments requested for post:', postId);
    
    if (usingDatabase && prisma) {
      console.log('🗃️ Fetching comments from database...');
      const comments = await prisma.comment.findMany({
        where: { postId },
        include: {
          author: {
            select: {
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`✅ Found ${comments.length} comments for post ${postId}`);
      res.json(comments);
    } else {
      console.log('📱 Using mock comments data');
      const comments = MOCK_COMMENTS[postId] || [];
      res.json(comments);
    }
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    const comments = MOCK_COMMENTS[req.params.postId] || [];
    res.json(comments);
  }
});

// Get user chats
app.get('/api/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('💭 Chats requested for user:', userId);
    
    if (usingDatabase && prisma) {
      console.log('🗃️ Fetching chats from database...');
      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: { userId }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      console.log(`✅ Found ${chats.length} chats for user ${userId}`);
      res.json(chats);
    } else {
      console.log('📱 Using mock chats data');
      res.json(MOCK_CHATS);
    }
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    res.json(MOCK_CHATS);
  }
});

// Get chat messages
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;
    console.log(`📩 Messages requested for chat ${chatId}, user ${userId}`);
    
    if (usingDatabase && prisma) {
      console.log('🗃️ Fetching messages from database...');
      const messages = await prisma.message.findMany({
        where: { chatId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log(`✅ Found ${messages.length} messages for chat ${chatId}`);
      res.json(messages);
    } else {
      console.log('📱 Using mock messages data');
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.json([]);
  }
});

// Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔔 Notifications requested for user:', userId);
    
    if (usingDatabase && prisma) {
      console.log('🗃️ Fetching notifications from database...');
      const notifications = await prisma.notification.findMany({
        where: { userId },
        include: {
          fromUser: {
            select: {
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
      res.json(notifications);
    } else {
      console.log('📱 Using mock notifications data');
      res.json(MOCK_NOTIFICATIONS);
    }
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.json(MOCK_NOTIFICATIONS);
  }
});

// Error handling
app.use((req, res) => {
  console.log('❌ Route not found:', req.path);
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
  await initializePrisma();
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Prisma Backend Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📝 API endpoints available at /api/*`);
    console.log(`💡 Database status: ${usingDatabase ? '✅ Connected to Supabase' : '⚠️ Using mock data'}`);
  });
}

startServer().catch(console.error);



