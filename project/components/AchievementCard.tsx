import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
import { AchievementDefinition } from '@/lib/achievementService';
import AchievementBadge from './AchievementBadge';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';

interface Props {
  achievement: AchievementDefinition;
  unlocked: boolean;
  progress?: number;
  unlockedAt?: number;
  onPress?: () => void;
}

export default function AchievementCard({
  achievement,
  unlocked,
  progress = 0,
  unlockedAt,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRarityColor = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return '#FFD700'; // Gold
      case 'rare':
        return colors.primary; // Purple
      case 'common':
      default:
        return '#9e9e9e'; // Grey
    }
  };

  const getRarityLabel = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return 'LEGENDARY';
      case 'rare':
        return 'RARE';
      case 'common':
      default:
        return 'COMMON';
    }
  };

  const styles = createStyles(colors, isDark, unlocked, getRarityColor());

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Gradient Glow for Unlocked */}
      {unlocked && (
        <View style={styles.glowContainer}>
          <LinearGradient
            colors={[
              achievement.rarity === 'legendary' 
                ? 'rgba(255, 215, 0, 0.2)'
                : achievement.rarity === 'rare'
                ? 'rgba(227, 133, 236, 0.2)'
                : 'rgba(158, 158, 158, 0.1)',
              'transparent'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glow}
          />
        </View>
      )}

      <View style={styles.content}>
        {/* Badge */}
        <View style={styles.badgeContainer}>
          <AchievementBadge
            achievement={achievement}
            unlocked={unlocked}
            progress={progress}
            size="medium"
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          {/* Title Row with Rarity */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {achievement.title}
            </Text>
            <View style={[styles.rarityPill, { backgroundColor: `${getRarityColor()}20` }]}>
              <Text style={[styles.rarityText, { color: getRarityColor() }]}>
                {getRarityLabel()}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {achievement.description}
          </Text>

          {/* Unlocked Status */}
          {unlocked && unlockedAt && (
            <View style={styles.statusContainer}>
              <View style={styles.unlockedBadge}>
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
                <Text style={styles.unlockedText}>
                  Unlocked {formatDate(unlockedAt)}
                </Text>
              </View>
            </View>
          )}

          {/* Locked Status with Progress */}
          {!unlocked && (
            <View style={styles.statusContainer}>
              {achievement.target && progress > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min((progress / achievement.target) * 100, 100)}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {progress}/{achievement.target}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Lock size={12} color={colors.textMuted} strokeWidth={2.5} />
                  <Text style={styles.lockedText}>Locked</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isDark: boolean, unlocked: boolean, rarityColor: string) => StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: isDark ? colors.backgroundSecondary : colors.surface,
    borderWidth: unlocked ? 2 : 1,
    borderColor: unlocked ? rarityColor : colors.border,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.medium,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: FontWeights.extrabold,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: FontSizes.sm,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  statusContainer: {
    marginTop: 2,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  unlockedText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: colors.primary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
  },
  lockedText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: colors.textMuted,
  },
  progressSection: {
    gap: 6,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 7,
    backgroundColor: isDark ? colors.backgroundTertiary : colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: colors.textMuted,
    minWidth: 42,
    textAlign: 'right',
  },
});
