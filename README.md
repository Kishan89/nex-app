# Nexeed Social Media Platform 🚀

A full-stack social media application with real-time chat, push notifications, deep linking, and gamification features.

## 📱 Overview

Nexeed is a modern social media platform built with React Native (Expo) for mobile and Node.js (Express) for the backend. It features real-time messaging, push notifications, post sharing with deep linking, polls, XP system, and a beautiful gradient UI.

## 🏗️ Project Structure

```
nex-app/
├── backend/          # Node.js API server (Express + Socket.IO)
├── project/          # React Native mobile app (Expo)
├── docs/             # Additional documentation
│   ├── API.md
│   ├── SETUP.md
│   └── ORGANIZATION_SUMMARY.md
├── CODE_STRUCTURE.md # Detailed code architecture
└── README.md         # This file
```

## ✨ Features

### Core Features
- 📝 **Posts**: Create posts with text, images, polls, and YouTube embeds
- 💬 **Real-time Chat**: One-on-one and group chats with Socket.IO
- 👥 **Group Chats**: Create groups, add members, admin controls
- 🔔 **Push Notifications**: FCM-powered notifications for likes, comments, follows, messages
- ❤️ **Interactions**: Like posts/comments, comment with replies, bookmark posts
- 👤 **User Profiles**: Follow/unfollow, bio, avatar, banner, verification badges
- 🔍 **Search**: Search users and posts with real-time results
- 📊 **Trending**: Algorithm-based trending posts
- 🎯 **Polls**: Create and vote on polls with real-time results
- 🏆 **XP System**: Gamification with experience points for user actions

### Technical Features
- ⚡ **Real-time Updates**: WebSocket connections for instant messaging
- 🔐 **Authentication**: JWT + Google OAuth 2.0
- 📱 **Deep Linking**: Share posts via `boltnexeed://` and HTTPS links
- 🖼️ **Image Optimization**: Automatic compression and resizing
- 💾 **Offline Support**: Local caching with AsyncStorage
- 🌓 **Theme Support**: Dark/Light mode with system detection
- 🔄 **Pull-to-Refresh**: Refresh feeds and chats
- ♾️ **Infinite Scroll**: Paginated content loading
- 🎨 **Gradient UI**: Beautiful blue-to-purple gradients
- 📲 **App Version Control**: Force update mechanism
- 🔕 **User Blocking**: Block/unblock users
- 💬 **Mentions**: Tag users in messages with @ mentions

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 6.19
- **Real-time**: Socket.IO 4.8
- **Authentication**: JWT + Google OAuth Library
- **Push Notifications**: Firebase Admin SDK
- **Storage**: Supabase Storage
- **Job Queue**: Bull + IORedis
- **Deployment**: Railway

### Frontend
- **Framework**: React Native 0.79 (Expo SDK 53)
- **Language**: TypeScript 5.8
- **Navigation**: Expo Router 5.1 (file-based)
- **State Management**: React Context + Zustand
- **Real-time**: Socket.IO Client 4.8
- **Push Notifications**: Firebase Cloud Messaging + OneSignal
- **HTTP Client**: Axios
- **Image Handling**: Expo Image Picker + Manipulator
- **Caching**: AsyncStorage + Custom cache layers
- **UI Components**: Custom components with Lucide icons

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (database + storage)
- Firebase project (push notifications)
- Google Cloud project (OAuth)
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (for building)

### 1. Clone Repository

```bash
git clone https://github.com/Kishan89/nex-app.git
cd nex-app
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Backend runs on `http://localhost:3001`

**Detailed setup**: See [backend/README.md](backend/README.md)

### 3. Frontend Setup

```bash
cd project
npm install

# Update backend URL
# Edit lib/backendConfig.ts with your backend URL

# Add Firebase configuration
# Place google-services.json in project root (from Firebase Console)

# Start Expo development server
npx expo start
```

**Detailed setup**: See [project/README.md](project/README.md)

## 🔐 Environment Variables

### Backend (.env)

