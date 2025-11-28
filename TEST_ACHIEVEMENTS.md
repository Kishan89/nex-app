# Achievement System Testing Guide 🏆

## Test Checklist

### ✅ First Steps Achievements

#### 1. Welcome Creator! (first_post)
- **How to test**: Create your first post
- **Expected**: Badge unlock popup should appear immediately after post creation
- **Badge**: 🎉
- **Rarity**: Common (Bronze)

#### 2. Spreading Love (first_like)
- **How to test**: Like any post for the first time
- **Expected**: Badge unlock popup
- **Badge**: ❤️
- **Rarity**: Common (Bronze)

#### 3. Join the Conversation (first_comment)
- **How to test**: Leave your first comment on any post
- **Expected**: Badge unlock popup
- **Badge**: 💬
- **Rarity**: Common (Bronze)

#### 4. Growing Network (first_follower)
- **How to test**: Get someone to follow you
- **Expected**: Badge unlock popup
- **Badge**: 👥
- **Rarity**: Common (Bronze)

---

### ⭐ Engagement Achievements

#### 5. Rising Star (10_likes)
- **How to test**: Get 10 total likes on your posts
- **Expected**: Badge unlock popup when 10th like is received
- **Badge**: ⭐
- **Rarity**: Common (Bronze)

#### 6. Popular Creator (25_likes)
- **How to test**: Get 25 total likes on your posts
- **Expected**: Badge unlock popup
- **Badge**: 🌟
- **Rarity**: Common (Bronze)

#### 7. Influencer (50_likes)
- **How to test**: Get 50 total likes on your posts
- **Expected**: Badge unlock popup
- **Badge**: 💎
- **Rarity**: Rare (Silver)

#### 8. Social Star (100_likes)
- **How to test**: Get 100 total likes on your posts
- **Expected**: Badge unlock popup
- **Badge**: 🔥
- **Rarity**: Rare (Silver)

---

### 🔥 Streak Achievements

#### 9. Consistent (3_day_streak)
- **How to test**: Post on 3 consecutive days
- **Expected**: Badge unlock popup on 3rd day
- **Badge**: 📅
- **Rarity**: Common (Bronze)

#### 10. Dedicated (7_day_streak)
- **How to test**: Post on 7 consecutive days
- **Expected**: Badge unlock popup on 7th day
- **Badge**: 🔥
- **Rarity**: Rare (Silver)

#### 11. Unstoppable (60_day_streak)
- **How to test**: Post on 60 consecutive days
- **Expected**: Badge unlock popup on 60th day
- **Badge**: 👑
- **Rarity**: Legendary (Gold)

---

### 📚 XP Achievements

#### 12. Learning Fast (100_xp)
- **How to test**: Reach 100 XP
- **Expected**: Badge unlock popup when XP reaches 100
- **Badge**: 📚
- **Rarity**: Common (Bronze)

#### 13. Expert (250_xp)
- **How to test**: Reach 250 XP
- **Expected**: Badge unlock popup when XP reaches 250
- **Badge**: 🎓
- **Rarity**: Rare (Silver)

#### 14. Master (1000_xp)
- **How to test**: Reach 1000 XP
- **Expected**: Badge unlock popup when XP reaches 1000
- **Badge**: 🏆
- **Rarity**: Legendary (Gold)

---

### 🦉 Special Achievements

#### 15. Night Owl (night_owl)
- **How to test**: Create a post between 12 AM - 4 AM
- **Expected**: Badge unlock popup immediately
- **Badge**: 🦉
- **Rarity**: Rare (Silver)

#### 16. Early Bird (early_bird)
- **How to test**: Create a post between 5 AM - 7 AM
- **Expected**: Badge unlock popup immediately
- **Badge**: 🐦
- **Rarity**: Rare (Silver)

---

## Quick Test Scenarios

### Scenario 1: New User First Post
1. Create a new account or use test account
2. Create your first post
3. **VERIFY**: "Welcome Creator!" popup appears with confetti animation
4. Click "Continue" button
5. **VERIFY**: You're redirected back to home feed

### Scenario 2: XP Milestone
1. Check current XP in profile
2. Perform actions to reach 100 XP (create posts, get likes)
3. **VERIFY**: "Learning Fast" popup appears when XP hits 100
4. **VERIFY**: Badge shows 📚 icon with bronze gradient

### Scenario 3: Streak Achievement
1. Post today
2. Post tomorrow (next day)
3. Post day after tomorrow (3rd day)
4. **VERIFY**: "Consistent" popup appears on 3rd day post

### Scenario 4: Time-Based Achievement
1. Wait until 12 AM - 4 AM (or change device time for testing)
2. Create a post
3. **VERIFY**: "Night Owl" popup appears with 🦉 badge

