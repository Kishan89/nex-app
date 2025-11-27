# Achievement System Test Script

## Overview
Yeh script saare achievements ko test karta hai **bina frontend ke**. Directly backend services aur database ko test karta hai.

## How to Run

### 1. Backend folder mein jao:
```bash
cd backend
```

### 2. Test script run karo:
```bash
node test-achievements.js
```

## What It Tests

### ✅ First Steps Achievements
- **First Post** - Pehli post create karne pe unlock hota hai
- **First Like** - Pehli baar kisi post ko like karne pe
- **First Comment** - Pehla comment karne pe
- **First Follower** - Pehla follower milne pe

### ✅ Engagement Achievements
- **10 Likes** - Rising Star
- **25 Likes** - Popular Creator
- **50 Likes** - Influencer
- **100 Likes** - Social Star

### ✅ XP Achievements
- **100 XP** - Learning Fast
- **250 XP** - Expert
- **1000 XP** - Master

### ✅ Streak Achievements
- **3 Day Streak** - Consistent
- **7 Day Streak** - Dedicated
- **60 Day Streak** - Unstoppable

### ✅ Special Achievements
- **Night Owl** - 12 AM - 4 AM ke beech post karne pe
- **Early Bird** - 5 AM - 7 AM ke beech post karne pe

### ✅ Duplicate Prevention Test
- Check karta hai ki same achievement baar baar unlock toh nahi ho raha

## Output Example

```
============================================================
ℹ️  🧪 ACHIEVEMENT SYSTEM TEST SUITE
============================================================

ℹ️  Setting up test environment...
✅ Using test user: john_doe (ID: cm5abc123)
ℹ️  Current XP: 45

🧪 Testing First Post Achievement...
ℹ️  User has 5 posts
✅ First Post achievement is unlocked ✓

🧪 Testing Like Achievements (10, 25, 50, 100)...
ℹ️  User has received 15 likes
✅ Rising Star (10 likes) - UNLOCKED ✓
ℹ️  Popular Creator - Progress: 15/25

🧪 Testing XP Achievements (100, 250, 1000)...
ℹ️  User has 45 XP
ℹ️  Learning Fast - Progress: 45/100 XP

🧪 Testing Streak Achievements (3, 7, 60 days)...
ℹ️  Current streak: 0 days
ℹ️  Longest streak: 0 days
ℹ️  Consistent - Progress: 0/3 days

🧪 Testing First Steps Achievements...
✅ First Like - UNLOCKED ✓
✅ First Comment - UNLOCKED ✓
ℹ️  First Follower - Not unlocked (no followers)

🧪 Testing Special Achievements (Night Owl, Early Bird)...
ℹ️  Night Owl - Not unlocked (post between 12 AM - 4 AM to unlock)
ℹ️  Early Bird - Not unlocked (post between 5 AM - 7 AM to unlock)

🧪 Testing Duplicate Unlock Prevention...
ℹ️  Attempting to unlock first_post achievement 3 times...
✅ Duplicate prevention working - only 1 record exists ✓

ℹ️  === ACHIEVEMENT SUMMARY ===

ℹ️  Total Achievements: 4/15 (27%)
ℹ️  Current XP: 45
ℹ️  Total Posts: 5
ℹ️  Total Likes Received: 15
ℹ️  Current Streak: 0 days
ℹ️  Followers: 0

ℹ️  Unlocked Achievements:
  ✓ Welcome Creator!
  ✓ Spreading Love
  ✓ Join the Conversation
  ✓ Rising Star

============================================================
✅ All tests completed!
============================================================
```

## What to Check

### ✅ Green Checkmarks (✅)
- Achievement properly unlocked
- Test passed successfully

### ⚠️ Yellow Warnings (⚠️)
- Achievement should be unlocked but isn't
- Script will try to trigger it automatically

### ℹ️ Blue Info (ℹ️)
- Achievement not unlocked yet (expected)
- Shows current progress

### ❌ Red Errors (❌)
- Something went wrong
- Check the error message

## Troubleshooting

### Error: "No users found in database"
**Solution**: Database mein koi user nahi hai. Pehle ek user create karo.

### Error: "Cannot connect to database"
**Solution**: 
1. Check `.env` file mein `DATABASE_URL` sahi hai
2. Backend server running hai ya nahi check karo
3. Database accessible hai ya nahi verify karo

### Achievement not unlocking
**Solution**:
1. Check karo user ne wo action kiya hai ya nahi (post, like, comment, etc.)
2. Database mein data sahi hai ya nahi verify karo
3. Backend logs check karo for errors

## Manual Testing

Agar specific achievement test karna hai:

```javascript
// test-achievements.js mein yeh functions individually call kar sakte ho:

// Only first post test
await testFirstPostAchievement();

// Only like achievements
await testLikeAchievements();

// Only XP achievements
await testXPAchievements();
```

## Database Verification

Test ke baad database mein verify karne ke liye:

```sql
-- Check user achievements
SELECT * FROM "UserAchievement" WHERE "userId" = 'your-user-id';

-- Check for duplicates
SELECT "achievementId", COUNT(*) 
FROM "UserAchievement" 
WHERE "userId" = 'your-user-id'
GROUP BY "achievementId"
HAVING COUNT(*) > 1;

-- Check user stats
SELECT 
  u.username,
  u.xp,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT l.id) as total_likes_received
FROM "User" u
LEFT JOIN "Post" p ON p."userId" = u.id
LEFT JOIN "Like" l ON l."postId" = p.id
WHERE u.id = 'your-user-id'
GROUP BY u.id, u.username, u.xp;
```

## Notes

- Script automatically pehle user ko select kar lega database se
- Koi frontend changes nahi hain - pure backend test hai
- Test script achievements ko unlock bhi kar sakta hai agar conditions meet ho rahi hain
- Duplicate prevention automatically test hota hai

## Success Criteria

✅ All achievements properly synced  
✅ No duplicate unlocks  
✅ XP values match between profile and achievements  
✅ Progress bars show correct values  
✅ Time-based achievements work correctly  
✅ First steps achievements trigger properly  
