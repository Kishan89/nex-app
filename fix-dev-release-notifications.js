// Fix for Development vs Release and Notification Issues
const baseUrl = 'https://nex-app-production.up.railway.app';

async function testNotificationSystem() {
  console.log('🔔 Testing Notification System...\n');
  
  // Test 1: Check FCM endpoints
  console.log('1️⃣ Testing FCM Token Registration...');
  try {
    const response = await fetch(`${baseUrl}/api/fcm/token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        token: 'test-fcm-token',
        platform: 'android'
      })
    });
    
    const data = await response.json();
    console.log(`FCM Token endpoint: ${response.status} - ${data.error || data.message}`);
  } catch (error) {
    console.log('❌ FCM Token endpoint error:', error.message);
  }
  
  console.log('\n2️⃣ Testing Push Token Registration...');
  try {
    const response = await fetch(`${baseUrl}/api/push-tokens`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        token: 'test-push-token'
      })
    });
    
    const data = await response.json();
    console.log(`Push Token endpoint: ${response.status} - ${data.error || data.message}`);
  } catch (error) {
    console.log('❌ Push Token endpoint error:', error.message);
  }
  
  console.log('\n3️⃣ Testing Socket.IO Connection...');
  try {
    const response = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`);
    console.log(`Socket.IO endpoint: ${response.status} - ${response.ok ? 'Working' : 'Failed'}`);
  } catch (error) {
    console.log('❌ Socket.IO endpoint error:', error.message);
  }
  
  console.log('\n📋 Recommendations:');
  console.log('1. For Development Issues:');
  console.log('   - Clear app cache and restart');
  console.log('   - Check if __DEV__ flag is properly set');
  console.log('   - Ensure API_URL environment variable is consistent');
  
  console.log('\n2. For Notification Issues:');
  console.log('   - Check Firebase configuration (google-services.json)');
  console.log('   - Verify FCM permissions are granted');
  console.log('   - Test on physical device (not emulator)');
  console.log('   - Check if app is in background when testing push notifications');
  
  console.log('\n3. For Release vs Development:');
  console.log('   - Use same Railway URL for both environments');
  console.log('   - Check build configuration differences');
  console.log('   - Verify environment variables in release build');
}

testNotificationSystem().catch(console.error);
