import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  SafeAreaView, 
  StatusBar,
  FlatList,
  Platform 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiService } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotificationCount } from '../../context/NotificationCountContext';
import { notificationCache } from '@/store/notificationCache';
// Real-time notification service removed - notifications still work via API
// Simple notification interface to replace SimpleNotification
interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  postId?: string;
  userId?: string;
  read: boolean;
  createdAt: string;
}
import NotificationCard from '../../components/NotificationCard';
import { NotificationSkeleton } from '../../components/skeletons';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
const getNotificationIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'like': return Heart;
    case 'comment': return MessageCircle;
    case 'follow': return UserPlus;
    default: return Bell;
  }
};
export default function NotificationsScreen() {
  const { user } = useAuth();
  const { markNotificationsAsRead, refreshNotificationCount } = useNotificationCount();
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadNotifications = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      setError("Please log in to see your notifications.");
      return;
    }
    // Try to load from cache first for instant display
    if (!forceRefresh) {
      const cachedData = await notificationCache.getCachedNotifications();
      if (cachedData && cachedData.notifications.length > 0) {
        setNotifications(cachedData.notifications);
        setLoading(false);
        setRefreshing(false);
        // Load fresh data in background after showing cached content
        setTimeout(() => {
          loadNotifications(true); // Force refresh to get latest data
        }, 500);
        return;
      }
    }
    try {
      setError(null);
      setLoading(true);
      const notificationsData = await apiService.getUserNotifications(user.id, forceRefresh);
      if (Array.isArray(notificationsData)) {
        // Filter to show only like, comment, follow notifications (exclude chat/message)
        const filteredNotifications = notificationsData.filter((notification: SimpleNotification) => {
          const type = notification.type?.toLowerCase() || '';
          const isAllowed = ['like', 'comment', 'follow'].includes(type);
          return isAllowed;
        });
        setNotifications(filteredNotifications);
        // Cache the notifications for instant loading next time
        notificationCache.cacheNotifications(filteredNotifications);
      } else {
        setNotifications([]);
        }
    } catch (err) {
      setNotifications([]);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);
  // Real-time notifications removed - notifications still work via API refresh
  useEffect(() => {
    if (user?.id) {
      // Notifications will be updated when user refreshes or navigates to this screen
    }
  }, [user?.id]);
  useFocusEffect(
    useCallback(() => {
      // Always load fresh notifications when screen is focused
      loadNotifications(true);
      // Mark notifications as read when user visits this screen
      // This provides instant UI feedback and server sync
      (async () => {
        try {
          // First mark locally for instant UI feedback
          await markNotificationsAsRead();
          
          // Then mark on server in background
          if (user?.id) {
            try {
              const response = await apiService.markNotificationsAsRead(user.id);
              
              // Always refresh count after server marking, regardless of count
              // Force refresh the notification count to ensure sync
              setTimeout(() => {
                refreshNotificationCount();
              }, 500);
            } catch (error) {
              console.error('Error marking notifications as read on server:', error);
            }
          }
        } catch (error) {
          console.error('Error marking notifications as read:', error);
        }
      })();
    }, [loadNotifications, markNotificationsAsRead, user?.id, refreshNotificationCount])
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(true); // Force refresh on manual pull
  }, [loadNotifications]);
  const handleNotificationPress = useCallback((notification: SimpleNotification) => {
    // Handle notification navigation manually (real-time service removed)
    if (notification.postId) {
      router.push(`/post/${notification.postId}`);
    } else if (notification.userId) {
      router.push(`/profile/${notification.userId}`);
    }
  }, []);
  const renderNotification = useCallback(({ item }: { item: SimpleNotification }) => (
    <NotificationCard
      notification={item}
      onPress={handleNotificationPress}
    />
  ), [handleNotificationPress]);
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Bell size={48} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyText}>
        When someone likes or comments on your posts, you'll see it here
      </Text>
    </View>
  );
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadNotifications(true)}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={false} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <NotificationSkeleton />
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.backgroundTertiary}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : styles.listContainer}
          style={styles.flatList}
        />
      )}
    </SafeAreaView>
  );
}
// --- Dynamic Styles ---
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 45 : 15, // Same as other screens - thinner
    paddingBottom: 6, // Minimal bottom padding like other screens
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extrabold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  iconContainer: {
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: ComponentStyles.avatar.medium / 2,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    color: colors.text,
    fontWeight: FontWeights.semibold,
  },
  action: {
    color: colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  time: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginTop: Spacing.xs,
  },
  fullWidthSeparator: {
    height: 1,
    backgroundColor: colors.border,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: colors.textMuted,
    marginTop: Spacing.md,
    fontWeight: FontWeights.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: FontWeights.medium,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: Spacing.xl,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  listContainer: {
    paddingBottom: 100, // Add bottom padding for tab bar
  },
  flatList: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    color: colors.text,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    fontWeight: FontWeights.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
