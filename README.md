# Social Media App

A full-stack social media application built with React Native (Expo) and Node.js.

## 🚀 Features

- **Social Feed**: Post updates, images, and interact with content
- **Real-time Chat**: Direct messaging and group chats
- **User Profiles**: Customizable user profiles with avatars and bios
- **Social Interactions**: Like, comment, bookmark, and follow users
- **Notifications**: Real-time notifications for interactions
- **Search**: Find users and content
- **Responsive Design**: Works on mobile, tablet, and web

## 🏗️ Architecture

```
social-media-app/
├── backend/                    # Node.js/Express API server
│   ├── config/                # Configuration files
│   │   └── database.js        # Database connection and setup
│   ├── controllers/           # Route controllers
│   │   ├── postController.js
│   │   ├── commentController.js
│   │   └── chatController.js
│   ├── middleware/            # Custom middleware
│   │   ├── cors.js           # CORS configuration
│   │   └── errorHandler.js   # Error handling
│   ├── routes/               # API routes
│   │   ├── index.js          # Main routes
│   │   ├── posts.js
│   │   ├── comments.js
│   │   └── chats.js
│   ├── services/             # Business logic
│   │   ├── postService.js
│   │   ├── commentService.js
│   │   └── chatService.js
│   ├── utils/                # Utility functions
│   │   └── helpers.js        # Common helper functions
│   ├── prisma/               # Database schema and migrations
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   ├── lib/                  # Libraries (legacy)
│   │   └── prisma.js
│   ├── server.js             # Main server file
│   ├── .env.example          # Environment variables example
│   ├── .eslintrc.js          # ESLint configuration
│   ├── .prettierrc           # Prettier configuration
│   └── package.json
├── project/                   # React Native/Expo frontend
│   ├── app/                  # Expo Router pages
│   │   ├── (tabs)/           # Tab navigation
│   │   ├── _layout.tsx       # Root layout
│   │   ├── profile.tsx
│   │   └── search.tsx
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # Basic UI components
│   │   │   ├── Button.tsx
│   │   │   └── Avatar.tsx
│   │   ├── chat/             # Chat-related components
│   │   │   └── ChatScreen.tsx
│   │   ├── social/           # Social media components
│   │   │   └── CommentsModal.tsx
│   │   └── (legacy components)
│   ├── hooks/                # Custom React hooks
│   │   └── useFrameworkReady.ts
│   ├── lib/                  # Utilities and API client
│   │   └── api.ts            # Enhanced API service
│   ├── constants/            # App constants
│   │   ├── theme.ts          # Theme colors and styles
│   │   └── api.ts            # API configuration
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # All app types
│   ├── assets/               # Images, fonts, etc.
│   │   └── images/
│   ├── .eslintrc.js          # ESLint configuration
│   ├── .prettierrc           # Prettier configuration
│   └── package.json
├── docs/                      # Documentation
│   ├── SETUP.md              # Detailed setup guide
│   └── API.md                # API documentation
├── scripts/                   # Development scripts
│   ├── setup.sh / setup.bat  # Initial setup script
│   ├── dev.sh / dev.bat      # Development environment
│   └── db-reset.sh           # Database reset utility
├── .gitignore                # Global gitignore
└── README.md                 # This file
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (planned)

### Frontend
- **Framework**: React Native
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **State Management**: React Hooks
- **HTTP Client**: Fetch API

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (local or Supabase)
- Expo CLI
- Git

## 🚀 Quick Start

### Automated Setup (Recommended)

**Windows:**
```bash
# Run the setup script
scripts\setup.bat

# Start development environment
scripts\dev.bat
```

**macOS/Linux:**
```bash
# Run the setup script
./scripts/setup.sh

# Start development environment
./scripts/dev.sh
```

### Manual Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd social-media-app
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate
npm run db:seed
npm run dev
```

#### 3. Frontend Setup
```bash
cd project
npm install
npm run dev
```

#### 4. Access the Application
- Backend API: http://localhost:3000
- Frontend: http://localhost:8081 (or scan QR code with Expo Go)
- Health Check: http://localhost:3000/api/health

## 📖 Detailed Setup

See the [Setup Guide](./docs/SETUP.md) for detailed installation and configuration instructions.

## 🧪 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

**Frontend:**
- `npm run dev` - Start Expo development server
- `npm run build:web` - Build for web
- `npm run lint` - Run ESLint

### Database Schema

The application uses the following main entities:
- Users (profiles, authentication)
- Posts (content, images)
- Comments (post interactions)
- Messages (chat system)
- Notifications (user alerts)
- Social relationships (follows, likes, bookmarks)

## 📁 Project Structure

```
backend/
├── controllers/          # Request handlers
├── middleware/          # Authentication, validation, etc.
├── routes/             # API endpoint definitions
├── services/           # Business logic layer
├── utils/              # Helper functions
├── prisma/             # Database schema and migrations
├── lib/                # Database connection, etc.
├── tests/              # Test files
└── config/             # Configuration files

project/
├── app/                # Expo Router app directory
│   ├── (tabs)/         # Tab-based navigation
│   └── _layout.tsx     # Root layout
├── components/         # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   └── navigation/     # Navigation components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── types/              # TypeScript definitions
├── assets/             # Static assets
└── constants/          # App constants
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues, please check the [troubleshooting guide](./docs/TROUBLESHOOTING.md) or open an issue.
