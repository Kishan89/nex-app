import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api';
import { useAuth } from './AuthContext';
import { useFocusEffect } from '@react-navigation/native';
interface NotificationCountContextType {
  unreadNotificationCount: number;
  refreshNotificationCount: () => Promise<void>;
  markNotificationsAsRead: () => void;
  incrementNotificationCount: () => void;
  decrementNotificationCount: () => void;
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
        // Count only like, comment, follow notifications that are unread (exclude message)
        const unreadCount = notificationsData.filter((notification: any) => {
          const type = notification.type?.toLowerCase() || '';
          const isAllowedNotification = ['like', 'comment', 'follow'].includes(type);
          const isUnread = !notification.read;
          console.log(`🔍 Notification: ${type} - ${isUnread ? 'unread' : 'read'} - ${isAllowedNotification ? 'allowed' : 'excluded'}`);
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
    
    // Don't refresh from server immediately to maintain optimistic update
    // Server will be updated by the notifications screen
    console.log('✅ Notifications marked as read (optimistic update)');
    
    // Schedule a delayed refresh to ensure server sync
    setTimeout(() => {
      refreshNotificationCount();
    }, 2000); // Refresh after 2 seconds to allow server processing
  }, [refreshNotificationCount]);
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
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id, refreshNotificationCount]);

  // Add method to increment count when new notification arrives
  const incrementNotificationCount = useCallback(() => {
    setUnreadNotificationCount(prev => prev + 1);
  }, []);

  // Add method to decrement count when notification is read
  const decrementNotificationCount = useCallback(() => {
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
  }, []);
  const value: NotificationCountContextType = {
    unreadNotificationCount,
    refreshNotificationCount,
    markNotificationsAsRead,
    incrementNotificationCount,
    decrementNotificationCount,
  };
  return (
    <NotificationCountContext.Provider value={value}>
      {children}
    </NotificationCountContext.Provider>
  );
};
