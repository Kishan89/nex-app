// Simple notification test that you can run in your app
// Add this to any screen to test notifications

import { NotificationTester } from './lib/notificationTester';

// Test function you can call from anywhere in your app
export const testNotifications = () => {
  console.log('🧪 Starting notification tests...');
  
  // Test 1: Simple in-app notification
  setTimeout(() => {
    console.log('🧪 Testing basic notification...');
    NotificationTester.testInAppNotification();
  }, 1000);
  
  // Test 2: Chat notification
  setTimeout(() => {
    console.log('🧪 Testing chat notification...');
    NotificationTester.testChatNotification();
  }, 3000);
  
  // Test 3: Like notification
  setTimeout(() => {
    console.log('🧪 Testing like notification...');
    NotificationTester.testLikeNotification();
  }, 5000);
  
  console.log('🧪 Notification tests scheduled. Watch your screen for banners!');
};

// You can also test individual types:
export const testChatNotification = () => NotificationTester.testChatNotification();
export const testLikeNotification = () => NotificationTester.testLikeNotification();
export const testBasicNotification = () => NotificationTester.testInAppNotification();

// Export everything
export default {
  testNotifications,
  testChatNotification,
  testLikeNotification,
  testBasicNotification,
  runAllTests: () => NotificationTester.runAllTests()
};