```env
# Database (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# JWT Authentication
JWT_SECRET="your-secret-key-min-32-characters"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Firebase Admin (Push Notifications)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Frontend (app.json)

```json
{
  "expo": {
    "scheme": "boltnexeed",
    "extra": {
      "googleWebClientId": "your-web-client-id.apps.googleusercontent.com",
      "googleAndroidClientId": "your-android-client-id.apps.googleusercontent.com",
      "oneSignalAppId": "your-onesignal-app-id"
    },
    "android": {
      "package": "com.mycompany.nexeed1",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## 📂 Backend Architecture

### Directory Structure

```
backend/
├── config/
│   └── database.js              # Prisma client setup
├── lib/
│   ├── firebaseAdmin.js         # Firebase Admin SDK
│   └── prisma.js                # Prisma instance
├── controllers/                 # Request handlers
│   ├── chatController.js
│   ├── postController.js
│   ├── userController.js
│   ├── commentController.js
│   ├── likeController.js
│   ├── bookmarkController.js
│   ├── followController.js
│   ├── notificationController.js
│   ├── pollController.js
│   ├── fcmController.js
│   ├── pushTokenController.js
│   ├── groupChatController.js
│   ├── userSearchController.js
│   ├── commentLikeController.js
│   ├── versionController.js
│   └── xpController.js
├── services/                    # Business logic
│   ├── chatService.js
│   ├── postService.js
│   ├── userService.js
│   ├── commentService.js
│   ├── likeService.js
│   ├── bookmarkService.js
│   ├── followService.js
│   ├── notificationService.js
│   ├── pollService.js
│   ├── fcmService.js
│   ├── pushNotificationService.js
│   ├── pushTokenService.js
│   ├── socketService.js
│   ├── storageService.js
│   ├── userSearchService.js
│   ├── userCacheService.js
│   ├── commentLikeService.js
│   ├── versionService.js
│   ├── xpService.js
│   ├── youtubeService.js
│   ├── oneSignalService.js
│   ├── queueService.js
│   └── fallbackQueue.js
├── routes/                      # API endpoints
│   ├── index.js                 # Main router
│   ├── auth.js
│   ├── posts.js
│   ├── chats.js
│   ├── users.js
│   ├── comments.js
│   ├── likes.js
│   ├── bookmarks.js
│   ├── followRoutes.js
│   ├── notifications.js
│   ├── pollRoutes.js
│   ├── fcm.js
│   ├── pushTokenRoutes.js
│   ├── groups.js
│   ├── searchRoutes.js
│   ├── upload.js
│   ├── version.js
│   └── xpRoutes.js
├── middleware/
│   ├── auth.js                  # JWT verification
│   ├── cors.js                  # CORS configuration
│   ├── errorHandler.js          # Global error handling
│   ├── dbHealth.js              # Database health checks
│   ├── groupAdmin.js            # Group admin authorization
│   └── validate.js              # Request validation
├── utils/
│   ├── logger.js                # Logging utility
│   ├── errors.js                # Custom error classes
│   ├── helpers.js               # Helper functions
│   └── dbMonitor.js             # Database monitoring
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Migration files
│   ├── seed.js                  # Database seeding
│   └── indexes.sql              # Performance indexes
├── public/
│   └── redirect.html            # Deep link redirect page
├── constants/
│   └── index.js                 # App constants
├── server.js                    # Main entry point
└── package.json
```

### Key Backend Components

#### Database Models (Prisma Schema)
- **User**: User accounts, profiles, authentication
- **Post**: User posts with content, images, YouTube embeds
- **Comment**: Post comments with nested replies
- **CommentLike**: Likes on comments
- **Like**: Post likes
- **Bookmark**: Saved posts
- **Follow**: User follow relationships
- **Chat**: One-on-one and group chats
- **ChatParticipant**: Chat membership with admin roles
- **Message**: Chat messages with mentions and images
- **Notification**: In-app notifications
- **Poll**: Poll questions attached to posts
- **PollOption**: Poll choices
- **PollVote**: User votes on polls
- **PushToken**: Expo push notification tokens
- **FcmToken**: Firebase Cloud Messaging tokens
- **UserBlock**: User blocking relationships
- **AppVersion**: App version control for force updates

#### API Routes

**Authentication** (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Email/password login
- `POST /google` - Google OAuth login

**Posts** (`/api/posts`)
- `GET /` - Get feed posts (paginated)
- `GET /trending` - Get trending posts
- `GET /following` - Get posts from followed users
- `GET /:id` - Get single post
- `POST /` - Create post (text, images, polls, YouTube)
- `DELETE /:id` - Delete post
- `PUT /:id/pin` - Pin/unpin post

**Likes** (`/api/posts/:id/like`)
- `POST /` - Like/unlike post

**Comments** (`/api/posts/:id/comments`)
- `GET /` - Get post comments
- `POST /` - Add comment
- `POST /:commentId/reply` - Reply to comment
- `POST /:commentId/like` - Like/unlike comment

**Bookmarks** (`/api/bookmarks`)
- `GET /` - Get user bookmarks
- `POST /` - Bookmark/unbookmark post

**Chats** (`/api/chats`)
- `GET /` - Get user chats with unread counts
- `GET /:id/messages` - Get chat messages (paginated)
- `POST /` - Create new chat
- `POST /:id/messages` - Send message
- `DELETE /:id` - Delete chat
- `PUT /:id/read` - Mark messages as read

**Group Chats** (`/api/groups`)
- `POST /` - Create group
- `POST /:id/members` - Add members
- `DELETE /:id/members/:userId` - Remove member
- `PUT /:id` - Update group details
- `POST /:id/leave` - Leave group

**Users** (`/api/users`)
- `GET /:id` - Get user profile
- `GET /:id/posts` - Get user posts
- `PUT /profile` - Update profile
- `POST /:id/block` - Block/unblock user

**Follow** (`/api/follow`)
- `POST /:id` - Follow/unfollow user
- `GET /:id/followers` - Get followers
- `GET /:id/following` - Get following

**Notifications** (`/api/notifications`)
- `GET /` - Get user notifications
- `PUT /:id/read` - Mark as read
- `PUT /read-all` - Mark all as read

**Polls** (`/api/polls`)
- `POST /:pollId/vote` - Vote on poll

**Search** (`/api/search`)
- `GET /users` - Search users
- `GET /posts` - Search posts

**FCM Tokens** (`/api/fcm`)
- `POST /token` - Register FCM token
- `DELETE /token` - Remove FCM token

**XP System** (`/api/xp`)
- `GET /leaderboard` - Get XP leaderboard
- `GET /rules` - Get XP earning rules

**Version** (`/api/version`)
- `GET /check` - Check app version

**Upload** (`/api/upload`)
- `POST /image` - Upload image to Supabase

## 📱 Frontend Architecture

### Directory Structure

```
project/
├── app/                         # Expo Router pages
│   ├── (tabs)/                  # Tab navigation
│   │   ├── index.tsx            # Home feed
│   │   ├── chats.tsx            # Chat list
│   │   ├── notifications.tsx    # Notifications
│   │   └── profile.tsx          # User profile
│   ├── chat/
│   │   └── [id].tsx             # Chat screen
│   ├── comments/
│   │   └── [id].tsx             # Comments screen
│   ├── profile/
│   │   └── [id].tsx             # User profile
│   ├── groups/
│   │   ├── index.tsx            # Group list
│   │   ├── create.tsx           # Create group
│   │   └── [id]/                # Group details
│   ├── search-users/
│   │   └── index.tsx            # User search
│   ├── login.tsx
│   ├── register.tsx
│   ├── edit-profile.tsx
│   ├── create-post.tsx
│   ├── _layout.tsx              # Root layout
│   └── +not-found.tsx
├── components/                  # Reusable components
│   ├── chat/
│   │   ├── ChatScreen.tsx
│   │   └── FastChatScreen.tsx
│   ├── notifications/
│   │   └── NotificationCard.tsx
│   ├── skeletons/               # Loading skeletons
│   ├── ui/                      # UI components
│   ├── PostCard.tsx
│   ├── Comments.tsx
│   ├── CommentReplyPanel.tsx
│   ├── PollComponent.tsx
│   ├── ImageViewer.tsx
│   ├── YouTubePreview.tsx
│   ├── LinkDetector.tsx
│   ├── UserSearchScreen.tsx
│   ├── ProfileCompletionBanner.tsx
│   ├── UpdateModal.tsx
│   ├── XPRulesModal.tsx
│   ├── SplashScreen.tsx
│   └── TruncatedText.tsx
├── context/                     # React Context
│   ├── AuthContext.tsx          # Authentication state
│   ├── ChatContext.tsx          # Chat state & unread counts
│   ├── ThemeContext.tsx         # Dark/light theme
│   ├── NotificationContext.tsx  # Notification state
│   ├── NotificationCountContext.tsx
│   ├── NotificationPermissionContext.tsx
│   ├── PollVoteContext.tsx      # Poll voting state
│   ├── CommentReplyContext.tsx  # Comment reply state
│   ├── SocketContext.tsx        # Socket.IO connection
│   ├── ListenContext.tsx        # Real-time listeners
│   └── SplashContext.tsx        # Splash screen state
├── lib/                         # Services & utilities
│   ├── api.ts                   # API client (all backend calls)
│   ├── socketService.ts         # Socket.IO client
│   ├── fcmService.ts            # FCM push notifications
│   ├── backendConfig.ts         # Backend URL configuration
│   ├── deepLinking.ts           # Deep link handling
│   ├── myappDeepLinking.ts      # App-specific deep links
│   ├── deepLinkingService.ts
│   ├── imageCompression.ts      # Image optimization
│   ├── imageOptimizer.ts
│   ├── googleSignInUtils.ts     # Google OAuth
│   ├── firebase.ts              # Firebase setup
│   ├── youtubeUtils.ts          # YouTube embed parsing
│   ├── timestampUtils.ts        # Time formatting
│   ├── versionCheck.ts          # App version checking
│   ├── ChatCache.ts             # Chat caching
│   ├── apiCache.ts              # API response caching
│   ├── messagePersistence.ts    # Message storage
│   ├── pollVoteStorage.ts       # Poll vote caching
│   ├── groupPermissions.ts      # Group admin checks
│   ├── errorHandler.ts          # Error handling
│   ├── logger.ts                # Logging
│   ├── performanceMonitor.ts    # Performance tracking
│   ├── memoryManager.ts         # Memory optimization
│   ├── UnifiedShareService.ts   # Share functionality
│   └── notificationNavigationService.ts
├── store/                       # Zustand stores
│   ├── chatCache.ts
│   ├── chatMessageCache.ts
│   ├── postCache.ts
│   ├── commentCache.ts
│   ├── notificationCache.ts
│   ├── profileStore.ts
│   ├── interactionStore.ts
│   └── followSync.ts
├── hooks/                       # Custom hooks
│   ├── useAppVersion.ts
│   ├── useDebounce.ts
│   ├── useFrameworkReady.ts
│   └── useNotificationNavigation.ts
├── constants/
│   ├── theme.ts                 # Theme colors & styles
│   └── api.ts                   # API constants
├── types/
│   └── index.ts                 # TypeScript types
├── assets/                      # Images & icons
├── app.json                     # Expo configuration
├── eas.json                     # EAS Build configuration
├── google-services.json         # Firebase config
├── tsconfig.json
└── package.json
```

### Key Frontend Features

#### Real-time Chat
- Socket.IO connection with auto-reconnect
- Message delivery status (sent, delivered, read)
- Typing indicators
- Online/offline status
- Image messages
- User mentions with @ syntax
- Message caching for offline support

#### Push Notifications
- Firebase Cloud Messaging (FCM)
- OneSignal integration
- Notification types: likes, comments, follows, messages
- Deep link navigation from notifications
- Badge count updates
- Background notification handling

#### State Management
- **AuthContext**: User authentication, login/logout
- **ChatContext**: Chat list, unread counts, message updates
- **ThemeContext**: Dark/light mode toggle
- **NotificationContext**: Notification list and badge count
- **PollVoteContext**: Poll voting state
- **Zustand Stores**: Caching for posts, comments, profiles

#### Caching Strategy
- **API Cache**: Response caching with TTL
- **Chat Cache**: Message persistence
- **Post Cache**: Feed caching
- **Image Cache**: Fast Image for optimized loading
- **AsyncStorage**: Persistent local storage

## 📱 Deep Linking

### How It Works

1. User shares post → Generates HTTPS link
2. Recipient clicks link → Opens in browser
3. Browser shows redirect page → Auto-opens app
4. App navigates to specific post/profile

### Link Formats

**App Scheme:**
- `boltnexeed://post/{postId}`
- `boltnexeed://profile/{userId}`

**HTTPS:**
- `https://nex-app-production.up.railway.app/post/{postId}`
- `https://nex-app-production.up.railway.app/profile/{userId}`

### Configuration

**Backend**: Serves redirect HTML at `/post/:id` and `/profile/:id`  
**Frontend**: Handles deep links in `lib/myappDeepLinking.ts`  
**App Config**: Intent filters in `app.json`

## 🎨 Theming

### Brand Colors
- **Primary Blue**: `#3B8FE8`
- **Secondary Purple**: `#e385ec`
- **Gradient**: `linear-gradient(135deg, #3B8FE8 0%, #e385ec 100%)`

### Theme Modes
- Light mode: White background, dark text
- Dark mode: Black background, light text
- System theme detection
- Manual toggle in profile

## 🏆 XP System

Users earn XP for various actions:
- **Create post**: +5 XP
- **Receive like on post**: +1 XP (when someone likes your post)
- **Receive comment on post**: +2 XP (when someone comments on your post)

**XP Deductions:**
- Delete post: -5 XP
- Lose a like: -1 XP
- Lose a comment: -2 XP

**Important Notes:**
- XP never goes below 0
- Self-actions don't earn XP (liking/commenting on your own posts)
- XP is awarded to post owners, not to the person performing the action

## 🌐 Deployment

### Backend (Railway)

1. Connect GitHub repository
2. Set root directory to `backend`
3. Add environment variables from `.env.example`
4. Deploy automatically on push to main

**Live Backend**: https://nex-app-production.up.railway.app

### Frontend (EAS Build)

```bash
cd project

# Build production APK
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to Play Store
eas submit --platform android
```

**Play Store**: https://play.google.com/store/apps/details?id=com.mycompany.nexeed1

## 🔧 Development Scripts

### Backend

```bash
npm run dev              # Start development server
npm run start            # Start production server
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
```

### Frontend

```bash
npm run dev              # Start Expo dev server
npm run android          # Run on Android
npm run ios              # Run on iOS
npm run web              # Run on web
eas build                # Build with EAS
```

## 🐛 Troubleshooting

### Backend Issues

**Database connection fails**
- Verify `DATABASE_URL` and `DIRECT_URL` in `.env`
- Check Supabase project is active
- Run `npx prisma generate`

**Socket.IO not connecting**
- Check CORS configuration in `middleware/cors.js`
- Verify frontend has correct backend URL

**Push notifications not sending**
- Verify Firebase service account key is valid
- Check FCM tokens are being registered
- Review backend logs for errors

### Frontend Issues

**App won't build**
- Ensure `google-services.json` exists
- Verify package name matches Firebase project
- Clean build: `cd android && ./gradlew clean`

**Deep links not working**
- Rebuild app after changing `app.json`
- Verify backend URL in `backendConfig.ts`
- Check intent filters in `app.json`

**Images not uploading**
- Check Supabase storage bucket permissions
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check image size limits

**Socket connection fails**
- Verify backend URL in `lib/socketService.ts`
- Check JWT token is valid
- Review network connectivity

## 📊 Database Schema

### Core Tables
- **users**: User accounts and profiles
- **posts**: User posts with content
- **comments**: Post comments with replies
- **likes**: Post likes
- **comment_likes**: Comment likes
- **bookmarks**: Saved posts
- **follows**: User relationships
- **chats**: Chat conversations
- **chat_participants**: Chat membership
- **messages**: Chat messages
- **notifications**: In-app notifications
- **fcm_tokens**: Push notification tokens
- **polls**: Poll questions
- **poll_options**: Poll choices
- **poll_votes**: User votes
- **user_blocks**: Blocked users
- **app_version**: Version control

See `backend/prisma/schema.prisma` for full schema.

## 📚 Documentation

- **[Backend README](backend/README.md)** - API setup and deployment
- **[Frontend README](project/README.md)** - Mobile app setup and building
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Setup Guide](docs/SETUP.md)** - Detailed setup instructions
- **[Code Structure](CODE_STRUCTURE.md)** - Architecture deep dive

## 📝 Version History

### v1.2.1 (Current)
- ✅ Comment likes feature
- ✅ User blocking system
- ✅ App version control with force updates
- ✅ Performance optimizations
- ✅ Bug fixes and improvements

### v1.1.8
- ✅ XP system and leaderboard
- ✅ Group chat improvements
- ✅ User mentions in messages
- ✅ Image messages in chat

### v1.1.6
- ✅ Post sharing with deep linking
- ✅ Beautiful share dialog
- ✅ HTTPS redirect page
- ✅ Improved backend routing

### v1.1.0
- ✅ Initial release
- ✅ Core social features
- ✅ Real-time chat
- ✅ Push notifications

## 🤝 Contributing

This is a private project. For contributions or issues, contact the development team.

## 📄 License

Private project - All rights reserved

## 👥 Team

- **Developer**: Kishan
- **Platform**: Nexeed Social Media
- **Repository**: https://github.com/Kishan89/nex-app

## 📞 Support

For technical support:
- Review documentation in `backend/README.md` and `project/README.md`
- Check troubleshooting sections above
- Review `docs/` folder for additional guides
- Contact development team

---

**Built with ❤️ for the Nexeed Community**

### Quick Links
- 📱 [Play Store](https://play.google.com/store/apps/details?id=com.mycompany.nexeed1)
- 🌐 [Backend API](https://nex-app-production.up.railway.app)
- 📚 [API Docs](docs/API.md)
- 🔧 [Setup Guide](docs/SETUP.md)
- 📖 [Code Structure](CODE_STRUCTURE.md)
