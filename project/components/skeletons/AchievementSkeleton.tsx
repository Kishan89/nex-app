import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBase, SkeletonText } from './SkeletonBase';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';

export const AchievementSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View key={item} style={styles.card}>
          <View style={styles.cardContent}>
            <SkeletonBase width={64} height={64} borderRadius={32} style={styles.badge} />
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <SkeletonText width={100} height={18} />
                <SkeletonBase width={50} height={16} borderRadius={4} />
              </View>
              <SkeletonText width="90%" height={14} style={styles.description} />
              <SkeletonText width="60%" height={14} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
  },
});
