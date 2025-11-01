import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter } from 'react-native';
/**
 * Simple notification permission request after login
 * Shows beautiful dialog directly without complex async logic
 */
export const requestNotificationPermissionOnLogin = (): void => {
  // Check current permission status first
  Notifications.getPermissionsAsync().then(({ status }) => {
    if (status === 'granted') {
      return;
    }
    // Always show dialog for login - simple approach
    DeviceEventEmitter.emit('show_notification_permission_dialog');
  }).catch(error => {
    // Still show dialog even if check fails
    DeviceEventEmitter.emit('show_notification_permission_dialog');
  });
};
/**
 * Check current notification permission status
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
};
