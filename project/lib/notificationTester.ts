// Notification Tester - Simple test for in-app notifications
import { DeviceEventEmitter } from 'react-native';

export class NotificationTester {
  
  /**
   * Test in-app notification banner
   */
  static testInAppNotification() {
    console.log('🧪 Testing in-app notification...');
    
    // Emit a test notification banner
    DeviceEventEmitter.emit('showNotificationBanner', {
      title: '🧪 Test Notification',
      body: 'This is a test in-app notification to verify the system is working',
      data: {
        type: 'test',
        testId: 'notification-test-' + Date.now(),
      },
      onPress: () => {
        console.log('🧪 Test notification was pressed!');
      }
    });
    
    console.log('✅ Test notification emitted');
  }
  
  /**
   * Test chat notification
   */
  static testChatNotification() {
    console.log('🧪 Testing chat notification...');
    
    DeviceEventEmitter.emit('showNotificationBanner', {
      title: 'Test User',
      body: 'sent you a test message',
      data: {
        type: 'message',
        chatId: 'test-chat-123',
        senderId: 'test-user-456',
        username: 'test_user',
        avatar: 'https://via.placeholder.com/50'
      },
      onPress: () => {
        console.log('🧪 Test chat notification was pressed!');
      }
    });
    
    console.log('✅ Test chat notification emitted');
  }
  
  /**
   * Test like notification
   */
  static testLikeNotification() {
    console.log('🧪 Testing like notification...');
    
    DeviceEventEmitter.emit('showNotificationBanner', {
      title: 'Test User',
      body: 'liked your post',
      data: {
        type: 'like',
        postId: 'test-post-789',
        userId: 'test-user-456',
        username: 'test_user',
        avatar: 'https://via.placeholder.com/50'
      },
      onPress: () => {
        console.log('🧪 Test like notification was pressed!');
      }
    });
    
    console.log('✅ Test like notification emitted');
  }
  
  /**
   * Run all notification tests
   */
  static runAllTests() {
    console.log('🧪 Running all notification tests...\n');
    
    // Test 1: Basic in-app notification
    setTimeout(() => {
      this.testInAppNotification();
    }, 1000);
    
    // Test 2: Chat notification
    setTimeout(() => {
      this.testChatNotification();
    }, 3000);
    
    // Test 3: Like notification
    setTimeout(() => {
      this.testLikeNotification();
    }, 5000);
    
    console.log('🧪 All tests scheduled. Watch for notifications in the next 10 seconds...');
  }
}

// Export for easy access
export default NotificationTester;
