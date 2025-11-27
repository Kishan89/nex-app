import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { X, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
import { ACHIEVEMENTS, AchievementDefinition } from '@/lib/achievementService';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  achievementId: string;
  onClose: () => void;
  onShare?: () => void;
}

export default function AchievementUnlockModal({
  visible,
  achievementId,
  onClose,
  onShare,
}: Props) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const achievement: AchievementDefinition | undefined = ACHIEVEMENTS.find(
    a => a.id === achievementId
  );

  useEffect(() => {
    if (visible && achievement) {
      // Trigger haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.translateY.setValue(0);
        anim.translateX.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);
      });

      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate confetti
      confettiAnims.forEach((anim, index) => {
        const randomX = (Math.random() - 0.5) * width;
        const randomRotate = Math.random() * 720 - 360;

        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: height,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: randomX,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotate,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible, achievement]);

  if (!achievement) return null;

  const getRarityColor = (): [string, string] => {
    switch (achievement.rarity) {
      case 'legendary':
        return ['#FFD700', '#FFA500']; // Gold gradient
      case 'rare':
        return ['#C0C0C0', '#A9A9A9']; // Silver gradient
      default:
        return ['#CD7F32', '#8B4513']; // Bronze gradient
    }
  };

  const getRarityGlow = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return '#FFD700';
      case 'rare':
        return '#C0C0C0';
      default:
        return '#CD7F32';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti particles */}
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'][
                  index % 4
                ],
                left: (index % 10) * (width / 10),
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  { rotate: anim.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    })
                  },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

        {/* Modal content */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.backgroundSecondary,
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Badge with glow effect */}
            <View style={[styles.badgeContainer, { shadowColor: getRarityGlow() }]}>
              <LinearGradient
                colors={getRarityColor()}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.badgeIcon}>{achievement.icon}</Text>
              </LinearGradient>
            </View>

            {/* Achievement unlocked text */}
            <Text style={[styles.unlockText, { color: colors.textMuted }]}>
              Achievement Unlocked!
            </Text>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              {achievement.title}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {achievement.description}
            </Text>

            {/* Rarity badge */}
            <View
              style={[
                styles.rarityBadge,
                { backgroundColor: `${getRarityGlow()}20`, borderColor: getRarityGlow() },
              ]}
            >
              <Text style={[styles.rarityText, { color: getRarityGlow() }]}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>

            {/* Share button */}
            {onShare && (
              <TouchableOpacity
                style={[styles.shareButton, { borderColor: colors.border }]}
                onPress={() => {
                  onShare();
                  onClose();
                }}
              >
                <Share2 size={20} color={colors.primary} />
                <Text style={[styles.shareText, { color: colors.primary }]}>
                  Share Achievement
                </Text>
              </TouchableOpacity>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    top: -20,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.large,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  content: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  badgeContainer: {
    marginBottom: Spacing.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  badgeIcon: {
    fontSize: 60,
  },
  unlockText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extrabold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  rarityText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  shareText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  continueButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  continueText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
});
