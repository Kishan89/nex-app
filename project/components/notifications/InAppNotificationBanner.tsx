import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
  DeviceEventEmitter,
  Platform,
  StatusBar,
} from 'react-native';
import { MessageCircle, Heart, MessageSquare, UserPlus, X } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '@/constants/theme';
const { width: screenWidth } = Dimensions.get('window');
interface NotificationData {
  title: string;
  body: string;
  data: {
    type?: 'message' | 'like' | 'comment' | 'follow';
    chatId?: string;
    postId?: string;
    userId?: string;
    senderId?: string;
    username?: string;
    avatar?: string;
  };
  onPress?: () => void;
}
interface InAppNotificationBannerProps {
  visible?: boolean;
  notification?: NotificationData;
  onDismiss?: () => void;
}
export default function InAppNotificationBanner({
  visible: manualVisible,
  notification: manualNotification,
  onDismiss: manualOnDismiss,
}: InAppNotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use manual props if provided, otherwise use internal state
  const isVisible = manualVisible !== undefined ? manualVisible : visible;
  const currentNotification = manualNotification || notification;
  useEffect(() => {
    // Listen for notification events from FCM service and socket service
    const subscription = DeviceEventEmitter.addListener(
      'showNotificationBanner',
      (notificationData: NotificationData) => {
        // Show banner for all notification types (like, comment, follow, message)
        const type = notificationData.data?.type;
        if (type && ['like', 'comment', 'follow', 'message'].includes(type)) {
          showNotification(notificationData);
        }
      }
    );
    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  const showNotification = (notificationData: NotificationData) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification(notificationData);
    setVisible(true);
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    // Auto-dismiss after 4 seconds
    timeoutRef.current = setTimeout(() => {
      hideNotification();
    }, 4000);
  };
  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setNotification(null);
      if (manualOnDismiss) {
        manualOnDismiss();
      }
    });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
  const handlePress = () => {
    if (currentNotification?.onPress) {
      currentNotification.onPress();
    }
    hideNotification();
  };
  const handleDismiss = () => {
    hideNotification();
  };
  const getNotificationIcon = () => {
    const type = currentNotification?.data?.type;
    const iconSize = 20;
    const iconColor = '#ffffff';
    switch (type) {
      case 'like':
        return <Heart size={iconSize} color="#ff4757" fill="#ff4757" />;
      case 'comment':
        return <MessageSquare size={iconSize} color={iconColor} />;
      case 'follow':
        return <UserPlus size={iconSize} color="#5f27cd" />;
      case 'message':
        return <MessageCircle size={iconSize} color={iconColor} />;
      default:
        return <Heart size={iconSize} color="#ff4757" fill="#ff4757" />;
    }
  };
  const getNotificationColor = () => {
    const type = currentNotification?.data?.type;
    switch (type) {
      case 'like':
        return '#ff4757';
      case 'comment':
        return '#ffa502';
      case 'follow':
        return '#2ed573';
      case 'message':
        return '#5f27cd';
      default:
        return '#ff4757';
    }
  };
  if (!isVisible || !currentNotification) {
    return null;
  }
  const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: '#1a1a1a',
          borderColor: '#333333',
          top: statusBarHeight + 8,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Left side - Icon and avatar */}
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor() + '20' }]}>
            {getNotificationIcon()}
          </View>
          {currentNotification.data?.avatar && (
            <Image
              source={{ uri: currentNotification.data.avatar }}
              style={styles.avatar}
            />
          )}
        </View>
        {/* Middle - Content */}
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: '#ffffff' }]} numberOfLines={1}>
            {currentNotification.title}
          </Text>
          <Text style={[styles.body, { color: '#cccccc' }]} numberOfLines={2}>
            {currentNotification.body}
          </Text>
        </View>
        {/* Right side - Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color="#888888" />
        </TouchableOpacity>
      </TouchableOpacity>
      {/* Accent line */}
      <View style={[styles.accentLine, { backgroundColor: getNotificationColor() }]} />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.large,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 70,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  textContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  body: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
    lineHeight: 18,
  },
  dismissButton: {
    padding: Spacing.xs,
    borderRadius: 12,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});
export { InAppNotificationBanner };
