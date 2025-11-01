import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export const XPLeadersSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Section Header with Icon */}
      <View style={styles.sectionHeader}>
        <SkeletonBase width={32} height={32} borderRadius={16} style={styles.headerIcon} />
        <SkeletonText width={140} height={20} />
      </View>
      {/* XP Users Grid - 2 columns */}
      <View style={styles.xpUsersGrid}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} style={styles.xpUserCard}>
            {/* Rank Badge */}
            <SkeletonBase width={32} height={20} borderRadius={10} style={styles.rankBadge} />
            {/* Avatar */}
            <SkeletonAvatar size={48} style={styles.xpUserAvatar} />
            {/* Username */}
            <SkeletonText width="80%" height={16} style={styles.xpUserName} />
            {/* Handle */}
            <SkeletonText width="60%" height={12} style={styles.xpUserHandle} />
            {/* Stats Row */}
            <View style={styles.xpUserStats}>
              <SkeletonBase width={60} height={20} borderRadius={10} />
              <SkeletonBase width={40} height={20} borderRadius={10} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  headerIcon: {
    backgroundColor: colors.backgroundTertiary,
  },
  xpUsersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  xpUserCard: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  xpUserAvatar: {
    marginBottom: 12,
  },
  xpUserName: {
    marginBottom: 4,
  },
  xpUserHandle: {
    marginBottom: 8,
  },
  xpUserStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
});
