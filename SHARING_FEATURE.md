# Post Sharing Feature - Complete Implementation

## Overview
Complete post sharing functionality with deep linking support. When users share a post, they get a clickable HTTPS link that automatically opens the app or redirects to the Play Store.

## How It Works

### 1. **Share Flow**
```
User clicks Share → Chooses app (WhatsApp/SMS/etc.) → Link is sent
→ Recipient clicks link → Opens in browser → Redirects to app → Opens post detail
```

### 2. **Deep Linking Architecture**

#### **App Configuration** (`app.json`)
- **Custom Scheme**: `boltnexeed://` - Direct app links
- **HTTPS Links**: `https://nex-app-production.up.railway.app/post/{id}` - Web links that trigger deep linking

#### **Link Types**
1. **HTTPS Link** (Primary): `https://nex-app-production.up.railway.app/post/{postId}`
   - ✅ Clickable in all messaging apps (WhatsApp, SMS, Telegram)
   - ✅ Opens in browser with redirect page
   - ✅ Automatically triggers app open
   - ✅ Fallback to Play Store if app not installed

2. **App Scheme** (Secondary): `boltnexeed://post/{postId}`
   - Used for direct app-to-app navigation
   - May not be clickable in some messaging apps

### 3. **Components**

#### **Frontend (React Native)**

**a) UnifiedShareService** (`project/lib/UnifiedShareService.ts`)
- Main sharing service with clean API
- Handles post and profile sharing
- Generates clickable HTTPS links
- Copy to clipboard functionality
- Methods:
  - `sharePost(postId, username, content)` - Share with options
  - `quickShare(postId, username, content)` - One-tap share
  - `showShareOptions(postId, username, content)` - Dialog with options
  - `copyPostLink(postId)` - Copy link to clipboard

**b) Deep Linking Service** (`project/lib/myappDeepLinking.ts`)
- Handles incoming deep links (both HTTPS and custom scheme)
- Navigates to correct screen
- Supports:
  - `boltnexeed://post/{id}`
  - `boltnexeed://profile/{id}`
  - `https://nex-app-production.up.railway.app/post/{id}`
  - `https://nex-app-production.up.railway.app/profile/{id}`

#### **Backend (Express.js)**

**a) Redirect Routes** (`backend/server.js`)
```javascript
app.get('/post/:postId', (req, res) => {
    res.sendFile('redirect.html');
});

app.get('/profile/:userId', (req, res) => {
    res.sendFile('redirect.html');
});
```

**b) Redirect Page** (`backend/public/redirect.html`)
- Beautiful loading screen
- Extracts post/profile ID from URL
- Generates deep link (`boltnexeed://post/{id}`)
- Automatically tries to open app
- Fallback to Play Store after 3 seconds
- Manual buttons for user control

### 4. **Implementation in Components**

All sharing is now unified across the app:

```typescript
// In PostCard, Post Detail, Home Feed, Profile
const handleShare = async () => {
  const { UnifiedShareService } = await import('@/lib/UnifiedShareService');
  UnifiedShareService.showShareOptions(post.id, post.username, post.content);
};
```

## Usage Examples

### Share a Post
```typescript
import { UnifiedShareService } from '@/lib/UnifiedShareService';

// With options dialog
UnifiedShareService.showShareOptions(postId, username, content);

// Direct share
await UnifiedShareService.sharePost(postId, username, content);

// Quick share (one-tap)
await UnifiedShareService.quickShare(postId, username, content);

// Copy link only
await UnifiedShareService.copyPostLink(postId);
```

### Share a Profile
```typescript
import { UnifiedShareService } from '@/lib/UnifiedShareService';

await UnifiedShareService.shareProfile(userId, username);
await UnifiedShareService.copyProfileLink(userId);
```

## Share Message Format

```
🚀 Check out this post by @username on Nexeed!

"Post content preview..."

https://nex-app-production.up.railway.app/post/123

📲 Download Nexeed: https://play.google.com/store/apps/details?id=com.mycompany.nexeed1
```

## Testing

### Test Deep Linking
1. **Share a post** from the app
2. **Send the link** to yourself via WhatsApp/SMS
3. **Click the link** - should open browser
4. **Browser redirects** - should open app
5. **App opens** to the specific post

### Test Cases
- ✅ Share from home feed
- ✅ Share from post detail screen
- ✅ Share from profile page
- ✅ Copy link to clipboard
- ✅ Click HTTPS link in WhatsApp
- ✅ Click HTTPS link in SMS
- ✅ Open link when app is closed (cold start)
- ✅ Open link when app is in background (warm start)
- ✅ Fallback to Play Store if app not installed

## Deployment Checklist

### App Side
- [x] Add HTTPS intent filters to `app.json`
- [x] Update deep linking service
- [x] Implement UnifiedShareService
- [x] Update all components to use new service
- [x] Test on physical device

### Backend Side
- [x] Ensure `/post/:id` route serves redirect.html
- [x] Ensure `/profile/:id` route serves redirect.html
- [x] Deploy backend to Railway
- [x] Test redirect page in browser

### Production
- [ ] Build new APK with updated app.json
- [ ] Test HTTPS deep linking on production
- [ ] Update Play Store listing if needed

## Configuration

### Change Share Base URL
Update `project/lib/backendConfig.ts`:
```typescript
export const SHARE_BASE_URL = 'https://your-domain.com';
```

### Add New Domain for Deep Linking
1. Add to `app.json` intent filters
2. Add to `myappDeepLinking.ts` hostname check
3. Rebuild app

## Troubleshooting

### Links not opening app
- Check if app.json has HTTPS intent filters
- Verify hostname matches SHARE_BASE_URL
- Rebuild and reinstall app

### Links not clickable in WhatsApp
- Ensure using HTTPS links (not app:// scheme)
- Check SHARE_BASE_URL is correct

### App opens but doesn't navigate to post
- Check deep linking service is initialized in _layout.tsx
- Verify route format in myappDeepLinking.ts
- Check console logs for navigation errors

## Architecture Benefits

✅ **Single Source of Truth**: One service for all sharing
✅ **Clickable Links**: HTTPS links work everywhere
✅ **Automatic App Open**: Deep linking handles redirection
✅ **Fallback Support**: Play Store if app not installed
✅ **Clean Messages**: Professional share text
✅ **Type Safety**: Full TypeScript support
✅ **Easy to Use**: Simple API across all components
