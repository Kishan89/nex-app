import { OneSignal } from 'react-native-onesignal';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class OneSignalService {
  private initialized = false;

  /**
   * Initialize OneSignal with app configuration
   */
  async initialize() {
    if (this.initialized) {
      console.log('OneSignal already initialized');
      return;
    }

    try {
      const oneSignalAppId = Constants.expoConfig?.extra?.oneSignalAppId;

      if (!oneSignalAppId || oneSignalAppId === 'YOUR_ONESIGNAL_APP_ID') {
        console.warn('OneSignal App ID not configured. Please add it to app.json');
        return;
      }

      // Initialize OneSignal
      OneSignal.initialize(oneSignalAppId);

      // Request notification permissions (iOS)
      if (Platform.OS === 'ios') {
        const permission = await OneSignal.Notifications.requestPermission(true);
        console.log('OneSignal iOS permission:', permission);
      }

      // Enable verbose logging for debugging
      OneSignal.Debug.setLogLevel(6);

      // Set up notification event handlers
      this.setupEventHandlers();

      this.initialized = true;
      console.log('OneSignal initialized successfully');
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  }

  /**
   * Set up event handlers for notifications
   */
  private setupEventHandlers() {
    // Handle notification opened
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('OneSignal notification clicked:', event);
      // Handle navigation based on notification data
      const data = event.notification.additionalData;
      if (data) {
        this.handleNotificationAction(data);
      }
    });

    // Handle notification received while app is in foreground
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('OneSignal notification received in foreground:', event);
      // You can prevent the notification from displaying by calling:
      // event.preventDefault();
      // Or modify it before displaying
    });
  }

  /**
   * Handle notification action/navigation
   */
  private handleNotificationAction(data: any) {
    console.log('Handling notification action with data:', data);
    // Add your navigation logic here
    // Example: navigate to specific screen based on data.type
    // if (data.type === 'post') {
    //   router.push(`/post/${data.postId}`);
    // }
  }

  /**
   * Set external user ID (your app's user ID)
   * Call this after user logs in
   */
  async setExternalUserId(userId: string) {
    try {
      await OneSignal.login(userId);
      console.log('OneSignal external user ID set:', userId);
    } catch (error) {
      console.error('Error setting OneSignal external user ID:', error);
    }
  }

  /**
   * Remove external user ID
   * Call this when user logs out
   */
  async removeExternalUserId() {
    try {
      await OneSignal.logout();
      console.log('OneSignal external user ID removed');
    } catch (error) {
      console.error('Error removing OneSignal external user ID:', error);
    }
  }

  /**
   * Get the OneSignal player ID (device token)
   */
  async getPlayerId(): Promise<string | null> {
    try {
      const deviceState = await OneSignal.User.pushSubscription.getIdAsync();
      return deviceState;
    } catch (error) {
      console.error('Error getting OneSignal player ID:', error);
      return null;
    }
  }

  /**
   * Add tags to user for segmentation
   */
  async addTags(tags: Record<string, string>) {
    try {
      OneSignal.User.addTags(tags);
      console.log('OneSignal tags added:', tags);
    } catch (error) {
      console.error('Error adding OneSignal tags:', error);
    }
  }

  /**
   * Remove tags from user
   */
  async removeTags(tagKeys: string[]) {
    try {
      OneSignal.User.removeTags(tagKeys);
      console.log('OneSignal tags removed:', tagKeys);
    } catch (error) {
      console.error('Error removing OneSignal tags:', error);
    }
  }

  /**
   * Check if user has granted notification permission
   */
  async hasPermission(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      return permission;
    } catch (error) {
      console.error('Error checking OneSignal permission:', error);
      return false;
    }
  }

  /**
   * Prompt user for notification permission
   */
  async promptForPushNotifications(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.requestPermission(true);
      return permission;
    } catch (error) {
      console.error('Error requesting OneSignal permission:', error);
      return false;
    }
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalService();
