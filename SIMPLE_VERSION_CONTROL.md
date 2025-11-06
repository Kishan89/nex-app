# Simple Version Control - Exact Match Only 🎯

## How It Works (Super Simple!)

```
Supabase Version: 1.0.12
App Version: 1.0.12 → ✅ Match → App works
App Version: 1.0.11 → ❌ Mismatch → Force Update Pop-up
App Version: 1.0.13 → ❌ Mismatch → Force Update Pop-up
```

**Rule**: App version MUST exactly match Supabase version. No exceptions!

---

## Setup (Same as before)

### Step 1: Run Supabase Migration

```sql
CREATE TABLE IF NOT EXISTS app_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  min_version VARCHAR(20) NOT NULL,
  platform VARCHAR(10) NOT NULL DEFAULT 'android',
  force_update BOOLEAN DEFAULT true,
  update_message TEXT DEFAULT 'Please update the app to continue',
  play_store_url TEXT,
  app_store_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert version 1.0.12 (current production version)
INSERT INTO app_version (version, min_version, platform, force_update, update_message, play_store_url)
VALUES (
  '1.0.12', 
  '1.0.12', 
  'android', 
  true, 
  'Please update the app from Play Store to continue using Nexeed.',
  'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1'
);
```

✅ **Note**: `min_version` is kept same as `version` for simplicity.

---

## How to Update Version

### When Publishing New Version (e.g., 1.0.13):

**Step 1: Build & Upload APK**
- Build version 1.0.13
- Upload to Play Store

**Step 2: Update Supabase (CRITICAL!)**

```sql
UPDATE app_version
SET 
  version = '1.0.13',
  min_version = '1.0.13',  -- Keep same as version
  updated_at = NOW()
WHERE platform = 'android';
```

**Step 3: Result**
- ALL users with ANY version except 1.0.13 → **BLOCKED** 🚫
- Users must update to 1.0.13 to use app

---

## Scenarios

### Scenario 1: App is Current
```
App.json: "1.0.12"
Supabase: "1.0.12"
Result: ✅ No pop-up, app works
```

### Scenario 2: App is Outdated
```
App.json: "1.0.11"
Supabase: "1.0.12"
Result: 🚫 Force update pop-up
        "Please update to version 1.0.12"
        Can't use app until update
```

### Scenario 3: App is Newer (shouldn't happen but handled)
```
App.json: "1.0.13"
Supabase: "1.0.12"
Result: 🚫 Force update pop-up
        "Please update to version 1.0.12"
        (User somehow has newer version, ask to update)
```

---

## Testing

### Test 1: Exact Match (No Pop-up)

1. **Supabase**:
   ```sql
   UPDATE app_version SET version = '1.1.6', min_version = '1.1.6' WHERE platform = 'android';
   ```

2. **app.json**:
   ```json
   { "version": "1.1.6" }
   ```

3. **Run app** → ✅ No pop-up, works normally

### Test 2: Mismatch (Force Update)

1. **Supabase**:
   ```sql
   UPDATE app_version SET version = '1.0.12', min_version = '1.0.12' WHERE platform = 'android';
   ```

2. **app.json**:
   ```json
   { "version": "1.0.11" }
   ```

3. **Run app** → 🚫 Force update pop-up blocks app

### Test 3: After Update

1. **Update app.json**:
   ```json
   { "version": "1.0.12" }
   ```

2. **Run app** → ✅ Pop-up gone, app works

---

## Production Workflow

### Publishing New Version:

1. **Update `app.json`**:
   ```json
   {
     "version": "1.0.13"
   }
   ```

2. **Build APK** (version 1.0.13)

3. **Upload to Play Store**

4. **Wait for approval**

5. **IMPORTANT**: Update Supabase AFTER Play Store approval:
   ```sql
   UPDATE app_version 
   SET version = '1.0.13', min_version = '1.0.13'
   WHERE platform = 'android';
   ```

6. **Result**: 
   - Users with 1.0.12 → Update required immediately
   - Users download 1.0.13 from Play Store
   - Can use app after updating

---

## Quick Commands

### Check Current Version in Supabase:
```sql
SELECT version, platform, updated_at 
FROM app_version 
WHERE platform = 'android';
```

### Update to New Version:
```sql
UPDATE app_version 
SET version = '1.0.13', min_version = '1.0.13', updated_at = NOW()
WHERE platform = 'android';
```

### Test API:
```bash
curl "http://localhost:3000/api/version/check?version=1.0.11&platform=android"
```

---

## Important Notes

### ⚠️ Be Careful!
- Update Supabase ONLY after Play Store approval
- If you update Supabase before Play Store approval:
  - ALL users blocked immediately
  - But new version not available yet
  - Users can't use app! 🚨

### ✅ Correct Order:
1. Build APK
2. Upload to Play Store
3. **Wait for approval** (can take hours/days)
4. Approval done → APK available
5. **NOW** update Supabase
6. Users get pop-up → Can download from Play Store

### 🎯 Simple Rule:
**Supabase version = Currently available version on Play Store**

---

## API Response

### Request:
```
GET /api/version/check?version=1.0.11&platform=android
```

### Response (Update Required):
```json
{
  "success": true,
  "data": {
    "updateRequired": true,
    "forceUpdate": true,
    "isLatestVersion": false,
    "currentVersion": "1.0.11",
    "latestVersion": "1.0.12",
    "requiredVersion": "1.0.12",
    "message": "Please update to version 1.0.12",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.mycompany.nexeed1"
  }
}
```

### Response (Up to Date):
```json
{
  "success": true,
  "data": {
    "updateRequired": false,
    "forceUpdate": false,
    "isLatestVersion": true,
    "currentVersion": "1.0.12",
    "latestVersion": "1.0.12",
    "requiredVersion": "1.0.12",
    "message": "App is up to date",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.mycompany.nexeed1"
  }
}
```

---

## Console Logs

### When Versions Match:
```
📱 Checking app version: 1.0.12 (Platform: android)
✅ Version check result: { 
  currentVersion: "1.0.12", 
  requiredVersion: "1.0.12", 
  updateRequired: false 
}
✅ App is up to date
```

### When Versions Don't Match:
```
📱 Checking app version: 1.0.11 (Platform: android)
✅ Version check result: { 
  currentVersion: "1.0.11", 
  requiredVersion: "1.0.12", 
  updateRequired: true,
  forceUpdate: true
}
🚫 App update required - versions don't match
```

---

## Summary

### Simple Logic:
```
if (appVersion === supabaseVersion) {
  ✅ App works
} else {
  🚫 Force update pop-up
}
```

### Benefits:
- ✅ **Super simple** - exact match only
- ✅ **No confusion** - one version to manage
- ✅ **Instant updates** - all users on same version
- ✅ **Control** - you decide when to update

### Workflow:
1. Build new version
2. Upload to Play Store
3. Get approval
4. Update Supabase to same version
5. All users forced to update
6. Everyone on same version ✅

**Simple, effective, and powerful!** 🎯
