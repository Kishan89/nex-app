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

// In-memory data store
const POSTS = [
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

const COMMENTS = {
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
  ],
  "cm5uekoq0003blgsrswx3ve2": [
    { 
      id: 3, 
      content: "The color palette is perfect! 🎨", 
      author: { username: "artdirector", avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100" }, 
      createdAt: "2024-01-09T11:00:00.000Z" 
    }
  ]
};

const CHATS = [
  {
    id: "cm5uekoq0007blgsrswx3ve6",
    participants: [
      { user: { id: "cm5uekoq0001blgsrswx3ve0", username: "alexsmith", avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" } }
    ],
    messages: [
      { content: "Hey! How are you doing?", createdAt: "2024-01-09T15:30:00.000Z" }
    ]
  },
  {
    id: "cm5uekoq0008blgsrswx3ve7",
    participants: [
      { user: { id: "cm5uekoq0004blgsrswx3ve3", username: "designguru", avatar: "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=100" } }
    ],
    messages: [
      { content: "Check out this new design I created", createdAt: "2024-01-09T14:00:00.000Z" }
    ]
  }
];

const NOTIFICATIONS = [
  {
    id: "cm5uekoq0009blgsrswx3ve8",
    type: "like",
    message: "alexsmith liked your post",
    createdAt: "2024-01-09T15:45:00.000Z",
    fromUser: { username: "alexsmith", avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" }
  },
  {
    id: "cm5uekoq0010blgsrswx3ve9",
    type: "comment",
    message: "designguru commented on your post",
    createdAt: "2024-01-09T15:40:00.000Z",
    fromUser: { username: "designguru", avatar: "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=100" }
  },
  {
    id: "cm5uekoq0011blgsrswx3vea",
    type: "follow",
    message: "techvision started following you",
    createdAt: "2024-01-09T14:30:00.000Z",
    fromUser: { username: "techvision", avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100" }
  }
];

// Routes
app.get('/health', (req, res) => {
  console.log('🔍 Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Simple backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Get all posts
app.get('/api/posts', (req, res) => {
  console.log('📝 Posts requested');
  res.json(POSTS);
});

// Get comments for a post
app.get('/api/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  console.log('💬 Comments requested for post:', postId);
  const comments = COMMENTS[postId] || [];
  res.json(comments);
});

// Get user chats
app.get('/api/chats/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('💭 Chats requested for user:', userId);
  res.json(CHATS);
});

// Get chat messages
app.get('/api/chats/:chatId/messages', (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.query;
  console.log(`📩 Messages requested for chat ${chatId}, user ${userId}`);
  res.json([]);
});

// Get user notifications
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('🔔 Notifications requested for user:', userId);
  res.json(NOTIFICATIONS);
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

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Simple Backend Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📝 API endpoints available at /api/*`);
  console.log('💡 This server uses in-memory data - no database required!');
});
