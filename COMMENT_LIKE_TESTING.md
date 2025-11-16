# Comment/Reply Like System - Testing Guide

## Backend Setup

### 1. Run Database Migration
```bash
cd backend
npx prisma migrate dev --name add_comment_likes
# OR manually run the SQL migration
psql $DATABASE_URL < migrations/add_comment_likes.sql
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Restart Backend Server
```bash
npm run dev
```

## API Testing (Postman/Thunder Client)

### Like a Comment
```
POST /api/posts/:postId/comments/:commentId/like
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Comment liked",
  "data": {
    "liked": true,
    "likeCount": 1
  }
}
```

### Unlike a Comment
```
POST /api/posts/:postId/comments/:commentId/like
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Comment unliked",
  "data": {
    "liked": false,
    "likeCount": 0
  }
}
```

### Get Comments with Like Status
```
GET /api/posts/:postId/comments
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "text": "Great post!",
      "likesCount": 5,
      "isLiked": true,
      "replies": [
        {
          "id": "...",
          "text": "Thanks!",
          "likesCount": 2,
          "isLiked": false
        }
      ]
    }
  ]
}
```

## Frontend Testing

### Manual Testing Steps

1. **Open Comments Modal**
   - Tap on any post's comment button
   - Verify comments load with like counts

2. **Like a Comment**
   - Tap thumbs-up icon on a comment
   - Icon should turn blue immediately (optimistic update)
   - Count should increment by 1
   - Verify persistence by closing and reopening modal

3. **Unlike a Comment**
   - Tap thumbs-up icon on a liked comment
   - Icon should turn gray immediately
   - Count should decrement by 1

4. **Like a Reply**
   - Tap "X replies" to open reply panel
   - Tap thumbs-up icon on a reply
   - Verify same behavior as comment likes

5. **Network Error Handling**
   - Enable airplane mode
   - Try to like a comment
   - Should rollback to previous state
   - Disable airplane mode and retry

6. **Multiple Users**
   - User A likes a comment
   - User B opens same post
   - User B should see updated like count
   - User B's like status should be independent

### Edge Cases to Test

1. **Double Tap Prevention**
   - Rapidly tap like button multiple times
   - Should only toggle once per tap

2. **Offline Mode**
   - Like comment while offline
   - Should show optimistic update
   - Should rollback when network request fails

3. **Comment Deletion**
   - Like a comment
   - Delete the comment
   - Verify like is also deleted (cascade)

4. **Anonymous Comments**
   - Like an anonymous comment
   - Verify it works same as regular comments

5. **Nested Replies**
   - Like a reply in reply panel
   - Close and reopen panel
   - Verify like persists

6. **Like Count Display**
   - 0 likes: No count shown
   - 1+ likes: Count shown next to icon

## Database Verification

### Check Comment Likes Table
```sql
SELECT * FROM comment_likes;
```

### Check Comment Counts
```sql
SELECT id, text, "likesCount" FROM comments WHERE "likesCount" > 0;
```

### Verify Unique Constraint
```sql
-- This should fail (duplicate like)
INSERT INTO comment_likes (id, "userId", "commentId", "createdAt")
VALUES ('test', 'user1', 'comment1', NOW());
```

## Performance Testing

1. **Load Test**
   - Create 100+ comments on a post
   - Verify like buttons render quickly
   - Check API response time < 500ms

2. **Concurrent Likes**
   - Multiple users like same comment simultaneously
   - Verify count increments correctly
   - No race conditions

## Success Criteria

✅ Like/unlike works for both comments and replies
✅ Optimistic UI updates instantly
✅ Rollback on error works correctly
✅ Like counts persist across sessions
✅ No duplicate likes (idempotent)
✅ Cascade delete when comment deleted
✅ Works with anonymous comments
✅ API response time < 500ms
✅ No breaking changes to existing features
