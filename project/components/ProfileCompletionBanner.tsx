import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserCircle, X, Sparkles, AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';

interface ProfileCompletionBannerProps {
  userId: string;
  hasAvatar: boolean;
  hasBio: boolean;
  hasName: boolean;
  hasBanner: boolean;
  username: string;
  userCreatedAt?: string | Date; // When user account was created
}

const BANNER_DISMISSED_KEY = '@profile_completion_banner_dismissed';

export default function ProfileCompletionBanner({
  userId,
  hasAvatar,
  hasBio,
  hasName,
  hasBanner,
  username,
  userCreatedAt
}: ProfileCompletionBannerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🎯 FOCUS MODE: Check if ONLY avatar is missing (critical)
  const isAvatarMissing = !hasAvatar;
  const isAvatarOnlyMode = isAvatarMissing; // This is the UNSKIPPABLE mode
  
  // Check if profile is incomplete (for other optional fields)
  const isProfileIncomplete = !hasAvatar || !hasBio || !hasName || !hasBanner;

  useEffect(() => {
    if (isAvatarMissing) {
      // For missing avatar - ALWAYS show, no time restrictions, UNSKIPPABLE
      showBanner();
    } else if (isProfileIncomplete) {
      // For other incomplete fields - show with time/dismiss restrictions
      checkBannerStatus();
    }
  }, [userId, isAvatarMissing, isProfileIncomplete]);

  // Start pulsing animation for avatar-only mode to draw attention
  useEffect(() => {
    if (visible && isAvatarOnlyMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, isAvatarOnlyMode]);

  const showBanner = () => {
    console.log('🚨 [BANNER] AVATAR MISSING - Showing UNSKIPPABLE banner');
    setVisible(true);
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkBannerStatus = async () => {
    // For non-avatar fields, check if user dismissed
    try {
      const dismissedData = await AsyncStorage.getItem(`${BANNER_DISMISSED_KEY}_${userId}`);
      const hasShownBefore = await AsyncStorage.getItem(`${BANNER_DISMISSED_KEY}_shown_${userId}`);
      
      if (!dismissedData && !hasShownBefore) {
        console.log('✅ [BANNER] Showing banner for other incomplete fields');
        await AsyncStorage.setItem(`${BANNER_DISMISSED_KEY}_shown_${userId}`, 'true');
        setVisible(true);
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Error checking banner status:', error);
    }
  };

  const handleDismiss = async () => {
    // CANNOT dismiss if avatar is missing - this is UNSKIPPABLE
    if (isAvatarOnlyMode) {
      console.log('🚫 [BANNER] Cannot dismiss - Avatar is REQUIRED');
      return;
    }

    try {
      await AsyncStorage.setItem(`${BANNER_DISMISSED_KEY}_${userId}`, 'true');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
      });
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  const handleEditProfile = () => {
    // Navigate to edit profile - don't dismiss if avatar is missing
    if (!isAvatarOnlyMode) {
      try {
        AsyncStorage.setItem(`${BANNER_DISMISSED_KEY}_${userId}`, 'true');
      } catch (error) {
        console.error('Error setting banner dismissal:', error);
      }
    }

    router.push('/edit-profile');
  };

  // Don't render if nothing is incomplete
  if (!isProfileIncomplete || !visible) {
    return null;
  }

  // Use app's theme colors for consistency
  const gradientColors: [string, string] = [colors.primary, colors.secondary];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: isAvatarOnlyMode ? pulseAnim : 1 }
          ],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon - Use AlertCircle for avatar missing, UserCircle otherwise */}
          <View style={styles.iconContainer}>
            {isAvatarOnlyMode ? (
              <AlertCircle size={36} color="#ffffff" strokeWidth={2.5} fill="#ffffff20" />
            ) : (
              <>
                <UserCircle size={32} color="#ffffff" strokeWidth={2} />
                <View style={styles.sparkleIcon}>
                  <Sparkles size={16} color="#FFD700" fill="#FFD700" />
                </View>
              </>
            )}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, isAvatarOnlyMode && styles.criticalTitle]}>
              {isAvatarOnlyMode ? '⚠️ Profile Picture Required' : 'Complete Your Profile ✨'}
            </Text>
            <Text style={styles.subtitle}>
              {isAvatarOnlyMode 
                ? 'Add your profile picture to continue using all features'
                : 'Add your photo, name, bio, and cover banner to make your profile shine.'}
            </Text>
          </View>

          {/* Close Button - ONLY show if NOT in avatar-only mode */}
          {!isAvatarOnlyMode && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.actionButton, isAvatarOnlyMode && styles.criticalActionButton]}
          onPress={handleEditProfile}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, isAvatarOnlyMode && styles.criticalActionText]}>
            {isAvatarOnlyMode ? 'Add Photo Now' : 'Complete Now'}
          </Text>
          <View style={[styles.actionButtonArrow, isAvatarOnlyMode && styles.criticalArrow]}>
            <Text style={[styles.arrowText, isAvatarOnlyMode && styles.criticalArrowText]}>→</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  gradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ffffff20',
    borderRadius: 12,
    padding: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#ffffff',
    marginBottom: 4,
  },
  criticalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.extrabold,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: '#ffffffcc',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#ffffff30',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#FFD700',
    minWidth: 35,
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#ffffff20',
    borderRadius: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  criticalActionButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
  },
  criticalActionText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extrabold,
    color: '#3B8FE8', // Use app's primary color
  },
  actionButtonArrow: {
    backgroundColor: '#3B8FE815',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalArrow: {
    backgroundColor: '#3B8FE815', // Use app's primary color
  },
  arrowText: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
  },
  criticalArrowText: {
    color: '#3B8FE8', // Use app's primary color
  },
});