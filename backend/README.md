# Nexeed Backend API 🚀

Production-ready Node.js backend for Nexeed social media platform with real-time features, push notifications, and deep linking support.

## 📋 Table of Contents
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Guide](#setup-guide)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Development](#development)

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Real-time**: Socket.IO for chat
- **Storage**: Supabase Storage for images
- **Authentication**: JWT + Google OAuth
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Caching**: Redis (optional)
- **Background Jobs**: Bull Queue (optional)

## ✨ Features

### Core Features
- ✅ User authentication (JWT + Google OAuth)
- ✅ Posts with images, polls, and YouTube embeds
- ✅ Real-time chat with Socket.IO
- ✅ Push notifications via FCM
- ✅ Comments and replies
- ✅ Likes and bookmarks
- ✅ User profiles and follow system
- ✅ Trending posts algorithm
- ✅ Search functionality
- ✅ Post sharing with deep linking

### Advanced Features
- ✅ Connection pooling with pgBouncer
- ✅ Database health monitoring
- ✅ Graceful shutdown handling
- ✅ CORS configuration
- ✅ Error handling middleware
- ✅ Request logging
- ✅ Static file serving for deep link redirects

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js           # Prisma client & connection management
├── controllers/              # Request handlers
│   ├── authController.js     # Authentication logic
│   ├── postController.js     # Post CRUD operations
│   ├── chatController.js     # Chat management
│   └── userController.js     # User operations
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── cors.js              # CORS configuration
│   ├── errorHandler.js      # Global error handling
│   └── dbHealth.js          # Database health checks
├── routes/
│   ├── index.js             # Main router
│   ├── auth.js              # Auth routes
│   ├── posts.js             # Post routes
│   ├── chats.js             # Chat routes
│   └── users.js             # User routes
├── services/
│   ├── socketService.js     # Socket.IO management
│   ├── notificationService.js # FCM notifications
│   └── queueService.js      # Background jobs
├── utils/
│   ├── dbMonitor.js         # Database monitoring
│   └── logger.js            # Logging utility
├── prisma/
│   └── schema.prisma        # Database schema
├── public/
│   └── redirect.html        # Deep link redirect page
├── server.js                # Main entry point
├── .env.example             # Environment template
└── package.json
```

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Firebase project (for push notifications)
- Google Cloud project (for OAuth)

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) section).

### 3. Database Setup

Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## 🔐 Environment Variables

### Database (Supabase)

```env
# Connection pooler for better performance (use in production)
DATABASE_URL="postgresql://USER:PASSWORD@HOST.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=15"

# Direct connection for migrations
DIRECT_URL="postgresql://USER:PASSWORD@HOST.pooler.supabase.com:5432/postgres"
```

**How to get:**
1. Go to Supabase Dashboard → Settings → Database
2. Copy "Connection Pooling" string for `DATABASE_URL`
3. Copy "Connection String" for `DIRECT_URL`
4. Replace `[YOUR-PASSWORD]` with your database password

### Supabase Storage

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

**How to get:**
1. Supabase Dashboard → Settings → API
2. Copy "Project URL" and "anon public" key

### JWT Secret

```env
JWT_SECRET="your-random-secret-key"
```

**Generate with:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Firebase (Push Notifications)

**Option 1: Individual fields**
```env
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

**Option 2: Full service account JSON (recommended for Railway)**
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**How to get:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. For Option 1: Extract individual fields
5. For Option 2: Copy entire JSON content

### Google OAuth

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

**How to get:**
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Copy Client ID

### Server Configuration

```env
PORT=3001
NODE_ENV=production
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3001`
- Production: `https://nex-app-production.up.railway.app`

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google OAuth
```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google-id-token"
}
```

### Posts

#### Get All Posts
```http
GET /api/posts
Authorization: Bearer <token>
```

#### Get Single Post
```http
GET /api/posts/:postId
Authorization: Bearer <token>
```

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Post content",
  "imageUrl": "https://...",
  "poll": {
    "question": "Poll question?",
    "options": ["Option 1", "Option 2"]
  }
}
```

#### Like Post
```http
POST /api/posts/:postId/like
Authorization: Bearer <token>
```

#### Comment on Post
```http
POST /api/posts/:postId/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Comment text"
}
```

### Chats

#### Get User Chats
```http
GET /api/chats
Authorization: Bearer <token>
```

#### Get Chat Messages
```http
GET /api/chats/:chatId/messages
Authorization: Bearer <token>
```

#### Send Message
```http
POST /api/chats/:chatId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Message text"
}
```

### Users

#### Get User Profile
```http
GET /api/users/:userId
Authorization: Bearer <token>
```

#### Follow User
```http
POST /api/users/:userId/follow
Authorization: Bearer <token>
```

#### Search Users
```http
GET /api/users/search?q=john
Authorization: Bearer <token>
```

## 🌐 Deployment

### Railway Deployment

1. **Connect Repository**
   - Go to Railway.app
   - Create new project from GitHub repo
   - Select `backend` as root directory

2. **Add Environment Variables**
   - Add all variables from `.env.example`
   - Use `FIREBASE_SERVICE_ACCOUNT_KEY` for easier setup

3. **Deploy**
   - Railway auto-deploys on push to main branch
   - Check logs for any errors

### Health Check Endpoint

```http
GET /health
```

Returns server status and database connection info.

## 🔧 Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Database Migrations

Create a new migration:
```bash
npx prisma migrate dev --name add_new_feature
```

Apply migrations in production:
```bash
npx prisma migrate deploy
```

### Testing Deep Links

1. Share a post from the app
2. Open link in browser: `https://your-backend.railway.app/post/POST_ID`
3. Should see redirect page with gradient
4. Click "Open in App" or wait for auto-redirect
5. App should open to that specific post

## 🐛 Troubleshooting

### Database Connection Issues

**Error: "Can't reach database server"**
- Check `DATABASE_URL` is correct
- Verify Supabase project is active
- Check connection pooler settings

**Error: "Too many connections"**
- Use connection pooler URL (port 6543)
- Reduce `connection_limit` in DATABASE_URL

### Firebase Push Notifications

**Error: "Invalid JWT Signature"**
- Regenerate Firebase service account key
- Ensure newlines are properly escaped (`\n`)
- Use `FIREBASE_SERVICE_ACCOUNT_KEY` instead of individual fields

### Socket.IO Connection Issues

**Clients can't connect**
- Check CORS settings in `middleware/cors.js`
- Verify WebSocket support on hosting platform
- Check firewall/proxy settings

## 📝 License

Private project - All rights reserved

## 👥 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for Nexeed Social Platform**
