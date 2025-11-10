# Nexeed Mobile App 📱

React Native mobile application for Nexeed social media platform built with Expo.

## 📋 Table of Contents
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Guide](#setup-guide)
- [Environment Configuration](#environment-configuration)
- [Building & Deployment](#building--deployment)
- [Development](#development)

## 🛠 Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API + Zustand
- **Styling**: React Native StyleSheet
- **Real-time**: Socket.IO Client
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Authentication**: JWT + Google OAuth
- **Image Handling**: Expo Image Picker + Image Manipulator
- **Storage**: AsyncStorage
- **Deep Linking**: Custom URL schemes + HTTPS links

## ✨ Features

### Core Features
- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Create posts with images, polls, and YouTube links
- ✅ Real-time feed with infinite scroll
- ✅ Comments and nested replies
- ✅ Like and bookmark posts
- ✅ User profiles with follow system
- ✅ Real-time chat with Socket.IO
- ✅ Push notifications
- ✅ Search users and posts
- ✅ Trending posts
- ✅ Dark/Light theme support

### Advanced Features
- ✅ Post sharing with deep linking
- ✅ Image optimization and compression
- ✅ Offline support with caching
- ✅ Pull-to-refresh
- ✅ Optimistic UI updates
- ✅ YouTube video previews
- ✅ Link detection and preview
- ✅ Poll voting
- ✅ Image viewer with zoom
- ✅ Safe area handling

## 📁 Project Structure

```
project/
├── app/                      # Expo Router pages
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── index.tsx        # Home feed
│   │   ├── search.tsx       # Search screen
│   │   ├── chats.tsx        # Chats list
│   │   └── profile.tsx      # User profile
│   ├── post/[id].tsx        # Post detail screen
│   ├── profile/[id].tsx     # Other user profile
│   ├── chat/[id].tsx        # Chat conversation
│   ├── login.tsx            # Login screen
│   ├── create-post.tsx      # Create post screen
│   └── _layout.tsx          # Root layout with providers
├── components/              # Reusable components
│   ├── PostCard.tsx         # Post display component
│   ├── Comments.tsx         # Comments section
│   ├── ImageViewer.tsx      # Image viewer modal
│   ├── PollComponent.tsx    # Poll voting UI
│   └── chat/                # Chat components
├── context/                 # React Context providers
│   ├── AuthContext.tsx      # Authentication state
│   ├── ThemeContext.tsx     # Theme management
│   ├── SocketContext.tsx    # Socket.IO connection
│   ├── ChatContext.tsx      # Chat state
│   └── NotificationContext.tsx # Notification handling
├── lib/                     # Services and utilities
│   ├── apiService.ts        # API client
│   ├── fcmService.ts        # Push notifications
│   ├── myappDeepLinking.ts  # Deep linking handler
│   ├── UnifiedShareService.ts # Post sharing
│   ├── imageOptimizer.ts    # Image compression
│   └── ChatCache.ts         # Chat caching
├── constants/               # App constants
│   └── theme.ts             # Theme colors and styles
├── types/                   # TypeScript types
│   └── index.ts             # Type definitions
├── assets/                  # Static assets
│   ├── icon.png             # App icon
│   └── splash.png           # Splash screen
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android) or Xcode (for iOS)
- EAS CLI: `npm install -g eas-cli`

### 1. Install Dependencies

```bash
cd project
npm install
```

### 2. Configuration Files

#### Update Backend URL

Edit `lib/backendConfig.ts`:
```typescript
export const BACKEND_URL = 'https://your-backend.railway.app';
export const SHARE_BASE_URL = BACKEND_URL;
```

#### Configure Deep Linking

Edit `app.json`:
```json
{
  "expo": {
    "scheme": ["boltnexeed", "nexeed"],
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            { "scheme": "boltnexeed" },
            { "scheme": "https", "host": "your-backend.railway.app" }
          ]
        }
      ]
    }
  }
}
```

### 3. Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Add Android app with package ID: `com.mycompany.nexeed1`
3. Download `google-services.json`
4. Place in `project/` directory

### 4. Google OAuth Setup

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add to `app.json`:
```json
{
  "extra": {
    "googleWebClientId": "YOUR_WEB_CLIENT_ID",
    "googleAndroidClientId": "YOUR_ANDROID_CLIENT_ID"
  }
}
```

## 🔐 Environment Configuration

The app uses `backendConfig.ts` for configuration:

```typescript
// lib/backendConfig.ts
export const BACKEND_URL = 'https://nex-app-production.up.railway.app';
export const SHARE_BASE_URL = BACKEND_URL;
```

No `.env` file needed - all config is in TypeScript files.

## 📱 Building & Deployment

### Development Build

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

### Production Build with EAS

#### 1. Login to EAS
```bash
eas login
```

#### 2. Configure EAS Build

`eas.json` is already configured. Update if needed:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

#### 3. Build APK

```bash
# Build production APK
eas build --platform android --profile production

