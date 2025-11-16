import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiService } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface NotificationBadgeProps {
  chatId?: string;
  style?: any;
}

/**
 * Shows unread notification count badge
 * Can be used for:
 * - Overall notification count (no chatId)
 * - Specific chat unread count (with chatId)
 */
export default function NotificationBadge({ chatId, style }: NotificationBadgeProps) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCount = async () => {
      try {
        if (chatId) {
          // Get unread count for specific chat
          const unread = await apiService.getUnreadMessages(chatId);
          setCount(unread?.data?.length || 0);
        } else {
          // Get overall notification count
          const notifications = await apiService.getUserNotifications(user.id);
          const unreadCount = notifications.filter((n: any) => !n.read).length;
          setCount(unreadCount);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, [user?.id, chatId]);

  if (count === 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
