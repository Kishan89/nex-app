import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api';
import { useAuth } from './AuthContext';
import { useFocusEffect } from '@react-navigation/native';
interface NotificationCountContextType {
  unreadNotificationCount: number;
  refreshNotificationCount: () => Promise<void>;
  markNotificationsAsRead: () => void;
}
const NotificationCountContext = createContext<NotificationCountContextType | undefined>(undefined);
export const useNotificationCount = () => {
  const context = useContext(NotificationCountContext);
  if (!context) {
    throw new Error('useNotificationCount must be used within a NotificationCountProvider');
  }
  return context;
};
export const NotificationCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const { user } = useAuth();
  // Refresh notification count from server
  const refreshNotificationCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const notificationsData = await apiService.getUserNotifications(user.id);
      if (Array.isArray(notificationsData)) {
        // Count only like, comment, follow notifications that are unread (exclude chat/message)
        const unreadCount = notificationsData.filter((notification: any) => {
          const type = notification.type?.toLowerCase() || '';
          const isAllowedNotification = ['like', 'comment', 'follow'].includes(type);
          const isUnread = !notification.read;
          return isAllowedNotification && isUnread;
        }).length;
        setUnreadNotificationCount(unreadCount);
        console.log(`📊 Notification count updated: ${unreadCount} unread notifications`);
      } else {
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      setUnreadNotificationCount(0);
    }
  }, [user?.id]);
  // Mark notifications as read (optimistic update + server sync)
  const markNotificationsAsRead = useCallback(async () => {
    // Optimistic update - immediately set to 0 for instant UI feedback
    setUnreadNotificationCount(0);
    
    // Then refresh from server to ensure accuracy
    try {
      await refreshNotificationCount();
    } catch (error) {
      console.error('Error refreshing notification count after marking as read:', error);
    }
  }, [refreshNotificationCount]);
  // Load initial notification count
  useEffect(() => {
    if (user?.id) {
      refreshNotificationCount();
    } else {
      setUnreadNotificationCount(0);
    }
  }, [user?.id, refreshNotificationCount]);
  // Refresh notification count periodically (only when count > 0)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      // Only refresh if there are unread notifications to avoid unnecessary API calls
      if (unreadNotificationCount > 0) {
        refreshNotificationCount();
      }
    }, 30000); // Refresh every 30 seconds when there are unread notifications
    return () => clearInterval(interval);
  }, [user?.id, refreshNotificationCount, unreadNotificationCount]);
  const value: NotificationCountContextType = {
    unreadNotificationCount,
    refreshNotificationCount,
    markNotificationsAsRead,
  };
  return (
    <NotificationCountContext.Provider value={value}>
      {children}
    </NotificationCountContext.Provider>
  );
};
