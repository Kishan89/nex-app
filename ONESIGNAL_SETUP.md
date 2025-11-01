# OneSignal Push Notifications Setup Guide

This guide will help you set up OneSignal for sending broadcast push notifications to all users (like e-commerce sale announcements).

## 📋 Table of Contents
1. [OneSignal Dashboard Setup](#1-onesignal-dashboard-setup)
2. [Mobile App Configuration](#2-mobile-app-configuration)
3. [Backend Configuration](#3-backend-configuration)
4. [Testing Notifications](#4-testing-notifications)
5. [Sending Broadcast Notifications](#5-sending-broadcast-notifications)

---

## 1. OneSignal Dashboard Setup

### Step 1.1: Create OneSignal Account
1. Go to [OneSignal](https://onesignal.com/) and sign up for a free account
2. Click on **"New App/Website"**
3. Enter your app name (e.g., "Nexeed")
4. Select **"Mobile App"** as the platform

### Step 1.2: Configure Android
1. In the OneSignal dashboard, select **Android** platform
2. You'll need your **Firebase Server Key** and **Firebase Sender ID**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** > **Cloud Messaging**
   - Copy the **Server Key** (Legacy)
   - Copy the **Sender ID**
3. Paste these values in OneSignal dashboard
4. Click **Save**

### Step 1.3: Configure iOS (if applicable)
1. In the OneSignal dashboard, select **iOS** platform
2. Upload your **APNs Certificate** or **APNs Auth Key**
3. Follow OneSignal's iOS setup guide

### Step 1.4: Get Your OneSignal Credentials
1. Go to **Settings** > **Keys & IDs** in OneSignal dashboard
2. Copy the following:
   - **OneSignal App ID** (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **REST API Key** (under "API Keys" section)

---

## 2. Mobile App Configuration

### Step 2.1: Update app.json
Open `project/app.json` and replace `YOUR_ONESIGNAL_APP_ID` with your actual OneSignal App ID:

```json
{
  "expo": {
    "extra": {
      "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

### Step 2.2: Rebuild Your App
After updating the configuration, you need to rebuild your app:

```bash
# Navigate to project directory
cd project

# For Android development build
npx expo run:android

# For iOS development build (Mac only)
npx expo run:ios

# For production build with EAS
eas build --platform android
eas build --platform ios
```

**Important:** You must rebuild the app after adding OneSignal. Simply restarting the dev server won't work.

### Step 2.3: Test on Device
1. Install the rebuilt app on your device
2. Open the app and log in
3. Grant notification permissions when prompted
4. Check OneSignal dashboard > **Audience** > **All Users** to see if your device is registered

---

## 3. Backend Configuration

### Step 3.1: Update Environment Variables
Add these to your backend `.env` file:

```env
# OneSignal configuration
ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ONESIGNAL_REST_API_KEY="your-rest-api-key-here"
```

### Step 3.2: Deploy Backend (if using Railway)
1. Go to your Railway project dashboard
2. Navigate to **Variables** tab
3. Add the two environment variables:
   - `ONESIGNAL_APP_ID`
   - `ONESIGNAL_REST_API_KEY`
4. Railway will automatically redeploy with new variables

---

## 4. Testing Notifications

### Test from OneSignal Dashboard
1. Go to OneSignal dashboard > **Messages** > **New Push**
2. Select **Send to All Subscribed Users**
3. Enter a title and message
4. Click **Send Message**
5. Check your device - you should receive the notification!

---

## 5. Sending Broadcast Notifications

### Option A: Using API Endpoints (Recommended)

Your backend now has three endpoints for sending notifications:

#### 1. Broadcast to All Users
```bash
POST https://your-backend-url.com/api/notifications/broadcast

Body:
{
  "title": "🎉 Big Sale Alert!",
  "message": "Get 50% off on all items. Limited time offer!",
  "data": {
    "type": "sale",
    "saleId": "123"
  },
  "imageUrl": "https://example.com/sale-banner.jpg",
  "url": "https://your-app.com/sale"
}
```

#### 2. Send to Specific Users
```bash
POST https://your-backend-url.com/api/notifications/send-to-users

Body:
{
  "userIds": ["user123", "user456"],
  "title": "Personal Offer",
  "message": "Special discount just for you!",
  "data": {
    "type": "personal_offer"
  }
}
```

#### 3. Send to Segment (by tags)
```bash
POST https://your-backend-url.com/api/notifications/send-to-segment

Body:
{
  "filters": [
    { "field": "tag", "key": "platform", "relation": "=", "value": "android" }
  ],
  "title": "Android Users Only",
  "message": "Special offer for Android users!"
}
```

### Option B: Using Postman

1. Open Postman
2. Create a new POST request
3. Set URL to: `https://your-backend-url.com/api/notifications/broadcast`
4. Set Headers:
   - `Content-Type: application/json`
5. Set Body (raw JSON):
```json
{
  "title": "🎉 Flash Sale!",
  "message": "50% off everything! Shop now!",
  "data": {
    "type": "sale",
    "screen": "home"
  }
}
```
6. Click **Send**

### Option C: Using cURL

```bash
curl -X POST https://your-backend-url.com/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Flash Sale!",
    "message": "50% off everything! Shop now!",
    "data": {
      "type": "sale"
    }
  }'
```

### Option D: Create Admin Panel (Future Enhancement)

You can create a simple admin panel in your app or web dashboard:

```typescript
// Example React/React Native component
const AdminNotificationSender = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendNotification = async () => {
    const response = await fetch('https://your-backend-url.com/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message })
    });
    
    if (response.ok) {
      alert('Notification sent successfully!');
    }
  };

  return (
    <View>
      <TextInput 
        placeholder="Title" 
        value={title} 
        onChangeText={setTitle} 
      />
      <TextInput 
        placeholder="Message" 
        value={message} 
        onChangeText={setMessage} 
      />
      <Button title="Send to All Users" onPress={sendNotification} />
    </View>
  );
};
```

---

## 📊 Monitoring & Analytics

### View Notification Statistics
1. Go to OneSignal dashboard > **Delivery**
2. See metrics like:
   - Total sent
   - Delivered
   - Clicked
   - Conversion rate

### View Audience
1. Go to **Audience** > **All Users**
2. See all registered devices
3. Filter by tags, platform, etc.

---

## 🔒 Security Recommendations

### 1. Add Admin Authentication
Currently, the broadcast endpoints are unprotected. Add authentication:

```javascript
// backend/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  next();
};

// In routes/notifications.js
router.post('/broadcast', adminAuth, notificationController.sendBroadcastNotification);
```

### 2. Rate Limiting
Add rate limiting to prevent abuse:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

router.post('/broadcast', notificationLimiter, notificationController.sendBroadcastNotification);
```

---

## 🎯 Use Cases

### 1. E-commerce Sale Announcements
```json
{
  "title": "🔥 Flash Sale Alert!",
  "message": "50% off on all electronics. Ends in 2 hours!",
  "imageUrl": "https://your-cdn.com/sale-banner.jpg",
  "data": {
    "type": "sale",
    "category": "electronics",
    "discount": 50
  }
}
```

### 2. New Feature Announcements
```json
{
  "title": "✨ New Feature Released!",
  "message": "Check out our new video calling feature!",
  "data": {
    "type": "feature",
    "screen": "video-call"
  }
}
```

### 3. Important Updates
```json
{
  "title": "⚠️ Maintenance Notice",
  "message": "App will be under maintenance from 2 AM to 4 AM",
  "data": {
    "type": "maintenance"
  }
}
```

### 4. Engagement Campaigns
```json
{
  "title": "👋 We Miss You!",
  "message": "Come back and see what's new!",
  "data": {
    "type": "re-engagement"
  }
}
```

---

## 🐛 Troubleshooting

### Notifications Not Received?

1. **Check OneSignal Dashboard**
   - Go to **Audience** > **All Users**
   - Verify your device is registered
   - Check if device is subscribed

2. **Check App Configuration**
   - Verify `oneSignalAppId` in `app.json` is correct
   - Ensure you rebuilt the app after adding OneSignal

3. **Check Permissions**
   - On device, go to Settings > Apps > Your App > Notifications
   - Ensure notifications are enabled

4. **Check Backend Logs**
   - Look for errors in backend console
   - Verify environment variables are set correctly

5. **Test from OneSignal Dashboard**
   - Send a test notification from OneSignal dashboard
   - If this works, issue is with your backend API

### Device Not Showing in OneSignal Dashboard?

1. Ensure app is rebuilt with OneSignal plugin
2. Check if user granted notification permissions
3. Verify OneSignal App ID is correct in `app.json`
4. Check app logs for OneSignal initialization errors

---

## 📚 Additional Resources

- [OneSignal Documentation](https://documentation.onesignal.com/)
- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [Expo OneSignal Plugin](https://github.com/OneSignal/onesignal-expo-plugin)

---

## ✅ Summary - What You Need to Do

### On Your End (Apne End Se):

1. **OneSignal Account Setup** (5 minutes)
   - Create account at onesignal.com
   - Create new app
   - Add Firebase credentials (Server Key & Sender ID)
   - Copy OneSignal App ID and REST API Key

2. **Update App Configuration** (2 minutes)
   - Open `project/app.json`
   - Replace `YOUR_ONESIGNAL_APP_ID` with your actual App ID
   - Save file

3. **Rebuild App** (10-15 minutes)
   - Run: `cd project && npx expo run:android`
   - Or build with EAS: `eas build --platform android`
   - Install rebuilt app on device

4. **Update Backend Environment** (2 minutes)
   - Add `ONESIGNAL_APP_ID` to backend `.env`
   - Add `ONESIGNAL_REST_API_KEY` to backend `.env`
   - If using Railway, add these in Variables tab

5. **Test** (2 minutes)
   - Send test notification from OneSignal dashboard
   - Or use API endpoint with Postman/cURL

**Total Time: ~20-25 minutes**

---

## 🎉 You're Done!

You can now send notifications to all your users at once, just like e-commerce companies do for sales and promotions!

For questions or issues, check the troubleshooting section above.
