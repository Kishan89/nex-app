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
      <SkeletonAvatar size={40} />
      <View style={styles.notificationContent}>
        <SkeletonText width="85%" height={16} style={styles.notificationText} />
        <SkeletonText width="60%" height={14} style={styles.notificationText} />
        <SkeletonText width={80} height={12} />
      </View>
      <SkeletonBase width={8} height={8} borderRadius={4} />
    </View>
  );
};
export const NotificationSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonText width={120} height={24} />
        <SkeletonBase width={40} height={40} borderRadius={20} />
      </View>
      {/* Notification Items - Limited to top 3 */}
      <View style={styles.notificationsList}>
        {[1, 2, 3].map((index) => (
          <NotificationItemSkeleton key={index} />
        ))}
        {/* Loading indicator for remaining content */}
        <View style={styles.loadingIndicator}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  notificationText: {
    marginBottom: 4,
  },
  loadingIndicator: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  dot1: {
    opacity: 0.8,
  },
  dot2: {
    opacity: 0.5,
  },
  dot3: {
    opacity: 0.3,
  },
});
