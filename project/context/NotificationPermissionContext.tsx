import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter } from 'react-native';
import { NotificationPermissionDialog } from '@/components/notifications/NotificationPermissionDialog';
interface NotificationPermissionContextType {
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  showPermissionDialog: () => Promise<boolean>;
}
const NotificationPermissionContext = createContext<NotificationPermissionContextType | undefined>(undefined);
interface NotificationPermissionProviderProps {
  children: ReactNode;
}
export const NotificationPermissionProvider = ({ children }: NotificationPermissionProviderProps) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [permissionResolver, setPermissionResolver] = useState<((granted: boolean) => void) | null>(null);
  // Listen for show dialog events from the service
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('show_notification_permission_dialog', () => {
      setDialogVisible(true);
    });
    return () => {
      subscription.remove();
    };
  }, []);
  const requestPermission = async (): Promise<boolean> => {
    try {
      // Request permission using expo-notifications (shows system dialog)
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      return granted;
    } catch (error) {
      return false;
    }
  };
  const checkPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  };
  const showPermissionDialog = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setPermissionResolver(() => resolve);
      setDialogVisible(true);
    });
  };
  const handleAllow = async () => {
    setDialogVisible(false);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      if (granted) {
        // Register FCM token after permission granted
        DeviceEventEmitter.emit('notification_permission_granted');
      }
      // Emit result back to service
      DeviceEventEmitter.emit('notification_permission_result', granted);
      if (permissionResolver) {
        permissionResolver(granted);
        setPermissionResolver(null);
      }
    } catch (error) {
      // Emit failure result back to service
      DeviceEventEmitter.emit('notification_permission_result', false);
      if (permissionResolver) {
        permissionResolver(false);
        setPermissionResolver(null);
      }
    }
  };
  const handleDeny = () => {
    setDialogVisible(false);
    // Emit denial result back to service
    DeviceEventEmitter.emit('notification_permission_result', false);
    if (permissionResolver) {
      permissionResolver(false);
      setPermissionResolver(null);
    }
  };
  return (
    <NotificationPermissionContext.Provider value={{ requestPermission, checkPermission, showPermissionDialog }}>
      {children}
      <NotificationPermissionDialog
        visible={dialogVisible}
        onAllow={handleAllow}
        onDeny={handleDeny}
      />
    </NotificationPermissionContext.Provider>
  );
};
export const useNotificationPermission = (): NotificationPermissionContextType => {
  const context = useContext(NotificationPermissionContext);
  if (!context) {
    throw new Error('useNotificationPermission must be used within a NotificationPermissionProvider');
  }
  return context;
};
