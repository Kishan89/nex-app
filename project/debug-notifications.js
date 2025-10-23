// Debug script for testing notifications
import { fcmService } from './lib/fcmService';
import { apiService } from './lib/api';

export const debugNotifications = async () => {
  console.log('🔔 Starting Notification Debug...\n');
  
  try {
    // 1. Check if FCM service is initialized
    console.log('1️⃣ Checking FCM Service...');
    await fcmService.initialize();
    
    // 2. Check FCM token
    console.log('2️⃣ Checking FCM Token...');
    const token = await fcmService.getStoredToken();
    console.log('FCM Token exists:', !!token);
    if (token) {
      console.log('Token length:', token.length);
    }
    
    // 3. Check API service user ID
    console.log('3️⃣ Checking API Service...');
    console.log('User ID exists:', !!apiService.userId);
    
    // 4. Test notification system
    console.log('4️⃣ Testing Notification System...');
    await fcmService.debugNotificationSystem();
    
    // 5. Test push notification
    console.log('5️⃣ Testing Push Notification...');
    await fcmService.testPushNotification();
    
    console.log('\n✅ Notification debug completed');
    
    return {
      fcmInitialized: fcmService.isInitialized,
      hasToken: !!token,
      hasUserId: !!apiService.userId,
      token: token ? `${token.substring(0, 20)}...` : null
    };
    
  } catch (error) {
    console.error('❌ Notification debug error:', error);
    return { error: error.message };
  }
};

// Export for manual testing
export default debugNotifications;
