import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trophy, Award, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
import {
  achievementService,
  ACHIEVEMENTS,
  AchievementDefinition,
  UserAchievement,
  AchievementCategory,
} from '@/lib/achievementService';
import AchievementCard from '@/components/AchievementCard';
import { AchievementSkeleton } from '@/components/skeletons/AchievementSkeleton';

type FilterType = 'all' | AchievementCategory;

export default function AchievementsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const targetUserId = (params.userId as string) || user?.id;
  
  const [userAchievements, setUserAchievements] = useState<Record<string, UserAchievement>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [completionPercent, setCompletionPercent] = useState(0);

  useEffect(() => {
    loadAchievements();
  }, [targetUserId]);

  const loadAchievements = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    try {
      // Force refresh to get latest data from backend
      const achievements = await achievementService.getAllAchievements(targetUserId, true);
      setUserAchievements(achievements);
      
      const percent = await achievementService.getCompletionPercentage(targetUserId);
      setCompletionPercent(percent);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
    setLoading(false);
  };

  const filteredAchievements = useCallback(() => {
    let filtered = ACHIEVEMENTS;
    
    if (filter !== 'all') {
      filtered = filtered.filter(a => a.category === filter);
    }
    
    // Sort: unlocked first, then by rarity
    return filtered.sort((a, b) => {
      const aUnlocked = userAchievements[a.id]?.unlocked || false;
      const bUnlocked = userAchievements[b.id]?.unlocked || false;
      
      if (aUnlocked !== bUnlocked) {
        return bUnlocked ? 1 : -1;
      }
      
      const rarityOrder = { legendary: 0, rare: 1, common: 2 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [filter, userAchievements]);

  const unlockedCount = Object.values(userAchievements).filter(a => a.unlocked).length;

  const categories: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '🏆' },
    { key: 'first_steps', label: 'First Steps', icon: '👋' },
    { key: 'engagement', label: 'Engagement', icon: '⭐' },
    { key: 'streak', label: 'Streaks', icon: '🔥' },
    { key: 'xp', label: 'XP', icon: '📈' },
    { key: 'special', label: 'Special', icon: '✨' },
  ];

  const renderAchievement = ({ item }: { item: AchievementDefinition }) => {
    const userAch = userAchievements[item.id];
    
    return (
      <AchievementCard
        achievement={item}
        unlocked={userAch?.unlocked || false}
        progress={userAch?.progress}
        unlockedAt={userAch?.unlockedAt}
      />
    );
  };

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Trophy size={22} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.headerTitle}>Achievements</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Premium Stats Card with Gradient */}
      <View style={styles.statsCardContainer}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(227, 133, 236, 0.15)', 'rgba(106, 0, 244, 0.15)']
            : ['rgba(227, 133, 236, 0.95)', 'rgba(106, 0, 244, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCard}
        >
          {/* Animated Background Pattern */}
          <View style={styles.patternBackground}>
            <Sparkles size={80} color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.2)'} style={styles.pattern1} />
            <Trophy size={60} color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.15)'} style={styles.pattern2} />
          </View>

          <View style={styles.statsContent}>
            {/* Left Side - Trophy & Count */}
            <View style={styles.statsLeft}>
              <View style={styles.trophyContainer}>
                <LinearGradient
                  colors={isDark 
                    ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                    : ['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.2)']}
                  style={styles.trophyGradient}
                >
                  <Trophy size={36} color={isDark ? colors.primary : '#fff'} strokeWidth={2.5} />
                </LinearGradient>
              </View>
              <View style={styles.countContainer}>
                <Text style={styles.countLabel}>Unlocked</Text>
                <View style={styles.achievementCount}>
                  <Text style={styles.countNumber}>{unlockedCount}</Text>
                  <Text style={styles.countTotal}>/{ACHIEVEMENTS.length}</Text>
                </View>
              </View>
            </View>

            {/* Right Side - Circular Progress */}
            <View style={styles.statsRight}>
              <View style={styles.circularProgressContainer}>
                {/* Progress Circle */}
                <View style={styles.progressCircleOuter}>
                  <View style={[styles.progressCircleInner, { borderColor: isDark ? colors.border : 'rgba(255,255,255,0.3)' }]}>
                    <Text style={styles.percentText}>{completionPercent}</Text>
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.completeLabel}>COMPLETE</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={isDark 
                  ? [colors.primary, colors.secondary]
                  : ['#fff', 'rgba(255,255,255,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${completionPercent}%` }]} 
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === item.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={styles.filterIcon}>{item.icon}</Text>
              <Text style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Achievements List */}
      {loading ? (
        <AchievementSkeleton />
      ) : (
        <FlatList
          data={filteredAchievements()}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  statsCardContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  statsCard: {
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  patternBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pattern1: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.5,
  },
  pattern2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    opacity: 0.3,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  trophyContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  trophyGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countContainer: {
    gap: 2,
  },
  countLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  achievementCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    fontSize: 32,
    fontWeight: FontWeights.extrabold,
    color: isDark ? colors.primary : '#fff',
    letterSpacing: -1,
  },
  countTotal: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.8)',
    marginLeft: 2,
  },
  statsRight: {
    alignItems: 'center',
  },
  circularProgressContainer: {
    marginBottom: Spacing.xs,
  },
  progressCircleOuter: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
  },
  percentText: {
    fontSize: 24,
    fontWeight: FontWeights.extrabold,
    color: isDark ? colors.primary : '#fff',
    lineHeight: 24,
  },
  percentSymbol: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.9)',
    marginTop: -2,
  },
  completeLabel: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  progressBarContainer: {
    zIndex: 1,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
  },
  filtersList: {
    paddingHorizontal: Spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    marginRight: Spacing.sm,
    gap: 6,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
});
