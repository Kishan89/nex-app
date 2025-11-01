# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Nexeed is a full-stack social media application built with React Native (Expo) for the frontend and Node.js/Express for the backend. The app features real-time chat via Socket.IO, push notifications via FCM, and uses PostgreSQL with Prisma ORM.

## Development Commands

### Backend (from `backend/` directory)

**Development & Testing:**
```bash
npm run dev                      # Start development server on port 3000
npm start                        # Start production server
```

**Database Management:**
```bash
npm run db:generate              # Generate Prisma client after schema changes
npm run db:migrate              # Run database migrations (creates migration files)
npm run db:push                 # Push schema changes without migration (dev only)
npm run db:studio               # Open Prisma Studio GUI to view/edit data
npm run db:seed                 # Seed database with sample data
npm run db:reset                # Reset database (DESTRUCTIVE - removes all data)
npm run db:clear                # Clear all database data
npm run db:reset-data           # Reset data only
npm run db:complete-reset       # Complete database reset
```

### Frontend (from `project/` directory)

**Development:**
```bash
npm run dev                      # Start Expo dev server (disables telemetry)
npm start                        # Start Expo without telemetry flag
npm run web                      # Start web version
npm run android                  # Run on Android
npm run ios                      # Run on iOS (macOS only)
```

**Build & Deploy:**
```bash
npm run build:web                # Build for web deployment
npm run lint                     # Run ESLint on frontend code
```

### Root Commands (from repository root)

```bash
npm start                        # Starts backend server
npm run build                    # Install backend dependencies
npm run dev                      # Start backend in dev mode
```

## Architecture Overview

### Key Architectural Patterns

1. **Layered Backend Architecture**
   - **Controllers** (`backend/controllers/`): Handle HTTP requests/responses
   - **Services** (`backend/services/`): Business logic layer (postService, chatService, socketService, etc.)
   - **Routes** (`backend/routes/`): Define API endpoints and map to controllers
   - **Middleware** (`backend/middleware/`): CORS, error handling, database health checks

2. **Real-Time Communication**
   - Socket.IO integration in `backend/services/socketService.js`
   - Auto-joins users to chat rooms on connection
   - Message delivery with acknowledgments
   - Online/offline status tracking
   - Typing indicators

3. **Database Layer**
   - Prisma ORM with PostgreSQL (supports Supabase)
   - Connection pooling and retry logic in `backend/config/database.js`
   - Optimized for Railway/Render deployment with connection management
   - Direct URL and pooled connection support

4. **Notification System**
   - Dual notification approach: Socket.IO for real-time + FCM for push
   - `backend/services/fcmService.js`: Sends push notifications
   - `project/lib/fcmService.ts`: Frontend FCM handler
   - Notifications stored in database for history

5. **Frontend State Management**
   - Context-based architecture (`project/context/`)
   - AuthContext: User authentication state
   - SocketContext: WebSocket connection management
   - ChatContext: Chat state with ultra-fast caching
   - NotificationContext: Global notification UI
   - ThemeContext: Dark/light mode support

6. **API Client Architecture**
   - Centralized API service in `project/lib/api.ts`
   - JWT token management with AsyncStorage
   - Automatic token extraction from JWT payload
   - Retry logic for critical endpoints (auth, chats, profiles)
   - Request timeout handling (60s default)

### Critical Data Flow

**Message Sending Flow:**
1. User sends message in React Native app
2. Socket.IO `send_message` event emitted with tempMessageId
3. `socketService.js` saves to database via `chatService`
4. Message broadcast to all chat participants via Socket.IO rooms
5. FCM notifications sent to offline/background users
6. Acknowledgment sent to sender with permanent message ID
7. Frontend replaces temp message with real message from server

**Authentication Flow:**
1. User logs in (email/password or Google OAuth)
2. Backend verifies credentials and returns JWT
3. JWT stored in AsyncStorage via `api.ts`
4. JWT decoded to extract `userId` for API requests
5. Authorization header added to all authenticated requests
6. Socket.IO connection established with JWT token

**Post Interaction Flow:**
1. Like/bookmark actions go through `api.ts` methods
2. Backend updates database and returns new counts
3. Frontend optimistically updates UI
4. Notification created for post author
5. Real-time notification via Socket.IO + FCM

## Important Technical Details

### Database Connection Management

The app uses sophisticated connection handling for Supabase free tier (which pauses after inactivity):

