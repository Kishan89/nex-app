import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserCircle, X, Sparkles } from 'lucide-react-native';
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
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // Check if profile is incomplete
  const isProfileIncomplete = !hasAvatar || !hasBio || !hasName || !hasBanner;
  
  // 🚀 NEW: Check if user is new (within 7 days of account creation)
  const isNewUser = () => {
    if (!userCreatedAt) {
      console.log('⚠️ [BANNER] No userCreatedAt provided, assuming NEW user to show banner');
      return true; // If no creation date, assume new user to be safe and show banner
    }
    
    const createdDate = new Date(userCreatedAt);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    
    console.log(`📅 [BANNER] User created ${daysSinceCreation.toFixed(1)} days ago`);
    return daysSinceCreation <= 7; // Show banner only for users created within last 7 days
  };

  useEffect(() => {
    if (isProfileIncomplete) {
      checkBannerStatus();
    }
  }, [userId, isProfileIncomplete]); // Only check when userId changes or profile becomes incomplete

  const checkBannerStatus = async () => {
    // ✅ STRICT CHECK: Profile must be incomplete
    if (!isProfileIncomplete) {
      console.log('✅ [BANNER] Profile is complete - NOT showing banner');
      return;
    }
    
    // ✅ STRICT CHECK: User must be new (within 7 days)
    if (!isNewUser()) {
      console.log('🚫 [BANNER] User is old (>7 days) - NOT showing banner');
      return;
    }
    
    try {
      const dismissedData = await AsyncStorage.getItem(`${BANNER_DISMISSED_KEY}_${userId}`);
      const hasShownBefore = await AsyncStorage.getItem(`${BANNER_DISMISSED_KEY}_shown_${userId}`);
      
      if (!dismissedData && !hasShownBefore) {
        console.log('✅ [BANNER] Showing banner - User is NEW (<7 days) AND profile is INCOMPLETE');
        console.log(`   hasAvatar: ${hasAvatar}, hasBio: ${hasBio}, hasName: ${hasName}, hasBanner: ${hasBanner}`);
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
        setDismissed(true);
      });
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  const handleEditProfile = async () => {
    try {
      await AsyncStorage.setItem(`${BANNER_DISMISSED_KEY}_${userId}`, 'true');
    } catch (error) {
      console.error('Error setting banner dismissal:', error);
    }

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
      setDismissed(true);
      router.push('/edit-profile');
    });
  };

  // ✅ FINAL SAFETY CHECK: Don't render if profile is complete OR user is old OR banner was dismissed
  if (!visible || !isProfileIncomplete || dismissed) {
    return null;
  }
  
  // ✅ DOUBLE CHECK: User must be new (within 7 days)
  if (!isNewUser()) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon and Sparkle */}
          <View style={styles.iconContainer}>
            <UserCircle size={32} color="#ffffff" strokeWidth={2} />
            <View style={styles.sparkleIcon}>
              <Sparkles size={16} color="#FFD700" fill="#FFD700" />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Complete Your Profile ✨</Text>
            <Text style={styles.subtitle}>
              Add your photo, name, bio, and cover banner to make your profile shine.
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleEditProfile}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Complete Now</Text>
          <View style={styles.actionButtonArrow}>
            <Text style={styles.arrowText}>→</Text>
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
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
  },
  actionButtonArrow: {
    backgroundColor: '#3B8FE815',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
  },
});