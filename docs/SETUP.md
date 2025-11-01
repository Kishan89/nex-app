# Setup Guide

This guide will walk you through setting up the Social Media App for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **PostgreSQL** database (local installation or Supabase account)
- **Expo CLI** for mobile development

### Required Tools

```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/

# Install Expo CLI globally
npm install -g @expo/cli

# Verify installations
node --version
npm --version
expo --version
```

## Project Structure

```
social-media-app/
├── backend/                  # Node.js/Express API server
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── prisma/             # Database schema and migrations
│   └── lib/                # Libraries and configurations
├── project/                # React Native/Expo frontend
│   ├── app/                # Expo Router pages
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API client
│   ├── constants/          # App constants and themes
│   ├── types/              # TypeScript type definitions
│   └── assets/             # Images, fonts, etc.
├── docs/                   # Documentation
└── scripts/                # Development and deployment scripts
```

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/social_media_db?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/social_media_db?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration (for future authentication)
JWT_SECRET=""

# CORS Configuration
FRONTEND_URL="http://localhost:8081"
```

### 4. Database Setup

#### Option A: Local PostgreSQL

1. Create a database:
```sql
CREATE DATABASE social_media_db;
```

2. Update your `.env` file with local database credentials.

#### Option B: Supabase (Recommended)

1. Create a [Supabase](https://supabase.io) account
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string
5. Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres?schema=public"
```

### 5. Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations to create tables
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### 6. Start Backend Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend server will be available at `http://localhost:3000`

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 4. Start Frontend Development Server

```bash
npm run dev
```

This will start the Expo development server. You can:

- Press `w` to open in web browser
- Press `i` to open iOS simulator (macOS only)
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on your mobile device

## Development Workflow

### Database Management

```bash
# Navigate to backend directory
cd backend

# View data in Prisma Studio
npm run db:studio

# Reset database (removes all data)
npm run db:reset

# Push schema changes without migration
npm run db:push

# Generate Prisma client after schema changes
npm run db:generate
```

### Running Both Services

You can run both backend and frontend simultaneously using separate terminal windows:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd project
npm run dev
```

## Mobile Development

### iOS Development (macOS only)

1. Install Xcode from the App Store
2. Install iOS Simulator
3. Start frontend development server
4. Press `i` to open in iOS simulator

### Android Development

1. Install Android Studio
2. Set up Android Virtual Device (AVD)
3. Start the emulator
4. Start frontend development server
5. Press `a` to open in Android emulator

### Physical Device Testing

1. Install [Expo Go](https://expo.io/client) on your device
2. Start frontend development server
3. Scan QR code with Expo Go (iOS) or camera app (Android)

## Troubleshooting

### Common Issues

**Database connection fails:**
- Verify your DATABASE_URL in `.env`
- Ensure PostgreSQL is running (if using local database)
- Check Supabase project status and credentials

**Frontend can't connect to backend:**
- Ensure backend server is running on port 3000
- Check EXPO_PUBLIC_API_URL in frontend `.env`
- Verify firewall settings allow connections

**Expo development server issues:**
- Clear Expo cache: `npx expo start --clear`
- Restart development server
- Check if port 8081 is available

**Module not found errors:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

### Getting Help

- Check the [troubleshooting guide](./TROUBLESHOOTING.md)
- Review error logs in terminal
- Open an issue on GitHub with error details

## Next Steps

- Review the [API documentation](./API.md)
- Check out the [development guidelines](./DEVELOPMENT.md)
- Read about [deployment options](./DEPLOYMENT.md)
