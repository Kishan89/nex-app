import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import InAppNotificationBanner from './InAppNotificationBanner';
// Singleton pattern to ensure only one instance exists
let notificationManagerInstance: React.ComponentType | null = null;
/**
 * NotificationManager - Global notification overlay component
 * This component should be placed at the root level of your app
 * to ensure notifications appear on top of all screens
 * Uses singleton pattern to prevent duplicate banners
 */
export default function NotificationManager() {
  const instanceRef = useRef<boolean>(false);
  useEffect(() => {
    if (notificationManagerInstance && notificationManagerInstance !== NotificationManager) {
      return;
    }
    if (!instanceRef.current) {
      instanceRef.current = true;
      notificationManagerInstance = NotificationManager;
      }
    return () => {
      if (instanceRef.current) {
        instanceRef.current = false;
        notificationManagerInstance = null;
        }
    };
  }, []);
  // Don't render if another instance already exists
  if (notificationManagerInstance && notificationManagerInstance !== NotificationManager) {
    return null;
  }
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <InAppNotificationBanner />
    </View>
  );
}
