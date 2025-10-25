import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';
interface NotificationItemSkeletonProps {
  style?: any;
}
export const NotificationItemSkeleton: React.FC<NotificationItemSkeletonProps> = ({ style }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.notificationItem, style]}>
      {/* Left - Avatar with icon badge */}
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <SkeletonAvatar size={40} />
          {/* Icon badge overlay */}
          <SkeletonBase width={16} height={16} borderRadius={8} style={styles.iconBadge} />
        </View>
      </View>
      
      {/* Center - Content */}
      <View style={styles.notificationContent}>
        <SkeletonText width="90%" height={14} style={styles.messageLine} />
        <SkeletonText width="70%" height={14} style={styles.messageLine} />
        {/* Post preview (optional, 50% chance) */}
        {Math.random() > 0.5 && (
          <SkeletonText width="75%" height={12} style={styles.postPreview} />
        )}
        <SkeletonText width={60} height={11} style={styles.timestamp} />
      </View>
      
      {/* Right - Post image or unread dot */}
      {Math.random() > 0.6 ? (
        <SkeletonBase width={38} height={38} borderRadius={6} style={styles.postImage} />
      ) : (
        <SkeletonBase width={8} height={8} borderRadius={4} style={styles.unreadDot} />
      )}
    </View>
  );
};
export const NotificationSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Notification Items - Show 5-6 notifications */}
      <View style={styles.notificationsList}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <NotificationItemSkeleton key={index} />
        ))}
      </View>
    </View>
  );
};
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  messageLine: {
    marginBottom: 4,
  },
  postPreview: {
    marginBottom: 4,
    opacity: 0.7,
  },
  timestamp: {
    opacity: 0.6,
  },
  postImage: {
    alignSelf: 'center',
  },
  unreadDot: {
    alignSelf: 'center',
  },
});
