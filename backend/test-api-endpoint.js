const fetch = require('node-fetch');

async function testNotificationAPI() {
  try {
    console.log('🧪 Testing notification API endpoint...');
    
    const response = await fetch('http://localhost:3000/notifications/cmgvqehym0000im2by5nursh7', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const notifications = await response.json();
    
    console.log('📡 API Response:');
    console.log(`Total notifications: ${notifications.length}`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.type} (${notif.read ? 'read' : 'unread'}) - ${notif.message}`);
    });
    
    // Check if our test notification is there
    const testNotification = notifications.find(n => n.message.includes('Test notification'));
    if (testNotification) {
      console.log('✅ Test notification found in API response:', testNotification.read ? 'read' : 'unread');
    } else {
      console.log('❌ Test notification not found in API response');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testNotificationAPI();
