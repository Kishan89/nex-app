import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AchievementDefinition } from '@/lib/achievementService';

interface Props {
  achievement: AchievementDefinition;
  unlocked: boolean;
  progress?: number;
  size?: 'small' | 'medium' | 'large';
}

export default function AchievementBadge({
  achievement,
  unlocked,
  progress = 0,
  size = 'medium',
}: Props) {
  const { colors, isDark } = useTheme();

  const sizeMap = {
    small: 48,
    medium: 64,
    large: 80,
  };

  const iconSizeMap = {
    small: 24,
    medium: 32,
    large: 40,
  };

  const badgeSize = sizeMap[size];
  const iconSize = iconSizeMap[size];

  const getRarityColors = (): [string, string] => {
    if (!unlocked) {
      return isDark 
        ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
        : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)'];
    }

    switch (achievement.rarity) {
      case 'legendary':
        return ['#FFD700', '#FFA500']; // Gold gradient
      case 'rare':
        return [colors.primary, colors.secondary]; // Purple gradient
      case 'common':
      default:
        return ['#9e9e9e', '#757575']; // Grey gradient
    }
  };

  const getBorderColor = () => {
    if (!unlocked) return colors.border;
    
    switch (achievement.rarity) {
      case 'legendary':
        return '#FFD700';
      case 'rare':
        return colors.primary;
      case 'common':
      default:
        return '#9e9e9e';
    }
  };

  const styles = createStyles(badgeSize, iconSize, getBorderColor(), unlocked, isDark);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getRarityColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Text style={styles.icon}>{achievement.icon}</Text>
      </LinearGradient>
      
      {/* Progress Ring for Locked Achievements */}
      {!unlocked && achievement.target && progress > 0 && (
        <View style={styles.progressRing}>
          <View 
            style={[
              styles.progressSegment,
              { 
                transform: [{ rotate: `${(progress / achievement.target) * 360}deg` }],
                borderColor: colors.primary 
              }
            ]} 
          />
        </View>
      )}

      {/* Shine Effect for Unlocked */}
      {unlocked && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shine}
        />
      )}
    </View>
  );
}

const createStyles = (badgeSize: number, iconSize: number, borderColor: string, unlocked: boolean, isDark: boolean) => StyleSheet.create({
  container: {
    width: badgeSize,
    height: badgeSize,
    position: 'relative',
  },
  badge: {
    width: badgeSize,
    height: badgeSize,
    borderRadius: badgeSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: unlocked ? 3 : 2,
    borderColor: borderColor,
    overflow: 'hidden',
  },
  icon: {
    fontSize: iconSize,
    opacity: unlocked ? 1 : 0.4,
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: badgeSize,
    height: badgeSize,
    borderRadius: badgeSize / 2,
    overflow: 'hidden',
  },
  progressSegment: {
    position: 'absolute',
    top: -badgeSize / 2,
    left: -badgeSize / 2,
    width: badgeSize,
    height: badgeSize,
    borderWidth: 2,
    borderRadius: badgeSize / 2,
    borderColor: 'transparent',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: badgeSize,
    height: badgeSize,
    borderRadius: badgeSize / 2,
  },
});