# Build development APK (for testing)
eas build --platform android --profile development
```

#### 4. Download and Install

After build completes:
1. Download APK from EAS dashboard
2. Transfer to Android device
3. Install APK
4. Grant permissions

### Update App Version

Edit `app.json`:
```json
{
  "expo": {
    "version": "1.1.7",
    "android": {
      "versionCode": 19
    }
  }
}
```

- Increment `version` for minor updates (1.1.7 → 1.1.8)
- Increment `versionCode` for every build (19 → 20)

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm start

# Start with cache clear
npm start -- --clear

# Run on Android
npm run android

# Run on iOS
npm run ios

# Type checking
npx tsc --noEmit

# Format code
npx prettier --write .
```

### Key Development Files

#### API Service (`lib/apiService.ts`)
Centralized API client with authentication:
```typescript
import apiService from '@/lib/apiService';

// Get posts
const posts = await apiService.getPosts();

// Create post
const newPost = await apiService.createPost({
  content: 'Hello world',
  imageUrl: 'https://...'
});
```

#### Authentication (`context/AuthContext.tsx`)
```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  // Use user data
  console.log(user?.username);
}
```

#### Theme (`context/ThemeContext.tsx`)
```typescript
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { isDark, colors, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Content */}
    </View>
  );
}
```

### Deep Linking

#### Test Deep Links

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "boltnexeed://post/POST_ID" com.mycompany.nexeed1

# Or use HTTPS link
adb shell am start -W -a android.intent.action.VIEW -d "https://your-backend.railway.app/post/POST_ID" com.mycompany.nexeed1
```

#### Handle Deep Links

Deep linking is automatically handled by `lib/myappDeepLinking.ts`:
- `boltnexeed://post/{id}` → Opens post detail
- `boltnexeed://profile/{id}` → Opens user profile
- `https://backend.com/post/{id}` → Opens post detail

### Push Notifications

#### Test Notifications

Use Firebase Console:
1. Go to Cloud Messaging
2. Send test notification
3. Target device token (check app logs)

#### Handle Notifications

Notifications are handled by `lib/fcmService.ts`:
- Foreground: Shows in-app notification
- Background: System notification
- Tap: Navigates to relevant screen

## 🐛 Troubleshooting

### Build Issues

**Error: "google-services.json not found"**
- Download from Firebase Console
- Place in `project/` directory
- Rebuild

**Error: "Duplicate resources"**
- Clean build: `cd android && ./gradlew clean`
- Delete `node_modules` and reinstall

### Deep Linking Issues

**Links not opening app**
- Rebuild app after changing `app.json`
- Check intent filters in `app.json`
- Verify backend URL matches

**App opens but doesn't navigate**
- Check deep linking service initialization in `_layout.tsx`
- Verify route format in `myappDeepLinking.ts`

### Socket.IO Connection Issues

**Can't connect to chat**
- Check `BACKEND_URL` in `backendConfig.ts`
- Verify backend is running
- Check CORS settings on backend

### Push Notification Issues

**Not receiving notifications**
- Check `google-services.json` is correct
- Verify FCM token is being sent to backend
- Check Firebase project settings

## 📦 Key Dependencies

```json
{
  "expo": "^52.0.0",
  "react-native": "0.76.5",
  "expo-router": "~4.0.0",
  "socket.io-client": "^4.8.1",
  "@react-native-firebase/messaging": "^21.8.1",
  "@react-native-google-signin/google-signin": "^14.1.0",
  "react-native-reanimated": "~3.16.1",
  "zustand": "^5.0.2"
}
```

## 🎨 Theming

### Colors

Primary colors defined in `constants/theme.ts`:
- Blue: `#3B8FE8`
- Purple: `#e385ec`
- Background (Dark): `#000000`
- Background (Light): `#ffffff`

### Custom Theme

```typescript
// constants/theme.ts
export const Colors = {
  primary: '#3B8FE8',
  secondary: '#e385ec',
  // ... more colors
};
```

## 📝 License

Private project - All rights reserved

## 👥 Support

For issues or questions, contact the development team.

---

**Built with ❤️ using React Native + Expo**