- **Startup**: Server starts immediately, database connects asynchronously
- **Health Checks**: `/health` endpoint returns 200 even if DB disconnected (for Railway)
- **Wake-up**: `/wake-db` endpoint to manually reconnect
- **Monitoring**: `dbMonitor` utility tracks connection health
- **Retries**: 3 retry attempts with 2s delay between attempts

### Socket.IO Room Management

- Users auto-join all their chat rooms on connection
- Room names format: `chat:{chatId}`
- Participants verified before broadcast
- Handles disconnection cleanup gracefully

### Environment Variables

**Backend (.env in `backend/`):**
```
DATABASE_URL            # PostgreSQL connection string (Supabase or local)
DIRECT_URL             # Direct database URL (Supabase)
PORT                   # Server port (default: 3000)
NODE_ENV               # development or production
JWT_SECRET             # Secret for JWT signing
FRONTEND_URL           # CORS origin
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key
```

**Frontend (.env in `project/`):**
```
EXPO_PUBLIC_API_URL    # Backend API URL (default: Railway production URL)
```

### Prisma Schema Key Points

- **Users**: Stores auth (hashed passwords), profiles, XP system
- **Posts**: Content, images, YouTube embeds, polls
- **Comments**: Threaded replies via self-referencing `parentId`
- **Chats**: Group chat support, participant tracking
- **Messages**: Status tracking (SENDING → SENT → DELIVERED → READ)
- **Notifications**: Typed (LIKE, COMMENT, FOLLOW, MESSAGE)
- **Follows**: Social graph relationships
- **Polls**: Embedded in posts with vote tracking
- **FCM Tokens**: Multiple device support per user

### File Upload System

Uses Supabase Storage (not local filesystem):
- Upload endpoint: `/api/upload`
- Accepts multipart form data
- Returns permanent URL from Supabase bucket
- Organized by folder parameter

### Testing & Debugging

**Backend Health Check:**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health
```

**Prisma Studio** (visual database browser):
```bash
cd backend && npm run db:studio
# Opens on http://localhost:5555
```

**Test Files** (located in root):
- `test-backend.js`: Tests backend endpoints
- `test-login.js`: Tests authentication
- `test-notifications-complete.js`: Tests notification system
- `test-user-endpoints.js`: Tests user API

### Common Gotchas

1. **Port Already in Use**: Backend runs on 3000, frontend on 8081
2. **Database Connection Issues**: Check DATABASE_URL format, ensure Supabase project is active
3. **Socket.IO Not Connecting**: Verify JWT token is valid and included in handshake auth
4. **FCM Not Working**: Check Firebase config files exist (google-services.json, firebase.json)
5. **Module Not Found**: Run `npm install` in both `backend/` and `project/` directories
6. **Expo Cache Issues**: Run `npx expo start --clear` to clear cache

### Deployment Context

- **Production Backend**: Deployed on Railway (https://nex-app-production.up.railway.app)
- **Database**: Supabase PostgreSQL
- **Frontend**: Expo with EAS Build for native apps
- **Configuration**: `railway.json` and `Procfile` for Railway, `eas.json` for Expo builds

## Code Conventions

### Backend
- CommonJS modules (`require`/`module.exports`)
- Controllers handle requests, services contain business logic
- Async/await for all database operations
- Error handling via middleware (`errorHandler.js`)
- Console logging with emoji prefixes (🚀, ✅, ❌, etc.)

### Frontend
- TypeScript with Expo Router for navigation
- Functional components with hooks
- Context API for global state
- Absolute imports via `@/` path alias
- Theme system via `constants/theme.ts`
- NativeWind (Tailwind) for styling (minimal usage)

## Key Files to Know

**Backend:**
- `backend/server.js` - Main entry point
- `backend/routes/index.js` - API route definitions
- `backend/services/socketService.js` - Real-time messaging
- `backend/config/database.js` - Prisma client initialization
- `backend/prisma/schema.prisma` - Database schema

**Frontend:**
- `project/app/_layout.tsx` - Root layout with providers
- `project/lib/api.ts` - API client and endpoint definitions
- `project/context/` - Global state management
- `project/app/(tabs)/` - Main tab navigation screens
- `project/constants/theme.ts` - Color schemes and styling

## Performance Optimizations

- Ultra-fast chat caching (`ultraFastChatCache` in `project/lib/ChatCache.ts`)
- Optimistic UI updates for likes/bookmarks
- Message batching in Socket.IO
- Database connection pooling
- Lazy loading for user lists and posts
