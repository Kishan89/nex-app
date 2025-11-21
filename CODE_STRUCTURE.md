# Nexeed Social Media Platform - Code Structure Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Key Features Implementation](#key-features-implementation)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Deployment](#deployment)

---

## 🎯 Project Overview

**Nexeed** is a full-stack social media platform with real-time chat, push notifications, and deep linking capabilities. The application consists of:

- **Backend**: Node.js REST API with WebSocket support
- **Frontend**: React Native mobile app (iOS & Android)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage for images/media
- **Real-time**: Socket.IO for chat and live updates
- **Notifications**: Firebase Cloud Messaging (FCM)

**Repository**: https://github.com/Kishan89/nex-app  
**Live Backend**: https://nex-app-production.up.railway.app  
**Play Store**: https://play.google.com/store/apps/details?id=com.mycompany.nexeed1

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Authentication**: JWT + Google OAuth
- **Push Notifications**: Firebase Admin SDK
- **Storage**: Supabase Storage
- **Deployment**: Railway

### Frontend
- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State Management**: React Context API + Zustand
- **Real-time**: Socket.IO Client
- **Push Notifications**: Firebase Cloud Messaging
- **Styling**: StyleSheet with custom theme system

---

## 🏗️ Backend Architecture

### Directory Structure
```
backend/
├── config/              # Configuration files
│   ├── database.js      # Prisma database connection
│   ├── firebaseAdmin.js # Firebase Admin SDK setup
│   └── supabase.js      # Supabase client configuration
│
├── controllers/         # Request handlers (business logic)
│   ├── authController.js       # Authentication (login, register, OAuth)
│   ├── chatController.js       # Chat management
│   ├── commentController.js    # Post comments
│   ├── fcmController.js        # FCM token management
│   ├── followController.js     # Follow/unfollow users
│   ├── groupChatController.js  # Group chat operations
│   ├── notificationController.js # In-app notifications
│   ├── pollController.js       # Poll voting
│   ├── postController.js       # Post CRUD operations
│   ├── pushTokenController.js  # Push token registration
│   ├── searchController.js     # User/post search
│   ├── uploadController.js     # File uploads
│   ├── userController.js       # User profile management
│   └── xpController.js         # XP/gamification system
│
├── middleware/          # Express middleware
│   ├── auth.js          # JWT authentication & authorization
│   ├── cors.js          # CORS configuration
│   ├── dbHealth.js      # Database health checks
│   ├── errorHandler.js  # Global error handling
│   └── rateLimiter.js   # API rate limiting
│
├── routes/              # API route definitions
│   ├── auth.js          # /api/auth/* routes
│   ├── chats.js         # /api/chats/* routes
│   ├── comments.js      # /api/posts/:id/comments/* routes
│   ├── fcm.js           # /api/fcm/* routes
│   ├── followRoutes.js  # /api/follow/* routes
│   ├── groups.js        # /api/groups/* routes
│   ├── notifications.js # /api/notifications/* routes
│   ├── pollRoutes.js    # /api/polls/* routes
│   ├── posts.js         # /api/posts/* routes
│   ├── pushTokenRoutes.js # /api/push-tokens/* routes
│   ├── searchRoutes.js  # /api/search/* routes
│   ├── upload.js        # /api/upload/* routes
│   ├── users.js         # /api/users/* routes
│   ├── version.js       # /api/version route
│   ├── xpRoutes.js      # /api/xp/* routes
│   └── index.js         # Main router (combines all routes)
│
├── services/            # Business logic & external integrations
│   ├── chatService.js       # Chat operations (create, send, fetch)
│   ├── fallbackQueue.js     # In-memory job queue
│   ├── fcmService.js        # Firebase push notifications
│   ├── notificationService.js # In-app notification logic
│   ├── socketService.js     # Socket.IO server & events
│   └── storageService.js    # Supabase storage operations
│
├── utils/               # Utility functions
│   ├── dbMonitor.js     # Database health monitoring
│   ├── errors.js        # Custom error classes
│   ├── helpers.js       # Common helper functions
│   └── logger.js        # Structured logging utility
│
├── prisma/              # Database schema & migrations
│   ├── schema.prisma    # Database models & relations
│   └── migrations/      # Database migration files
│
├── public/              # Static files
│   └── redirect.html    # Deep link redirect page
│
├── constants/           # Application constants
│   └── index.js         # HTTP status, error messages, etc.
│
├── .env.example         # Environment variables template
├── server.js            # Main application entry point
└── package.json         # Dependencies & scripts
```

