# Nexeed Social Media Platform 🚀

A full-stack social media application with real-time chat, push notifications, and deep linking support.

## 📱 Overview

Nexeed is a modern social media platform built with React Native (Expo) for mobile and Node.js (Express) for the backend. It features real-time messaging, push notifications, post sharing with deep linking, and a beautiful user interface.

## 🏗️ Architecture

```
nexapp/
├── project/          # React Native mobile app (Expo)
├── backend/          # Node.js API server (Express)
└── README.md         # This file
```

### Tech Stack

**Frontend (Mobile App)**
- React Native with Expo SDK 52
- TypeScript
- Expo Router (file-based navigation)
- Socket.IO Client (real-time chat)
- Firebase Cloud Messaging (push notifications)
- React Context API + Zustand (state management)

**Backend (API Server)**
- Node.js 18+ with Express.js 5
- PostgreSQL with Prisma ORM
- Supabase (database + storage)
- Socket.IO (WebSocket server)
- Firebase Admin SDK (push notifications)
- JWT + Google OAuth (authentication)

## ✨ Features

### User Features
- 📝 Create posts with images, polls, and YouTube links
- 💬 Real-time chat with Socket.IO
- 🔔 Push notifications via FCM
- ❤️ Like, comment, and bookmark posts
- 👥 Follow/unfollow users
- 🔍 Search users and posts
- 📊 Trending posts algorithm
- 🔗 Share posts with deep linking
- 🌓 Dark/Light theme support

### Technical Features
- ⚡ Real-time updates with WebSockets
- 🔐 Secure JWT authentication
- 📱 Deep linking (boltnexeed:// and HTTPS)
- 🖼️ Image optimization and compression
- 💾 Offline support with caching
- 🎨 Beautiful gradient UI
- 🔄 Pull-to-refresh
- ♾️ Infinite scroll
- 🎯 Optimistic UI updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Firebase project
- Google Cloud project (for OAuth)
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (for building)

### 1. Clone Repository

```bash
git clone https://github.com/Kishan89/nex-app.git
cd nexapp
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npx prisma generate
npx prisma migrate deploy

# Start server
npm run dev
```

Backend will run on `http://localhost:3001`

**See [backend/README.md](backend/README.md) for detailed setup instructions.**

### 3. Frontend Setup

```bash
cd project
npm install

# Update backend URL in lib/backendConfig.ts
# Add google-services.json from Firebase

# Start Expo dev server
npx expo start
```

**See [project/README.md](project/README.md) for detailed setup instructions.**

## 📚 Documentation

- **[Backend Documentation](backend/README.md)** - API setup, deployment, and endpoints
- **[Frontend Documentation](project/README.md)** - Mobile app setup, building, and development
- **[Environment Variables Guide](backend/.env.example)** - Configuration reference

## 🌐 Deployment

### Backend (Railway)

1. Connect GitHub repository to Railway
2. Set root directory to `backend`
3. Add environment variables from `.env.example`
4. Deploy automatically on push to main

**Live Backend:** https://nex-app-production.up.railway.app

### Frontend (EAS Build)

```bash
cd project

# Build production APK
eas build --platform android --profile production

# Download and install APK
```

**Play Store:** https://play.google.com/store/apps/details?id=com.mycompany.nexeed1

## 🔐 Environment Variables

### Backend (.env)

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Authentication
JWT_SECRET="..."
GOOGLE_CLIENT_ID="..."

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Server
PORT=3001
NODE_ENV=production
```

### Frontend (app.json + config files)

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

## 📱 Deep Linking

### How It Works

1. User shares post → Generates HTTPS link
2. Recipient clicks link → Opens in browser
3. Browser shows redirect page → Auto-opens app
4. App navigates to specific post

### Link Formats

- **App Scheme:** `boltnexeed://post/{postId}`
- **HTTPS:** `https://nex-app-production.up.railway.app/post/{postId}`

### Configuration

**Backend:** Serves redirect page at `/post/:id`
**Frontend:** Handles deep links in `lib/myappDeepLinking.ts`
**App Config:** Intent filters in `app.json`

## 🔧 Development

### Project Structure

```
nexapp/
├── backend/
│   ├── config/              # Database & service configs
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── prisma/             # Database schema
│   └── server.js           # Entry point
│
├── project/
│   ├── app/                # Expo Router pages
│   ├── components/         # Reusable components
│   ├── context/            # React Context providers
│   ├── lib/                # Services & utilities
│   ├── constants/          # Theme & constants
│   └── app.json            # Expo configuration
│
└── README.md               # This file
```

### Key Technologies

**Backend:**
- Express.js 5 - Web framework
- Prisma - Database ORM
- Socket.IO - WebSocket server
- Firebase Admin - Push notifications
- Supabase - Database & storage

**Frontend:**
- Expo SDK 52 - React Native framework
- Expo Router - File-based navigation
- Socket.IO Client - Real-time chat
- Firebase Messaging - Push notifications
- TypeScript - Type safety

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
- Check DATABASE_URL is correct
- Verify Supabase project is active
- Run `npx prisma generate`

**App won't build**
- Check `google-services.json` exists
- Verify package name matches Firebase
- Clean build: `cd android && ./gradlew clean`

**Deep links not working**
- Rebuild app after changing `app.json`
- Check backend URL in `backendConfig.ts`
- Verify intent filters

**Push notifications not working**
- Check Firebase service account key
- Verify FCM token is being sent
- Check backend logs for errors

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment

### Chats
- `GET /api/chats` - Get user chats
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message

### Users
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/search` - Search users

**Full API documentation:** [backend/README.md](backend/README.md)

## 🎨 Theming

### Brand Colors

- **Primary Blue:** `#004aad`
- **Secondary Purple:** `#e385ec`
- **Gradient:** Blue → Purple (135deg)

### Theme Support

- Light mode with white background
- Dark mode with black background
- Automatic system theme detection
- Manual theme toggle

## 📝 Version History

### v1.1.6 (Current)
- ✅ Post sharing with deep linking
- ✅ Beautiful share dialog
- ✅ HTTPS redirect page with gradient
- ✅ Improved backend route handling
- ✅ Updated documentation

### v1.1.5
- ✅ Real-time chat optimization
- ✅ Push notification improvements
- ✅ UI/UX enhancements

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

- **Developer:** Kishan
- **Platform:** Nexeed Social Media
- **Repository:** https://github.com/Kishan89/nex-app

## 📞 Support

For technical support or questions:
- Check documentation in `backend/README.md` and `project/README.md`
- Review troubleshooting sections
- Contact development team

---

**Built with ❤️ for the Nexeed Community**

### Quick Links
- 📱 [Play Store](https://play.google.com/store/apps/details?id=com.mycompany.nexeed1)
- 🌐 [Backend API](https://nex-app-production.up.railway.app)
- 📚 [Backend Docs](backend/README.md)
- 📱 [Frontend Docs](project/README.md)
