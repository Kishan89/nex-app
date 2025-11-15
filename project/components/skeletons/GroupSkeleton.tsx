import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBase, SkeletonAvatar, SkeletonText } from './SkeletonBase';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';

// Group List Item Skeleton
export const GroupItemSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.groupItem, { backgroundColor: colors.backgroundSecondary }]}>
      <SkeletonAvatar size={50} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <SkeletonText width="60%" height={16} />
          <SkeletonText width={40} height={12} />
        </View>
        <SkeletonText width="80%" height={14} style={styles.description} />
        <View style={styles.footer}>
          <SkeletonText width={80} height={12} />
          <SkeletonBase width={14} height={14} borderRadius={7} />
        </View>
      </View>
    </View>
  );
};

// Group List Skeleton
export const GroupListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {Array.from({ length: 8 }).map((_, index) => (
        <GroupItemSkeleton key={index} />
      ))}
    </View>
  );
};

// Create Group User Item Skeleton
export const CreateGroupUserSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.userItem}>
      <SkeletonAvatar size={40} />
      <View style={styles.userInfo}>
        <SkeletonText width="70%" height={16} />
      </View>
      <SkeletonBase width={24} height={24} borderRadius={12} />
    </View>
  );
};

// Create Group Form Skeleton
export const CreateGroupSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      {/* Group Icon Section */}
      <View style={styles.iconSection}>
        <View style={styles.iconContainer}>
          <SkeletonAvatar size={80} />
          <SkeletonText width={120} height={12} style={styles.iconLabel} />
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        <SkeletonText width={90} height={14} style={styles.label} />
        <SkeletonBase width="100%" height={48} borderRadius={BorderRadius.md} style={styles.input} />
        
        <SkeletonText width={140} height={14} style={styles.label} />
        <SkeletonBase width="100%" height={80} borderRadius={BorderRadius.md} style={styles.input} />
      </View>

      {/* Members Section */}
      <View style={styles.membersSection}>
        <SkeletonText width={150} height={14} style={styles.label} />
        <View style={styles.userList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <CreateGroupUserSkeleton key={index} />
          ))}
        </View>
      </View>

      {/* Create Button */}
      <SkeletonBase 
        width="100%" 
        height={48} 
        borderRadius={BorderRadius.lg} 
        style={styles.createButton} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  avatar: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  iconLabel: {
    marginTop: Spacing.xs,
  },
  formSection: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    marginBottom: Spacing.md,
  },
  membersSection: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  userList: {
    marginTop: Spacing.sm,
  },
  createButton: {
    marginBottom: Spacing.lg,
  },
});