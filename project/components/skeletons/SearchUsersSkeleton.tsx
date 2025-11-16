import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

interface SearchUserItemSkeletonProps {
  style?: any;
}

export const SearchUserItemSkeleton: React.FC<SearchUserItemSkeletonProps> = ({ style }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.userItem, style]}>
      {/* Avatar */}
      <SkeletonAvatar size={50} />
      
      {/* User Info */}
      <View style={styles.userInfo}>
        <SkeletonText width={120} height={16} style={styles.username} />
        <SkeletonText width={100} height={12} style={styles.handle} />
        <SkeletonText width={160} height={12} style={styles.bio} />
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actions}>
        <SkeletonBase width={36} height={36} borderRadius={18} style={styles.followButton} />
        <SkeletonBase width={36} height={36} borderRadius={18} style={styles.chatButton} />
      </View>
    </View>
  );
};

export const SearchUsersSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBase width={40} height={40} borderRadius={20} />
        <SkeletonText width={120} height={20} />
        <View style={{ width: 40 }} />
      </View>
      
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SkeletonBase width="100%" height={44} borderRadius={22} />
      </View>
      
      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <SkeletonText width={160} height={18} />
      </View>
      
      {/* User List */}
      <View style={styles.usersList}>
        {[1, 2, 3, 4, 5].map((index) => (
          <SearchUserItemSkeleton key={index} />
        ))}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  username: {
    marginBottom: 4,
  },
  handle: {
    marginBottom: 4,
  },
  bio: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    backgroundColor: colors.primary,
  },
  chatButton: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
