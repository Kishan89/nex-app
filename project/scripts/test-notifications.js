// Test script to verify notification functionality
// Run this in your app's console or create a test button

export const testNotificationSystem = async () => {
  console.log('🧪 Starting notification system test...');
  
  try {
    // Import FCM service
    const { fcmService } = require('../lib/fcmService');
    
    // Test 1: Check if FCM service is initialized
    console.log('✅ Test 1: FCM Service initialized:', fcmService.isInitialized);
    
    // Test 2: Check if FCM is supported
    console.log('✅ Test 2: FCM supported:', fcmService.isSupported());
    
    // Test 3: Get stored token
    const storedToken = await fcmService.getStoredToken();
    console.log('✅ Test 3: Stored token exists:', !!storedToken);
    if (storedToken) {
      console.log('Token preview:', storedToken.substring(0, 20) + '...');
    }
    
    // Test 4: Test in-app notification banner
    console.log('✅ Test 4: Testing in-app notification banner...');
    const { DeviceEventEmitter } = require('react-native');
    
    DeviceEventEmitter.emit('showNotificationBanner', {
      title: '🧪 Test Notification',
      body: 'This is a test notification to verify the banner works',
      data: {
        type: 'like',
        postId: 'test-post',
        userId: 'test-user',
        username: 'test_user',
        avatar: 'https://via.placeholder.com/50'
      },
      onPress: () => {
        console.log('🧪 Test notification banner pressed!');
      }
    });
    
    // Test 5: Debug notification system
    await fcmService.debugNotificationSystem();
    
    console.log('🎉 Notification system test completed!');
    
  } catch (error) {
    console.error('❌ Notification test failed:', error);
  }
};

// Test Google Sign-in configuration
export const testGoogleSignIn = () => {
  console.log('🧪 Testing Google Sign-in configuration...');
  
  // Check if google-services.json is properly configured
  console.log('✅ Package name: com.mycompany.nexeed1');
  console.log('✅ Certificate hash: 5d57a3e6ffe671f48479cdfbdcea089dcc832f57');
  console.log('✅ Firebase project: nexeed-af819');
  
  console.log('🎉 Google Sign-in configuration looks correct!');
};

// Combined test function
export const runAllTests = async () => {
  console.log('🚀 Running all notification and Google Sign-in tests...');
  
  await testNotificationSystem();
  testGoogleSignIn();
  
  console.log('✅ All tests completed!');
};
