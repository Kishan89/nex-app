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
        // Count only non-chat notifications (like, comment, follow) that are unread
        const unreadCount = notificationsData.filter((notification: any) => {
          const type = notification.type?.toLowerCase() || '';
          const isNonChatNotification = type !== 'message' && type !== 'chat';
          const isUnread = !notification.read;
          return isNonChatNotification && isUnread;
        }).length;
        setUnreadNotificationCount(unreadCount);
      } else {
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      setUnreadNotificationCount(0);
    }
  }, [user?.id]);
  // Mark notifications as read (optimistic update)
  const markNotificationsAsRead = useCallback(() => {
    setUnreadNotificationCount(0);
  }, []);
  // Load initial notification count
  useEffect(() => {
    if (user?.id) {
      refreshNotificationCount();
    } else {
      setUnreadNotificationCount(0);
    }
  }, [user?.id, refreshNotificationCount]);
  // Refresh notification count periodically
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      refreshNotificationCount();
    }, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [user?.id, refreshNotificationCount]);
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