### Key Backend Files Explained

#### **server.js** (Entry Point)
- Initializes Express app
- Sets up middleware (CORS, body parser, error handling)
- Configures Socket.IO for real-time communication
- Mounts API routes
- Starts HTTP server on port 3001
- Handles graceful shutdown

#### **config/database.js**
- Prisma client initialization
- Connection pooling configuration
- Database health checks
- Automatic reconnection logic

#### **services/socketService.js**
- Socket.IO server setup
- Real-time chat message broadcasting
- Online/offline status tracking
- Room management (chat rooms)
- Message delivery confirmation

#### **services/fcmService.js**
- Firebase Cloud Messaging integration
- Push notification sending
- Token management
- Notification types: messages, likes, comments, follows
- Batch notification support

#### **middleware/auth.js**
- JWT token verification
- User authentication
- Protected route authorization
- Token refresh logic

#### **controllers/chatController.js**
- Get user chats (with unread counts)
- Get chat messages (paginated)
- Send message (text + images)
- Create new chat
- Delete chat
- Mark messages as read

#### **controllers/postController.js**
- Create post (text, images, polls, YouTube links)
- Get posts (feed, trending, following)
- Like/unlike post
- Bookmark post
- Delete post
- Pin post
- Report post

---

## 📱 Frontend Architecture

### Directory Structure
```
project/
├── app/                 # Expo Router pages (file-based routing)
│   ├── (tabs)/          # Bottom tab navigation
│   │   ├── index.tsx    # Home feed
│   │   ├── chats.tsx    # Chat list
│   │   ├── notifications.tsx # Notifications
│   │   └── profile.tsx  # User profile
│   │
│   ├── chat/            # Chat screens
│   │   └── [id].tsx     # Individual chat screen
│   │
│   ├── post/            # Post screens
│   │   └── [id].tsx     # Single post view
│   │
│   ├── profile/         # Profile screens
│   │   └── [id].tsx     # User profile view
│   │
│   ├── groups/          # Group chat screens
│   │   ├── index.tsx    # Group list
│   │   ├── create.tsx   # Create group
│   │   └── [id]/        # Group details & add members
│   │
│   ├── search-users/    # User search
│   │   └── index.tsx
│   │
│   ├── edit-profile.tsx # Edit profile screen
│   ├── login.tsx        # Login screen
│   ├── register.tsx     # Registration screen
│   ├── _layout.tsx      # Root layout
│   └── +not-found.tsx   # 404 page
│
├── components/          # Reusable UI components
│   ├── chat/            # Chat-related components
│   │   ├── ChatScreen.tsx      # Main chat UI
│   │   └── FastChatScreen.tsx  # Optimized chat
│   │
│   ├── Comments.tsx             # Comment section
│   ├── CommentReplyPanel.tsx    # Reply to comments
│   ├── CreatePostModal.tsx      # Post creation modal
│   ├── ImageViewer.tsx          # Full-screen image viewer
│   ├── PostCard.tsx             # Post display card
│   ├── ProfileCompletionBanner.tsx # Profile setup prompt
│   ├── UserSearchScreen.tsx     # User search UI
│   └── skeletons.tsx            # Loading skeletons
│
├── context/             # React Context providers
│   ├── AuthContext.tsx          # User authentication state
│   ├── ChatContext.tsx          # Chat messages & unread counts
│   ├── ListenContext.tsx        # Real-time updates listener
│   ├── NotificationCountContext.tsx # Notification badge count
│   ├── PollVoteContext.tsx      # Poll voting state
│   └── ThemeContext.tsx         # Dark/light theme
│
├── lib/                 # Services & utilities
│   ├── api.ts                   # API client (all backend calls)
│   ├── socketService.ts         # Socket.IO client
│   ├── fcmService.ts            # FCM push notifications
│   ├── ChatCache.ts             # Ultra-fast chat caching
│   ├── apiCache.ts              # API response caching
│   ├── errorHandler.ts          # Error handling
│   ├── imageCompression.ts      # Image optimization
│   ├── imageOptimizer.ts        # Image processing
│   ├── logger.ts                # Logging utility
│   ├── messagePersistence.ts    # Message storage
│   ├── myappDeepLinking.ts      # Deep link handling
│   ├── performanceMonitor.ts    # Performance tracking
│   ├── timestampUtils.ts        # Time formatting
│   └── optimizationManager.ts   # Performance optimizations
│
├── store/               # State management (Zustand)
│   ├── chatCache.ts             # Chat list cache
│   ├── chatMessageCache.ts      # Chat messages cache
│   └── commentCache.ts          # Comment cache
│
├── constants/           # App constants
│   ├── theme.ts                 # Colors, spacing, fonts
│   └── Colors.ts                # Color palette
│
├── types/               # TypeScript type definitions
│   └── index.ts                 # Shared types
│
├── assets/              # Static assets
│   ├── images/          # App images
│   └── fonts/           # Custom fonts
│
├── app.json             # Expo configuration
├── package.json         # Dependencies & scripts
└── tsconfig.json        # TypeScript configuration
```

