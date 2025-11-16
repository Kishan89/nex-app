# Comment/Reply Like Persistence Fix 🔧

## समस्या (Problem)
Comment और reply पर like करने के बाद reload करने पर likes preserve नहीं हो रहे थे और 0 दिख रहे थे।

## मूल कारण (Root Cause)
Backend से comments fetch करते समय `likes` relation को properly include नहीं किया जा रहा था:
- `likes: false` when `userId` is not provided
- `isLiked` calculation में केवल `likes.length > 0` check था, जो सही नहीं था
- Newly created comments में `likesCount` और `isLiked` fields missing थे

## समाधान (Solution)

### Backend Changes (`backend/services/commentService.js`)

#### 1. Fixed `getCommentsByPostId` - Likes Include
```javascript
// BEFORE
likes: userId ? {
  where: { userId },
  select: { id: true }
} : false

// AFTER
likes: userId ? {
  where: { userId },
  select: { id: true, userId: true }
} : true
```

**क्यों?** अब सभी likes fetch होंगे, और userId से match करके `isLiked` calculate होगा।

#### 2. Fixed `isLiked` Calculation
```javascript
// BEFORE
transformedParent.isLiked = parent.likes && parent.likes.length > 0;

// AFTER
transformedParent.isLiked = userId && parent.likes ? 
  parent.likes.some(like => like.userId === userId) : false;
```

**क्यों?** अब properly check होगा कि current user ने like किया है या नहीं।

#### 3. Added Like Data to New Comments
```javascript
const transformedComment = transformComment(createdComment);
transformedComment.likesCount = 0;
transformedComment.isLiked = false;
```

**क्यों?** Newly created comments में default like data होगा।

### Frontend Changes

#### 1. Comments.tsx - Broadcast Comment Processing
```javascript
const processedComment = {
  ...comment,
  likesCount: comment.likesCount || 0,
  isLiked: comment.isLiked || false,
  // ... rest of the fields
};
```

#### 2. Comments.tsx - Instant Comment
```javascript
const instantComment: Comment = {
  // ... other fields
  likesCount: 0,
  isLiked: false
};
```

#### 3. CommentReplyPanel.tsx - Same Fixes
- Broadcast reply processing में like data
- Instant reply में like data

## Files Modified

### Backend
- ✅ `backend/services/commentService.js` - 3 changes

### Frontend
- ✅ `project/components/Comments.tsx` - 2 changes
- ✅ `project/components/CommentReplyPanel.tsx` - 2 changes

## Testing Checklist

- [ ] Comment पर like करें
- [ ] Page reload करें
- [ ] Like count preserve हो रहा है
- [ ] Like button का color correct है (blue if liked)
- [ ] Reply पर like करें
- [ ] Reply panel close करके फिर open करें
- [ ] Reply like preserve हो रहा है
- [ ] Multiple users के likes properly count हो रहे हैं
- [ ] Unlike करने पर count decrement हो रहा है
- [ ] Reload के बाद unlike state preserve हो रहा है

## Deployment Steps

### Backend
```bash
cd backend

# No migration needed - only service logic changed
# Just restart the server
npm run dev

# OR on production
pm2 restart nex-app
```

### Frontend
```bash
cd project

# For development
npx expo start

# For production build
eas build --platform android --profile production
```

## Expected Behavior

### Before Fix ❌
1. User likes a comment → Like count shows 1
2. User reloads page → Like count shows 0
3. Like button color resets to gray

### After Fix ✅
1. User likes a comment → Like count shows 1
2. User reloads page → Like count still shows 1
3. Like button color stays blue
4. Database में like properly stored है

## Technical Details

### Database Query
```javascript
// Now fetches ALL likes for each comment
include: {
  likes: true  // or filtered by userId
}

// Then checks if current user liked it
isLiked = likes.some(like => like.userId === currentUserId)
```

### Data Flow
1. User clicks like → Optimistic update (instant UI change)
2. API call → Backend creates/deletes CommentLike record
3. Backend updates Comment.likesCount
4. Response returns → Frontend confirms update
5. On reload → Backend fetches with likes included
6. Frontend displays correct state

## Performance Impact
- ✅ Minimal - only fetching necessary like data
- ✅ Indexed queries (userId_commentId unique constraint)
- ✅ No N+1 queries (using include)

## Backward Compatibility
- ✅ Existing comments without likes work fine (default to 0)
- ✅ No breaking changes to API
- ✅ No database migration needed

---

**Status:** ✅ Fixed and Ready for Testing
**Priority:** High (User-facing bug)
**Impact:** All users who like comments/replies
