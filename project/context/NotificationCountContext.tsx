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
  const [userId, setUserId] = useState<string | null>(null);
  
  // Safe auth access with error handling
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    // Auth context not available yet, this is normal during initialization
    user = null;
  }

  // Update userId when user changes
  useEffect(() => {
    setUserId(user?.id || null);
  }, [user?.id]);
  // Refresh notification count from server
  const refreshNotificationCount = useCallback(async () => {
    if (!userId) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const notificationsData = await apiService.getUserNotifications(userId, true); // Force refresh
      if (Array.isArray(notificationsData)) {
        // Count only like, comment, follow notifications that are unread (exclude message)
        const unreadCount = notificationsData.filter((notification: any) => {
          const type = notification.type?.toLowerCase() || '';
          const isAllowedNotification = ['like', 'comment', 'follow'].includes(type);
          const isUnread = !notification.read;
          return isAllowedNotification && isUnread;
        }).length;
        setUnreadNotificationCount(unreadCount);
      } else {
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error('Error refreshing notification count:', error);
      setUnreadNotificationCount(0);
    }
  }, [userId]);
  // Mark notifications as read (optimistic update + server sync)
  const markNotificationsAsRead = useCallback(async () => {
    // Optimistic update - immediately set to 0 for instant UI feedback
    setUnreadNotificationCount(0);
    
    // Don't refresh from server immediately to maintain optimistic update
    // The notifications screen will handle server sync
  }, []);
  // Load initial notification count
  useEffect(() => {
    if (userId) {
      refreshNotificationCount();
    } else {
      setUnreadNotificationCount(0);
    }
  }, [userId, refreshNotificationCount]);

  // Periodic refresh every 30 seconds to get new notifications
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      refreshNotificationCount();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [userId, refreshNotificationCount]);

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