### Key Frontend Files Explained

#### **app/(tabs)/index.tsx** (Home Feed)
- Displays post feed (following, trending, all)
- Infinite scroll with pagination
- Pull-to-refresh
- Post creation modal
- Like, comment, bookmark actions
- Real-time updates via Socket.IO

#### **app/(tabs)/chats.tsx** (Chat List)
- Displays all user chats
- Unread message counts
- Last message preview
- Online/offline status
- Real-time chat updates
- Search users to start new chat

#### **app/chat/[id].tsx** (Chat Screen)
- Individual chat interface
- Message sending (text + images)
- Real-time message delivery
- Message status (sending, sent, delivered, read)
- Image compression before upload
- Emoji picker
- Group chat support with @mentions

#### **lib/api.ts** (API Client)
- Centralized API calls to backend
- JWT token management
- Request/response interceptors
- Error handling
- Retry logic for failed requests
- Endpoints for all features:
  - Authentication (login, register, OAuth)
  - Posts (create, fetch, like, comment)
  - Chats (send, fetch, create)
  - Users (profile, follow, search)
  - Notifications (fetch, mark read)
  - Upload (images, files)

#### **lib/socketService.ts** (Socket.IO Client)
- WebSocket connection management
- Real-time message listening
- Online status broadcasting
- Chat room joining/leaving
- Message delivery confirmation
- Automatic reconnection

#### **lib/fcmService.ts** (Push Notifications)
- FCM token registration
- Notification permission handling
- Foreground notification display
- Background notification handling
- Deep link navigation from notifications
- Notification suppression (when in chat)

#### **context/AuthContext.tsx**
- User authentication state
- Login/logout functions
- Token storage
- User profile data
- Google OAuth integration

#### **context/ChatContext.tsx**
- Global chat state
- Unread message counts
- Message caching
- Real-time message updates
- Chat list synchronization

#### **context/ThemeContext.tsx**
- Dark/light theme toggle
- System theme detection
- Theme persistence
- Color scheme management

---

## 🔑 Key Features Implementation

### 1. Real-Time Chat
**Backend**: `services/socketService.js`, `controllers/chatController.js`  
**Frontend**: `lib/socketService.ts`, `app/chat/[id].tsx`

- Socket.IO for bidirectional communication
- Message broadcasting to chat rooms
- Optimistic UI updates (instant message display)
- Message status tracking (sending → sent → delivered → read)
- Image messages with compression
- Group chats with @mentions
- Typing indicators (planned)

### 2. Push Notifications
**Backend**: `services/fcmService.js`, `controllers/fcmController.js`  
**Frontend**: `lib/fcmService.ts`

- Firebase Cloud Messaging integration
- Notification types:
  - New message
  - Post like
  - Comment on post
  - New follower
  - Mention in group chat
- Deep linking to specific content
- Notification suppression (when user is active in chat)
- Badge count updates

### 3. Post Feed & Interactions
**Backend**: `controllers/postController.js`  
**Frontend**: `app/(tabs)/index.tsx`, `components/PostCard.tsx`

- Create posts with:
  - Text content
  - Multiple images
  - Polls (multiple choice)
  - YouTube video embeds
- Feed types:
  - Following (posts from followed users)
  - Trending (algorithm-based)
  - All posts
- Interactions:
  - Like/unlike
  - Comment
  - Bookmark
  - Share (deep linking)
  - Report
  - Delete (own posts)
  - Pin (own posts)

### 4. User Authentication
**Backend**: `controllers/authController.js`, `middleware/auth.js`  
**Frontend**: `context/AuthContext.tsx`, `app/login.tsx`

- Email/password registration & login
- Google OAuth integration
- JWT token-based authentication
- Token refresh mechanism
- Secure password hashing (bcrypt)
- Profile completion flow

### 5. Follow System
**Backend**: `controllers/followController.js`  
**Frontend**: `app/profile/[id].tsx`

