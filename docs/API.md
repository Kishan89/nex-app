# API Documentation

This document describes the REST API endpoints for the Social Media App.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. Authentication will be added in future versions.

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

## Endpoints

### Health Check

Check if the API server is running.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "API server is running",
  "timestamp": "2024-01-09T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Posts

### Get All Posts

Retrieve all posts with pagination support.

```http
GET /api/posts?page=1&limit=20
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of posts per page (default: 20)

**Response:**
```json
[
  {
    "id": "cm5uekoq0002blgsrswx3ve1",
    "username": "alexsmith",
    "avatar": "https://example.com/avatar.jpg",
    "content": "Just launched my new app!",
    "image": "https://example.com/image.jpg",
    "likes": 42,
    "comments": 8,
    "reposts": 0,
    "time": "2h"
  }
]
```

### Get Single Post

Retrieve a specific post by ID.

```http
GET /api/posts/:postId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm5uekoq0002blgsrswx3ve1",
    "username": "alexsmith",
    "avatar": "https://example.com/avatar.jpg",
    "content": "Just launched my new app!",
    "image": "https://example.com/image.jpg",
    "likes": 42,
    "comments": 8,
    "reposts": 0,
    "time": "2h"
  }
}
```

### Create Post

Create a new post.

```http
POST /api/posts
```

**Request Body:**
```json
{
  "content": "Post content",
  "imageUrl": "https://example.com/image.jpg", // optional
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "new_post_id",
    "username": "alexsmith",
    "avatar": "https://example.com/avatar.jpg",
    "content": "Post content",
    "image": "https://example.com/image.jpg",
    "likes": 0,
    "comments": 0,
    "reposts": 0,
    "time": "now"
  }
}
```

### Like/Unlike Post

Toggle like status on a post.

```http
POST /api/posts/:postId/like
```

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post liked",
  "data": {
    "liked": true
  }
}
```

### Bookmark/Unbookmark Post

Toggle bookmark status on a post.

```http
POST /api/posts/:postId/bookmark
```

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post bookmarked",
  "data": {
    "bookmarked": true
  }
}
```

---

## Comments

### Get Comments for Post

Retrieve all comments for a specific post.

```http
GET /api/posts/:postId/comments?page=1&limit=50
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of comments per page (default: 50)

**Response:**
```json
[
  {
    "id": "comment_id",
    "username": "commenter",
    "avatar": "https://example.com/avatar.jpg",
    "text": "Great post!",
    "time": "5m"
  }
]
```

### Create Comment

Add a comment to a post.

```http
POST /api/posts/:postId/comments
```

**Request Body:**
```json
{
  "text": "Comment text",
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "new_comment_id",
    "username": "commenter",
    "avatar": "https://example.com/avatar.jpg",
    "text": "Comment text",
    "time": "now"
  }
}
```

---

## Chats

### Get User Chats

Retrieve all chats for a user.

```http
GET /api/chats/user/:userId
```

**Response:**
```json
[
  {
    "id": "chat_id",
    "name": "John Doe",
    "lastMessage": "Hey, how are you?",
    "time": "2h",
    "avatar": "https://example.com/avatar.jpg",
    "isOnline": true,
    "unread": 2
  }
]
```

### Get Chat Messages

Retrieve messages for a specific chat.

```http
GET /api/chats/:chatId/messages?userId=user_id&page=1&limit=50
```

**Query Parameters:**
- `userId` (optional): Current user ID to determine message ownership
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of messages per page (default: 50)

**Response:**
```json
[
  {
    "id": "message_id",
    "text": "Hello there!",
    "isUser": false,
    "timestamp": "10:30 AM",
    "status": "read",
    "sender": {
      "id": "sender_id",
      "username": "johndoe",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
]
```

### Send Message

Send a message in a chat.

```http
POST /api/chats/:chatId/messages
```

**Request Body:**
```json
{
  "content": "Message text",
  "senderId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "new_message_id",
    "text": "Message text",
    "isUser": true,
    "timestamp": "10:35 AM",
    "status": "sent",
    "sender": {
      "id": "user_id",
      "username": "currentuser",
      "avatar": "https://example.com/avatar.jpg"
    }
  }
}
```

### Create Chat

Create a new chat conversation.

```http
POST /api/chats
```

**Request Body:**
```json
{
  "name": "Group Chat Name", // optional for group chats
  "isGroup": false,
  "participantIds": ["user1_id", "user2_id"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "id": "new_chat_id",
    "name": "Group Chat Name",
    "isGroup": false,
    "participants": [
      {
        "user": {
          "id": "user1_id",
          "username": "user1",
          "name": "User One",
          "avatar": "https://example.com/avatar1.jpg"
        }
      }
    ]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | OK |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 500  | Internal Server Error |

## Rate Limiting

Currently, there are no rate limits implemented. Rate limiting will be added in future versions.

## Data Models

### Post Model
```json
{
  "id": "string",
  "content": "string",
  "imageUrl": "string | null",
  "userId": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Comment Model
```json
{
  "id": "string",
  "text": "string",
  "postId": "string",
  "userId": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Chat Model
```json
{
  "id": "string",
  "name": "string | null",
  "isGroup": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Message Model
```json
{
  "id": "string",
  "content": "string",
  "chatId": "string",
  "senderId": "string",
  "status": "SENDING | SENT | DELIVERED | READ",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```
