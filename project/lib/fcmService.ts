// lib/fcmService.ts
import { getMessaging, getToken, onMessage, setBackgroundMessageHandler, getInitialNotification, onNotificationOpenedApp, onTokenRefresh, deleteToken, requestPermission } from '@react-native-firebase/messaging';
// Global interface declaration for TypeScript
declare global {
  var __currentChatId: string | null | undefined;
  var __isUserSendingMessage: string | null | undefined;
}
// Type-safe global access
const globalState = globalThis as typeof globalThis & {
  __currentChatId?: string | null;
  __isUserSendingMessage?: string | null;
};
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Alert, Linking, AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { router } from 'expo-router';
// Notification deduplication service removed - using clean FCM now
const FCM_TOKEN_KEY = 'fcm_token';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_requested';
export interface FCMNotificationData {
  postId?: string;
  userId?: string;
  chatId?: string;
  senderId?: string;
  type?: 'like' | 'comment' | 'message' | 'follow';
  title?: string;
  body?: string;
  username?: string;
  avatar?: string;
  action?: string;
}
class FCMService {
  private unsubscribeForeground?: () => void;
  private unsubscribeNotificationOpen?: () => void;
  private unsubscribeTokenRefresh?: () => void;
  private isInitialized = false;
  private pendingNavigationData: any = null;
  private isNavigating = false; // Prevent multiple navigation attempts
  private lastNavigationTime = 0; // Track last navigation time
  private navigationPromise: Promise<void> | null = null; // Single navigation promise
  /**
   * Initialize FCM service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      // Check if FCM is supported on this platform
      if (!this.isSupported()) {
        console.log('❌ FCM not supported on this platform');
        return;
      }
      console.log('🔔 Initializing FCM service...');
      
      // Check Google Play Services availability (Android only)
      if (Platform.OS === 'android') {
        console.log('📱 Checking Google Play Services...');
        const gpsAvailable = await this.checkGooglePlayServices();
        if (!gpsAvailable) {
          console.log('⚠️ Google Play Services not available, continuing...');
        } else {
          console.log('✅ Google Play Services available');
        }
      }
      // Request permissions first
      console.log('🔐 Requesting notification permissions...');
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('⚠️ Notification permissions denied');
        // Still initialize handlers for testing, but warn user
        Alert.alert(
          'Notifications Disabled',
          'Push notifications are disabled. You can enable them in Settings > Notifications.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ Notification permissions granted');
      }
      // Get and register FCM token with graceful error handling
      console.log('🎫 Registering FCM token...');
      try {
        await this.registerToken();
        console.log('✅ FCM token registration completed');
      } catch (tokenError) {
        console.log('❌ FCM token registration failed:', tokenError.message);
        // Don't throw - app should work without FCM
      }
      // Set up message handlers
      console.log('📬 Setting up message handlers...');
      this.setupMessageHandlers();
      console.log('✅ Message handlers configured');
      
      // Handle initial notification (app opened from killed state)
      console.log('🚀 Checking for initial notification...');
      await this.handleInitialNotification();
      
      this.isInitialized = true;
      console.log('🎉 FCM service initialization completed successfully');
      // Log final status
      const token = await this.getStoredToken();
      } catch (error) {
      console.log('❌ FCM service initialization failed:', error.message);
      // Don't throw error, just log it
      this.isInitialized = false;
    }
  }
  /**
   * Request notification permissions
   */
  private async requestPermission(): Promise<boolean> {
    try {
      console.log('🔐 Checking notification permission status...');
      // Check if we already requested permission
      const alreadyRequested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      const messaging = getMessaging();
      
      // In React Native Firebase v20.5.0, requestPermission returns a promise that resolves to void
      // We need to check permissions differently
      try {
        console.log('🔐 Requesting FCM permission...');
        await requestPermission(messaging);
        // If we get here, permissions were granted or already exist
        console.log('✅ FCM permission request completed');
        // Mark that we've requested permission
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
        return true;
      } catch (error) {
        console.log('❌ FCM permission request failed:', error);
        // Check if this is a permissions denied error
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = (error as any).code;
          if (errorCode === 'messaging/permission-denied' || errorCode === 'messaging/permission-default') {
            if (!alreadyRequested) {
              // Only show alert if this is the first time requesting
              Alert.alert(
                'Enable Notifications',
                'Get notified when someone likes or comments on your posts. You can change this in Settings anytime.',
                [
                  { text: 'Not Now', style: 'cancel' },
                  { text: 'Enable', onPress: () => Linking.openSettings() }
                ]
              );
            }
            await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
            return false;
          }
        }
        // For other errors, assume permissions are not granted
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
        return false;
      }
    } catch (error) {
      return false;
    }
  }
  /**
   * Get FCM token and register with backend
   */
  private async registerToken(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds
    const attemptTokenRegistration = async (): Promise<void> => {
      try {
        // Check if Google Play Services is available
        if (Platform.OS === 'android') {
          }
        const messaging = getMessaging();
        const fcmToken = await getToken(messaging);
        if (!fcmToken) {
          return;
        }
        // Check if this is the same token we already have
        const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
        if (storedToken === fcmToken) {
          return;
        }
        // Store token locally
        await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
        console.log('✅ FCM token obtained and stored locally');
        // Send token to backend
        await this.saveFCMTokenToBackend(fcmToken);
        } catch (error: any) {
        // Handle different types of Google Play Services errors
        const errorMessage = error?.message || '';
        const isServiceError = errorMessage.includes('SERVICE_NOT_AVAILABLE') || 
                              errorMessage.includes('NETWORK_ERROR') ||
                              errorMessage.includes('TIMEOUT') ||
                              errorMessage.includes('ExecutionException');
        if (isServiceError && retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            attemptTokenRegistration().catch(retryError => {
              });
          }, retryDelay);
        } else if (retryCount >= maxRetries) {
          // Don't show automatic update prompts - let user continue using the app
        } else {
          }
      }
    };
    // Start the registration attempt
    await attemptTokenRegistration();
  }
  /**
   * Save FCM token to backend with duplicate prevention
   */
  private isTokenRegistrationInProgress = false;
  private async saveFCMTokenToBackend(token: string): Promise<void> {
    // Prevent duplicate registration attempts
    if (this.isTokenRegistrationInProgress) {
      console.log('🔄 FCM token registration already in progress, skipping...');
      return;
    }

    try {
      this.isTokenRegistrationInProgress = true;

      if (!apiService.userId) {
        // Try to get user ID from storage
        try {
          const userData = await AsyncStorage.getItem('userData');
          const authData = await AsyncStorage.getItem('authData');
          if (userData) {
            const user = JSON.parse(userData);
            }
        } catch (storageError) {
          }
        return;
      }

      const platform = Platform.OS;
      console.log('📱 Registering FCM token with backend...');
      await apiService.saveFCMToken(token, platform);
      console.log('✅ FCM token registered successfully');
      
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.log('❌ FCM token registration error:', errorMessage);
      
      // Check if it's a unique constraint error (token already exists)
      if (errorMessage.includes('Unique constraint failed') || 
          errorMessage.includes('token') || 
          errorMessage.includes('P2002') ||
          errorMessage.includes('500')) {
        console.log('ℹ️ FCM token already exists in backend, skipping retry');
        return; // Token already exists, no need to retry
      }
      
      // Only retry once for non-constraint errors after a delay
      console.log('🔄 Retrying FCM token registration in 5 seconds...');
      setTimeout(async () => {
        try {
          await apiService.saveFCMToken(token, Platform.OS);
          console.log('✅ FCM token registered successfully on retry');
        } catch (retryError: any) {
          const retryErrorMessage = retryError?.message || String(retryError);
          if (retryErrorMessage.includes('Unique constraint failed') || 
              retryErrorMessage.includes('token') ||
              retryErrorMessage.includes('P2002')) {
            console.log('ℹ️ FCM token already exists, registration complete');
          } else {
            console.log('❌ FCM token registration failed on retry:', retryErrorMessage);
          }
        }
      }, 5000);
    } finally {
      // Reset the flag after a delay to allow future registrations
      setTimeout(() => {
        this.isTokenRegistrationInProgress = false;
      }, 10000); // 10 second cooldown
    }
  }
  /**
   * Set up FCM message handlers
   */
  private setupMessageHandlers(): void {
    const messaging = getMessaging();
    // Background message handler - handles notifications when app is killed/background
    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      // Log all notification data for debugging
      // Store navigation data for when app becomes active
      if (remoteMessage.data) {
        // Store for later navigation when app opens
        this.pendingNavigationData = remoteMessage.data;
        }
      // For chat notifications, we can also show a local notification if needed
      if (remoteMessage.data?.type === 'message' && remoteMessage.notification) {
        // The system will automatically show the push notification
        // We just need to ensure navigation data is stored
      }
      return Promise.resolve();
    });
    // Foreground message handler - only show in-app notifications
    this.unsubscribeForeground = onMessage(messaging, async (remoteMessage) => {
      // Only handle if app is truly in foreground
      if (AppState.currentState === 'active') {
        this.handleForegroundMessage(remoteMessage);
      }
      // If app is not active, let the system handle background notifications
    });
    // Notification opened app handler (from background)
    this.unsubscribeNotificationOpen = onNotificationOpenedApp(messaging, (remoteMessage) => {
      if (remoteMessage.data && !this.isNavigating && !this.navigationPromise) {
        // Execute navigation immediately without storing as pending
        this.handleNotificationPress(remoteMessage.data);
      } else if (this.isNavigating) {
        }
    });
    // Token refresh handler with duplicate prevention
    this.unsubscribeTokenRefresh = onTokenRefresh(messaging, async (fcmToken) => {
      try {
        console.log('🔄 FCM token refreshed, updating...');
        
        // Check if this is actually a different token
        const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
        if (storedToken === fcmToken) {
          console.log('ℹ️ FCM token refresh: same token, skipping update');
          return;
        }

        // Store the new token locally
        await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
        console.log('✅ New FCM token stored locally');
        
        // Register with backend (with built-in duplicate prevention)
        await this.saveFCMTokenToBackend(fcmToken);
      } catch (error) {
        if (__DEV__) console.error('❌ Error handling FCM token refresh:', error);
      }
    });
  }
  /**
   * Handle foreground messages with custom UI
   */
  private handleForegroundMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    if (!remoteMessage.notification) return;
    const { title, body } = remoteMessage.notification;
    const data = remoteMessage.data as FCMNotificationData;
    const appState = AppState.currentState;
    // Only show in-app notification when app is active
    if (appState === 'active') {
      // Skip chat messages since socket service handles them with avatars
      if (data.type === 'message') {
        // IMPORTANT: Don't show notification if user is in the current chat
        // The notification should only show in the banner when user is NOT in the chat
        if (data.chatId && this.getCurrentChatId() === data.chatId) {
          console.log('🔕 [FCM] Suppressing notification - user is in this chat:', data.chatId);
          return;
        }
        
        // Check if user is currently sending a message in this chat
        if (data.chatId && this.isUserSendingMessage(data.chatId)) {
          // Clear the sending flag after a short delay
          setTimeout(() => {
            this.setUserIsSendingMessage(null);
          }, 1000);
          return;
        }
        return;
      }
      // Show other notification types (like, comment, follow)
      // Use username and avatar directly from notification data
      const username = data.username || title || 'Someone';
      const avatar = data.avatar || '';
      // Construct display text based on notification type
      let displayTitle = username;
      let displayBody = body || '';
      if (data.type === 'like') {
        displayBody = 'liked your post';
      } else if (data.type === 'comment') {
        displayBody = 'commented on your post';
      } else if (data.type === 'follow') {
        displayBody = 'started following you';
      }
      // Emit event for in-app notification banner (Instagram-style)
      DeviceEventEmitter.emit('showNotificationBanner', {
        title: displayTitle,
        body: displayBody,
        data: {
          ...data,
          avatar,
          username,
        },
        onPress: () => this.handleNotificationPress(data)
      });
    }
    // If app is not active, let the system handle the push notification
  }
  /**
   * Handle notification press - navigate to appropriate screen with proper stack management
   */
  private handleNotificationPress(data: any): Promise<void> {
    if (!data) {
      return Promise.resolve();
    }
    // Prevent multiple navigation attempts with stricter checks
    const now = Date.now();
    if (this.isNavigating || (now - this.lastNavigationTime < 3000)) {
      return Promise.resolve();
    }
    // If navigation promise exists, don't create new one
    if (this.navigationPromise) {
      return this.navigationPromise;
    }
    // Create and store the navigation promise
    this.navigationPromise = this.performNavigation(data);
    return this.navigationPromise;
  }
  /**
   * Perform the actual navigation
   */
  private async performNavigation(data: any): Promise<void> {
    this.isNavigating = true;
    this.lastNavigationTime = Date.now();
    // Clear pending navigation data immediately to prevent re-execution
    this.pendingNavigationData = null;
    const { postId, userId, type, chatId, senderId } = data as FCMNotificationData;
    try {
      // 🚀 PERFORMANCE: Removed delay - navigate immediately for instant response
      // Check current route to prevent duplicate navigation
      // Note: We'll use a simpler approach to prevent duplicate navigation
      // Handle different notification types with smart navigation
      if (type === 'message' && (chatId || senderId)) {
        const targetChatId = chatId || senderId;
        
        // 🚀 PERFORMANCE: Preload chat data for instant opening
        const { ultraFastChatCache } = require('./ChatCache');
        
        // Try to get existing cache or create basic data
        const cachedData = ultraFastChatCache.getInstantChatData(targetChatId);
        const chatData = cachedData || {
          id: targetChatId,
          name: data.username || 'Chat',
          avatar: data.avatar || '',
          username: data.username || 'Chat',
        };
        
        // Use replace to prevent stacking multiple screens with cached params
        router.replace({
          pathname: `/chat/${targetChatId}`,
          params: {
            cachedName: chatData.name,
            cachedAvatar: chatData.avatar,
            cachedIsOnline: 'false',
            cachedUserId: senderId || 'unknown',
            cachedIsGroup: 'false',
            _prefetched: 'true',
          }
        });
      } else if ((type === 'like' || type === 'comment') && postId) {
        // Navigate to comments screen for both like and comment notifications
        // Use replace to prevent stacking multiple screens
        router.replace({
          pathname: `/comments/${postId}`,
          params: { fromNotification: 'true' }
        });
      } else if (type === 'follow' && (userId || senderId)) {
        const targetUserId = userId || senderId;
        // Use replace to prevent stacking multiple screens
        router.replace({
          pathname: `/profile/${targetUserId}`,
          params: { fromNotification: 'true' }
        });
      } else {
        router.replace('/(tabs)/notifications');
      }
      } catch (error) {
      // Fallback to home screen
      router.replace('/(tabs)');
    } finally {
      // Reset navigation flags immediately after completion
      this.isNavigating = false;
      this.navigationPromise = null;
      // Clear any pending navigation data to prevent re-execution
      this.pendingNavigationData = null;
    }
  }
  /**
   * Handle initial notification when app is opened from killed state
   */
  private async handleInitialNotification(): Promise<void> {
    try {
      const messaging = getMessaging();
      const remoteMessage = await getInitialNotification(messaging);
      if (remoteMessage && remoteMessage.data && !this.isNavigating) {
        // Store the navigation data for later execution
        this.pendingNavigationData = remoteMessage.data;
        // Try to navigate after a delay, but only once
        setTimeout(() => {
          if (this.pendingNavigationData && !this.isNavigating && !this.navigationPromise) {
            const navData = this.pendingNavigationData;
            this.pendingNavigationData = null; // Clear immediately to prevent re-execution
            this.handleNotificationPress(navData);
          } else {
            }
        }, 2000); // Reduced delay for cold starts
      } else {
        }
    } catch (error) {
      }
  }
  /**
   * Remove FCM token (on logout)
   */
  async removeToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (!token) return;
      // Remove from backend
      await apiService.removeFCMToken(token);
      // Remove from local storage
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      } catch (error) {
      }
  }
  /**
   * Get stored FCM token
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch (error) {
      return null;
    }
  }
  /**
   * Check if FCM is supported
   */
  isSupported(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }
  /**
   * Check Google Play Services availability (Android only)
   */
  async checkGooglePlayServices(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need Google Play Services
    }
    try {
      const messaging = getMessaging();
      // Try to get a token to test Google Play Services
      const token = await getToken(messaging);
      return !!token;
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('SERVICE_NOT_AVAILABLE')) {
        return false;
      }
      return false;
    }
  }
  /**
   * Show Google Play Services update dialog
   */
  showGooglePlayServicesDialog(): void {
    if (Platform.OS !== 'android') return;
    Alert.alert(
      'Update Required',
      'Google Play Services needs to be updated for push notifications to work properly.',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Update Now', 
          onPress: () => {
            Linking.openURL('market://details?id=com.google.android.gms').catch(() => {
              Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.gms');
            });
          }
        }
      ]
    );
  }
  /**
   * Check and execute pending navigation from killed state
   */
  checkPendingNavigation(): void {
    if (this.pendingNavigationData && !this.isNavigating && !this.navigationPromise) {
      setTimeout(() => {
        if (this.pendingNavigationData && !this.isNavigating && !this.navigationPromise) {
          const navData = this.pendingNavigationData;
          this.pendingNavigationData = null; // Clear immediately
          this.handleNotificationPress(navData);
        }
      }, 300);
    }
  }
  /**
   * Execute pending navigation immediately (for app state changes)
   */
  executePendingNavigation(): void {
    if (this.pendingNavigationData && !this.isNavigating && !this.navigationPromise) {
      const navData = this.pendingNavigationData;
      this.pendingNavigationData = null; // Clear immediately to prevent re-execution
      this.handleNotificationPress(navData);
    } else if (this.isNavigating || this.navigationPromise) {
      }
  }
  /**
   * Public method to test notification press handling
   */
  testNotificationPress(data: any): void {
    this.handleNotificationPress(data);
  }
  /**
   * Cleanup FCM service
   */
  cleanup(): void {
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
    }
    if (this.unsubscribeNotificationOpen) {
      this.unsubscribeNotificationOpen();
    }
    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
    }
    this.isInitialized = false;
    }
  /**
   * Refresh token manually
   */
  async refreshToken(): Promise<void> {
    try {
      const messaging = getMessaging();
      await deleteToken(messaging);
      // Clear stored token to force fresh registration
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      await this.registerToken();
      console.log('✅ FCM token refreshed successfully');
    } catch (error) {
      if (__DEV__) console.error('❌ Error refreshing FCM token:', error);
    }
  }
  /**
   * Set current chat ID when user enters a chat
   */
  setCurrentChatId(chatId: string | null): void {
    // This can be used to track which chat the user is currently in
    globalState.__currentChatId = chatId;
  }
  /**
   * Get current chat ID
   */
  getCurrentChatId(): string | null {
    return globalState.__currentChatId || null;
  }
  /**
   * Check if user is sending a message (to suppress notifications)
   */
  private isUserSendingMessage(chatId: string): boolean {
    // This will be set by ChatScreen when user is sending a message
    return globalState.__isUserSendingMessage === chatId;
  }
  /**
   * Mark that user is sending a message (to suppress notifications)
   */
  setUserIsSendingMessage(chatId: string | null): void {
    globalState.__isUserSendingMessage = chatId;
  }
  /**
   * Debug function to test if notifications are working
   */
  async debugNotificationSystem(): Promise<void> {
    try {
      // Check FCM token
      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (token) {
        }
      // Check permissions
      try {
        await requestPermission(messaging);
        } catch (error) {
        }
      // Check if service is initialized
      // Check for pending navigation
      // Check stored token
      const storedToken = await this.getStoredToken();
      // Test notification press handler
      this.handleNotificationPress({
        type: 'message',
        chatId: '123',
        senderId: 'test-user',
        username: 'test_user'
      });
      // Test in-app notification banner for chat
      DeviceEventEmitter.emit('showNotificationBanner', {
        title: '🧪 Test Chat Notification',
        body: 'This is a test chat message notification',
        data: { 
          type: 'message',
          chatId: '123',
          senderId: 'test-user',
          username: 'test_user',
          avatar: 'https://via.placeholder.com/50'
        },
        onPress: () => {
          console.log('🧪 Test notification pressed');
        }
      });
      
      // Check if backend has the token
      const currentToken = await this.getStoredToken();
      if (apiService.userId && currentToken) {
        try {
          await this.saveFCMTokenToBackend(currentToken);
        } catch (error) {
          console.error('Error saving token to backend:', error);
        }
      }
    } catch (error) {
      console.error('Error in test notification:', error);
    }
  }

  /**
   * Simple test function to verify notifications work
   */
  async testNotifications(): Promise<void> {
    console.log('🧪 Testing notification system...');

    try {
      // Test 1: Check if FCM is available
      if (!this.isSupported()) {
        console.log('❌ FCM not supported on this platform');
        return;
      }

      // Test 2: Try to get FCM token (this tests Google Play Services)
      const messaging = getMessaging();
      const token = await getToken(messaging);
      console.log('🧪 FCM Token test:', token ? 'SUCCESS' : 'FAILED');

      // Test 3: Send test in-app notification
      console.log('🧪 Sending test in-app notification...');
      DeviceEventEmitter.emit('showNotificationBanner', {
        title: '🧪 Test Notification',
        body: 'FCM service is working! This is a test notification.',
        data: {
          type: 'test',
          testId: 'fcm-test-' + Date.now()
        },
        onPress: () => {
          console.log('✅ Test notification was pressed!');
        }
      });

      // Test 4: Test different notification types
      setTimeout(() => {
        DeviceEventEmitter.emit('showNotificationBanner', {
          title: 'Test User',
          body: 'liked your post',
          data: {
            type: 'like',
            postId: 'test-post-123',
            username: 'test_user'
          },
          onPress: () => console.log('✅ Like notification test pressed')
        });
      }, 2000);

      setTimeout(() => {
        DeviceEventEmitter.emit('showNotificationBanner', {
          title: 'Test User',
          body: 'sent you a message',
          data: {
            type: 'message',
            chatId: 'test-chat-456',
            username: 'test_user'
          },
          onPress: () => console.log('✅ Message notification test pressed')
        });
      }, 4000);

      console.log('✅ All notification tests sent! Check your screen.');

    } catch (error) {
      console.log('❌ Notification test failed:', error);
    }
  }
}
// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;