- Follow/unfollow users
- Follower/following counts
- Follow status checking
- Suggested users
- Messageable users (mutual follows)

### 6. Search & Discovery
**Backend**: `controllers/searchController.js`  
**Frontend**: `app/search-users/index.tsx`

- User search by username
- Suggested users
- Recent searches
- Top XP users (leaderboard)

### 7. XP & Gamification
**Backend**: `controllers/xpController.js`  
**Frontend**: Profile displays

- XP points for actions:
  - Create post: +10 XP
  - Receive like: +5 XP
  - Receive comment: +3 XP
  - Daily login: +2 XP
- XP leaderboard
- User levels based on XP

### 8. Deep Linking
**Backend**: `public/redirect.html`  
**Frontend**: `lib/myappDeepLinking.ts`

- Share posts via HTTPS links
- Automatic app opening
- Fallback to web redirect page
- Link formats:
  - `boltnexeed://post/{postId}`
  - `https://nex-app-production.up.railway.app/post/{postId}`

### 9. Image Upload & Storage
**Backend**: `services/storageService.js`, `controllers/uploadController.js`  
**Frontend**: `lib/imageCompression.ts`

- Supabase Storage integration
- Image compression before upload
- Multiple image support
- Bucket organization:
  - `avatars/` - User profile pictures
  - `banners/` - Profile banners
  - `posts/` - Post images
  - `chat-images/` - Chat images
  - `group-avatars/` - Group chat avatars

### 10. Group Chats
**Backend**: `controllers/groupChatController.js`  
**Frontend**: `app/groups/`

- Create group chats
- Add/remove members
- Admin permissions
- Group avatar & description
- @mention notifications
- Leave group

---

## 🗄️ Database Schema

### Core Tables (Prisma Schema)

#### **User**
```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String   @unique
  password      String?
  avatar        String?
  banner        String?
  bio           String?
  website       String?
  location      String?
  xp            Int      @default(0)
  verified      Boolean  @default(false)
  isOnline      Boolean  @default(false)
  lastSeen      DateTime?
  createdAt     DateTime @default(now())
  
  // Relations
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  bookmarks     Bookmark[]
  followers     Follow[]  @relation("UserFollowers")
  following     Follow[]  @relation("UserFollowing")
  chats         ChatParticipant[]
  messages      Message[]
  notifications Notification[]
  fcmTokens     FCMToken[]
}
```

#### **Post**
```prisma
model Post {
  id          String   @id @default(uuid())
  content     String
  imageUrl    String?
  youtubeUrl  String?
  isPinned    Boolean  @default(false)
  isLive      Boolean  @default(false)
  userId      String
  createdAt   DateTime @default(now())
  
  // Relations
  user        User     @relation(fields: [userId], references: [id])
  comments    Comment[]
  likes       Like[]
  bookmarks   Bookmark[]
  poll        Poll?
}
```

#### **Chat**
```prisma
model Chat {
  id          String   @id @default(uuid())
  name        String?
  avatar      String?
  description String?
  isGroup     Boolean  @default(false)
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  participants ChatParticipant[]
  messages     Message[]
}
```

#### **Message**
```prisma
model Message {
  id        String   @id @default(uuid())
  content   String
  imageUrl  String?
  chatId    String
  senderId  String
  status    String   @default("sent")
  mentions  String[]
  createdAt DateTime @default(now())
  
  // Relations
  chat      Chat     @relation(fields: [chatId], references: [id])
  sender    User     @relation(fields: [senderId], references: [id])
}
```

#### **Notification**
```prisma
model Notification {
  id         String   @id @default(uuid())
  userId     String
  fromUserId String?
  type       String
  message    String
  postId     String?
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
  
  // Relations
  user       User     @relation(fields: [userId], references: [id])
}
```

### Relationships
- User → Posts (one-to-many)
- User → Comments (one-to-many)
- User → Likes (one-to-many)
- User → Follows (many-to-many, self-referential)
- User → Chats (many-to-many through ChatParticipant)
- Chat → Messages (one-to-many)
- Post → Comments (one-to-many)
- Post → Likes (one-to-many)
- Post → Poll (one-to-one)

---

## 📡 API Documentation

### Base URL
- **Production**: `https://nex-app-production.up.railway.app/api`
- **Development**: `http://localhost:3001/api`

### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### **Authentication**
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with email/password
POST   /api/auth/google/mobile     - Google OAuth login
```

#### **Posts**
```
GET    /api/posts                  - Get all posts (paginated)
GET    /api/posts/following        - Get posts from followed users
GET    /api/posts/trending         - Get trending posts
GET    /api/posts/:id              - Get single post
POST   /api/posts                  - Create new post
DELETE /api/posts/:id              - Delete post
POST   /api/posts/:id/like         - Like/unlike post
POST   /api/posts/:id/bookmark     - Bookmark/unbookmark post
POST   /api/posts/:id/comments     - Add comment
GET    /api/posts/:id/comments     - Get comments
```

#### **Chats**
```
GET    /api/chats/:userId          - Get user's chats
GET    /api/chats/:chatId/messages - Get chat messages
POST   /api/chats/:chatId/messages - Send message
POST   /api/chats                  - Create new chat
DELETE /api/chats/:chatId          - Delete chat
POST   /api/chats/:chatId/mark-read - Mark messages as read
```

#### **Users**
```
GET    /api/users/:id/profile      - Get user profile
PUT    /api/users/:id/profile      - Update profile
GET    /api/users/:id/posts        - Get user's posts
GET    /api/users/:id/bookmarks    - Get bookmarked posts
GET    /api/search/users           - Search users
```

#### **Follow**
```
POST   /api/follow/:userId/follow  - Follow/unfollow user
GET    /api/follow/:userId/followers - Get followers
GET    /api/follow/:userId/following - Get following
GET    /api/follow/:userId/follow-status - Check follow status
```

#### **Notifications**
```
GET    /api/notifications/:userId  - Get notifications
POST   /api/notifications/:userId/mark-read - Mark as read
```

#### **Upload**
```
POST   /api/upload                 - Upload image/file
```

---

## 🚀 Deployment

### Backend (Railway)
1. **Platform**: Railway.app
2. **Build Command**: `npm install && npx prisma generate`
3. **Start Command**: `node server.js`
4. **Environment Variables**: Set in Railway dashboard
5. **Database**: Supabase PostgreSQL (external)
6. **Auto-deploy**: Enabled on push to `main` branch

### Frontend (EAS Build)
1. **Platform**: Expo Application Services
2. **Build Command**: `eas build --platform android --profile production`
3. **Distribution**: Google Play Store
4. **OTA Updates**: Enabled via Expo Updates
5. **Environment**: Production config in `app.json`

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
PORT=3001
NODE_ENV=production
```

#### Frontend (app.json)
```json
{
  "expo": {
    "scheme": ["boltnexeed", "nexeed"],
    "extra": {
      "googleWebClientId": "...",
      "googleAndroidClientId": "..."
    }
  }
}
```

---

## 📊 Performance Optimizations

### Backend
- Connection pooling (Prisma)
- Database query optimization
- Response caching
- Gzip compression
- Rate limiting
- Background job queue

### Frontend
- Image compression before upload
- Lazy loading components
- Infinite scroll pagination
- Message caching (3-tier system)
- Optimistic UI updates
- Debounced API calls
- Memoized components

---

## 🔒 Security Features

- JWT token authentication
- Password hashing (bcrypt)
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention (Prisma)
- XSS protection
- Secure file uploads
- Environment variable protection

---

## 📈 Monitoring & Logging

### Backend
- Structured logging (Winston)
- Database health monitoring
- Error tracking
- Performance metrics
- API request logging

### Frontend
- Error boundaries
- Performance monitoring
- Crash reporting
- User analytics (planned)

---

## 🧪 Testing

### Backend
- Unit tests (planned)
- Integration tests (planned)
- API endpoint testing

### Frontend
- Component testing (planned)
- E2E testing (planned)
- Manual QA testing

---

## 📝 Development Workflow

### Backend Development
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend Development
```bash
cd project
npm install
npx expo start
```

### Git Workflow
1. Create feature branch
2. Develop & test locally
3. Commit changes
4. Push to GitHub
5. Auto-deploy to Railway (backend)
6. Build & deploy via EAS (frontend)

---

## 👥 Team & Contact

**Developer**: Kishan  
**Platform**: Nexeed Social Media  
**Repository**: https://github.com/Kishan89/nex-app  
**Version**: 1.1.6

---

## 📚 Additional Resources

- [Backend README](backend/README.md)
- [Frontend README](project/README.md)
- [Environment Variables Guide](backend/.env.example)
- [API Documentation](backend/README.md#api-endpoints)
- [Deployment Guide](README.md#deployment)

---

**Last Updated**: January 2025  
**Document Version**: 1.0
