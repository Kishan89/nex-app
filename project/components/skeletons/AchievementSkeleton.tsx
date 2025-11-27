import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { SkeletonBase, SkeletonText } from './SkeletonBase';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';

export const AchievementSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonBase width={40} height={40} borderRadius={20} />
        <View style={styles.headerTitle}>
          <SkeletonBase width={24} height={24} borderRadius={12} />
          <SkeletonText width={120} height={24} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Stats Card Skeleton */}
        <View style={styles.statsCardContainer}>
          <SkeletonBase width="100%" height={180} borderRadius={BorderRadius.xl} />
        </View>

        {/* Filter Pills Skeleton */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4, 5].map((item) => (
              <SkeletonBase
                key={item}
                width={80}
                height={32}
                borderRadius={16}
                style={styles.filterPill}
              />
            ))}
          </ScrollView>
        </View>

        {/* Achievement Cards Skeleton */}
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.card}>
              <View style={styles.cardContent}>
                {/* Badge Skeleton */}
                <SkeletonBase width={64} height={64} borderRadius={32} style={styles.badge} />
                
                {/* Info Skeleton */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  statsCardContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
  },
  filterPill: {
    marginRight: Spacing.sm,
  },
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
