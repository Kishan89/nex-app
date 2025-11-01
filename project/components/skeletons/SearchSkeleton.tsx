import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';
interface UserSearchSkeletonProps {
  style?: any;
}
export const UserSearchSkeleton: React.FC<UserSearchSkeletonProps> = ({ style }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.userItem, style]}>
      <SkeletonAvatar size={50} />
      <View style={styles.userInfo}>
        <SkeletonText width={120} height={16} style={styles.username} />
        <SkeletonText width={180} height={14} />
      </View>
      <SkeletonButton width={80} height={32} />
    </View>
  );
};
export const SearchSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBase width={40} height={40} borderRadius={20} />
        <SkeletonText width={80} height={20} />
        <View style={{ width: 40 }} />
      </View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SkeletonBase width="100%" height={45} borderRadius={22} />
      </View>
      {/* Recent Searches Header */}
      <View style={styles.sectionHeader}>
        <SkeletonText width={120} height={18} />
      </View>
      {/* User Results - Limited to top 3 */}
      <View style={styles.usersList}>
        {[1, 2, 3].map((index) => (
          <UserSearchSkeleton key={index} />
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  username: {
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