---

## Popup Verification Checklist

When achievement unlocks, verify:

✅ **Modal appears** with dark overlay (90% opacity black)
✅ **Confetti animation** plays (20 particles falling)
✅ **Badge displays** with correct icon and gradient color
✅ **Haptic feedback** triggers (success vibration)
✅ **Title shows** "Achievement Unlocked!" text
✅ **Achievement name** displays correctly
✅ **Description** shows below title
✅ **Rarity badge** displays (COMMON/RARE/LEGENDARY)
✅ **Gradient colors** match rarity:
   - Common: Bronze (#CD7F32 → #8B4513)
   - Rare: Silver (#C0C0C0 → #A9A9A9)
   - Legendary: Gold (#FFD700 → #FFA500)
✅ **Glow effect** around badge matches rarity color
✅ **Continue button** works and closes modal
✅ **Achievement marked as seen** in backend

---

## Debug Console Logs

When testing, watch for these console logs:

```
🏆 Checking for new achievements...
👤 User ID: [userId]
📝 Post created: [postId]
🎯 Unseen achievements from API: [achievementIds]
✨ Showing achievement modal for: [achievementId]
🎉 Achievement modal closed
✅ Achievement marked as seen
```

---

## API Endpoints to Test

### Get User Achievements
```
GET /api/achievements/:userId
```

### Get Unseen Achievements
```
GET /api/achievements/unseen/:userId
```

### Mark as Seen
```
PUT /api/achievements/:userId/:achievementId/seen
```

### Get Stats
```
GET /api/achievements/stats/:userId
```

---

## Common Issues & Solutions

### Issue: Popup not showing
**Solution**: 
1. Check console logs for errors
2. Verify backend is processing achievement unlock
3. Check `getUnseenAchievements` API response
4. Ensure `seen: false` in database

### Issue: Achievement unlocked but no popup
**Solution**:
1. Check if achievement was already unlocked before
2. Verify `unlocked: true` and `seen: false` in database
3. Check frontend is calling `getUnseenAchievements` after action

### Issue: Popup shows wrong badge
**Solution**:
1. Verify achievement ID matches between frontend and backend
2. Check ACHIEVEMENTS array in `achievementService.ts`

### Issue: Confetti not animating
**Solution**:
1. Check if animations are enabled on device
2. Verify React Native Reanimated is working
3. Test on physical device (not emulator)

---

## Testing Commands

### Backend: Seed Achievements
```bash
cd backend
node -e "require('./services/achievementService').seedAchievements().then(() => console.log('Done'))"
```

### Backend: Check User Achievements
```bash
# In backend directory
node -e "require('./services/achievementService').getUserAchievements('USER_ID').then(r => console.log(JSON.stringify(r, null, 2)))"
```

### Backend: Check Unseen
```bash
node -e "require('./services/achievementService').getUnseenAchievements('USER_ID').then(r => console.log(r))"
```

---

## Manual Database Check

```sql
-- Check user achievements
SELECT * FROM "UserAchievement" WHERE "userId" = 'YOUR_USER_ID';

-- Check unseen achievements
SELECT * FROM "UserAchievement" 
WHERE "userId" = 'YOUR_USER_ID' 
AND "unlocked" = true 
AND "seen" = false;

-- Reset achievement for testing
UPDATE "UserAchievement" 
SET "unlocked" = false, "seen" = false, "unlockedAt" = NULL 
WHERE "userId" = 'YOUR_USER_ID' AND "achievementId" = 'first_post';
```

---

## Expected Flow

1. **User performs action** (e.g., creates post)
2. **Backend processes** achievement in `handlePostCreated()`
3. **Achievement unlocked** with `seen: false`
4. **Frontend calls** `getUnseenAchievements()`
5. **Popup displays** with animation
6. **User clicks Continue**
7. **Frontend calls** `markAchievementAsSeen()`
8. **Achievement marked** `seen: true`
9. **User redirected** to previous screen

---

## Test Priority Order

1. ✅ **First Post** - Easiest to test
2. ✅ **XP Achievements** - Test with multiple posts
3. ✅ **Like Achievements** - Get friends to like posts
4. ✅ **Streak Achievements** - Requires multiple days
5. ✅ **Time-Based** - Test during specific hours

---

## Success Criteria

✅ All 16 achievements can be unlocked
✅ Popup appears for each unlock
✅ Confetti animation plays smoothly
✅ Haptic feedback works
✅ Badge colors match rarity
✅ Achievement marked as seen after viewing
✅ No duplicate popups for same achievement
✅ Console logs show correct flow
✅ Backend API responds correctly
✅ Database updates properly

---

**Happy Testing! 🎉**
