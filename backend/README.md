# Backend Setup with Prisma and Supabase

This backend uses Prisma as the ORM with Supabase (PostgreSQL) as the database.

## Prerequisites

- Node.js installed
- Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Copy the example environment file
cp .env.example .env
```

Then edit the `.env` file and add your Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres?schema=public"
```

You can find your connection details in your Supabase project:
1. Go to your Supabase project dashboard
2. Click on "Settings" → "Database"
3. Copy the connection string and replace `[YOUR_PASSWORD]` with your database password

### 3. Database Setup

Run the Prisma migration to create all tables:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all the tables defined in `prisma/schema.prisma`
- Generate the Prisma client

### 4. Prisma Studio (Optional)

You can use Prisma Studio to view and edit your data:

```bash
npx prisma studio
```

## Database Schema

The schema includes the following models:

- **User**: User accounts with profiles
- **Post**: Social media posts with content and images
- **Comment**: Comments on posts
- **Like**: Post likes
- **Bookmark**: Saved posts
- **Follow**: User follow relationships
- **Chat**: Chat rooms (direct or group)
- **ChatParticipant**: Users in chats
- **Message**: Chat messages
- **Notification**: User notifications

## Using Prisma Client

Import and use the Prisma client in your routes:

```javascript
const prisma = require('./lib/prisma');

// Example: Get all posts with user and likes
const posts = await prisma.post.findMany({
  include: {
    user: true,
    likes: true,
    comments: {
      include: {
        user: true
      }
    },
    _count: {
      select: {
        likes: true,
        comments: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

## Example API Routes

### Get Posts with Engagement Data
```javascript
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        user: {
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
            bookmarks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Create a New Post
```javascript
app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl, userId } = req.user;
    
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Common Queries

### Get User Profile with Stats
```javascript
const userProfile = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    _count: {
      select: {
        posts: true,
        followers: true,
        following: true
      }
    }
  }
});
```

### Get Chat Messages
```javascript
const messages = await prisma.message.findMany({
  where: { chatId: chatId },
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
```

### Get User Notifications
```javascript
const notifications = await prisma.notification.findMany({
  where: { userId: userId },
  include: {
    fromUser: {
      select: {
        id: true,
        username: true,
        avatar: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```