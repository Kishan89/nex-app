# Achievement System Testing Instructions

## 🧪 Automated Testing

### Run the Test Script

```bash
cd backend
node test-achievements.js
```

### What the Test Script Does:

1. **Seeds achievement definitions** into database
2. **Creates test users** for each test
3. **Tests all 15 achievements**:
   - ✅ first_post
   - ✅ first_like
   - ✅ first_comment
   - ✅ first_follower
   - ✅ 10_likes, 25_likes, 50_likes, 100_likes
   - ✅ 100_xp, 250_xp, 1000_xp
   - ✅ 3_day_streak, 7_day_streak
   - ✅ night_owl, early_bird (time-dependent)
4. **Cleans up test data** automatically
5. **Shows detailed results** with pass/fail status

### Expected Output:

```
============================================================
ℹ️  Starting Achievement System Tests
============================================================

ℹ️  Seeding achievement definitions...
✅ Achievement definitions seeded

🧪 Testing first_post achievement...
✅ first_post achievement unlocked correctly

🧪 Testing first_like achievement...
✅ first_like achievement unlocked correctly

🧪 Testing first_comment achievement...
✅ first_comment achievement unlocked correctly

🧪 Testing first_follower achievement...
✅ first_follower achievement unlocked correctly

🧪 Testing likes achievements (10, 25, 50, 100)...
✅ 10_likes achievement unlocked correctly
✅ 25_likes achievement unlocked correctly
✅ 50_likes achievement unlocked correctly
✅ 100_likes achievement unlocked correctly

🧪 Testing XP achievements (100, 250, 1000)...
✅ 100_xp achievement unlocked correctly
✅ 250_xp achievement unlocked correctly
✅ 1000_xp achievement unlocked correctly

🧪 Testing streak achievements (3, 7 days)...
✅ 3_day_streak achievement unlocked correctly
✅ 7_day_streak achievement unlocked correctly

🧪 Testing special achievements (night_owl, early_bird)...
ℹ️  Current hour: 14 - Neither night_owl nor early_bird should unlock
✅ Special achievements correctly NOT unlocked (wrong time)

ℹ️  Cleaning up test data...
✅ Cleanup complete

============================================================
ℹ️  Test Results Summary
============================================================
✅ PASS - first_post
✅ PASS - first_like
✅ PASS - first_comment
✅ PASS - first_follower
✅ PASS - likes (10/25/50/100)
✅ PASS - XP (100/250/1000)
✅ PASS - streaks (3/7 days)
✅ PASS - special (night_owl/early_bird)

------------------------------------------------------------
Total Tests: 8
Passed: 8
Failed: 0
Success Rate: 100%
============================================================

✅ 🎉 ALL TESTS PASSED! Achievement system is working correctly.
```

---

## 📱 Manual Testing (In App)

### Test 1: first_post
1. Create a new user account
2. Create your first post
3. Go to Achievements page
4. **Expected**: "Welcome Creator!" badge should be unlocked

### Test 2: first_like
1. Like any post
2. Go to Achievements page
3. **Expected**: "Spreading Love" badge should be unlocked

### Test 3: first_comment
1. Comment on any post
2. Go to Achievements page
3. **Expected**: "Join the Conversation" badge should be unlocked

### Test 4: first_follower
1. Have another user follow you
2. Go to Achievements page
3. **Expected**: "Growing Network" badge should be unlocked

### Test 5: 10_likes
1. Create posts and get 10 total likes on them
2. Go to Achievements page
3. **Expected**: "Rising Star" badge should be unlocked

### Test 6: 3_day_streak
1. Post on Day 1
2. Post on Day 2
3. Post on Day 3
4. Go to Achievements page
5. **Expected**: "Consistent" badge should be unlocked

### Test 7: 100_xp
1. Create 20 posts (20 × 5 = 100 XP)
2. Go to Achievements page
3. **Expected**: "Learning Fast" badge should be unlocked

### Test 8: night_owl
1. Create a post between 12 AM - 4 AM
2. Go to Achievements page
3. **Expected**: "Night Owl" badge should be unlocked

---

## 🔍 Verification Checklist

After running tests, verify:

- [ ] All test users created successfully
- [ ] All achievements unlocked at correct thresholds
- [ ] No duplicate badges awarded
- [ ] Test data cleaned up properly
- [ ] No errors in console
- [ ] Database in consistent state

---

## 🐛 Troubleshooting

### Test fails with "Achievement not unlocked"
- Check if achievement definitions are seeded: `SELECT * FROM Achievement;`
- Check if triggers are being called (check logs)
- Verify database connection is working

### Test fails with database error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npx prisma generate`
- Run `npx prisma migrate deploy`

### Special achievements always fail
- These are time-dependent
- Run test between 12 AM - 4 AM for night_owl
- Run test between 5 AM - 7 AM for early_bird
- Or check that they correctly DON'T unlock at other times

---

## 📊 Test Coverage

The test script covers:

✅ **Achievement Unlocking**
- First-time actions (post, like, comment, follower)
- Milestone achievements (likes, XP)
- Streak calculations
- Time-based achievements

✅ **Edge Cases**
- Duplicate prevention
- Multiple actions same day (streaks)
- Consecutive day tracking
- XP thresholds

✅ **Data Integrity**
- Test data cleanup
- No side effects on production data
- Database consistency

---

## 🎯 Success Criteria

Tests pass if:
1. ✅ All 8 test groups pass
2. ✅ Success rate = 100%
3. ✅ No errors in console
4. ✅ Test data cleaned up
5. ✅ All achievements unlock at correct thresholds

---

## 📝 Notes

- Test script uses `@test.com` email domain for test users
- All test data is automatically cleaned up
- Tests are safe to run multiple times
- Tests don't affect production data
- Special achievements (night_owl, early_bird) are time-dependent

---

## 🚀 Quick Test Command

```bash
# From project root
cd backend && node test-achievements.js
```

**Expected Result**: All tests pass ✅
