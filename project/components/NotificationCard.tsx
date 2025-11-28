import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Heart, MessageCircle, UserPlus, Mail, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
const { width } = Dimensions.get('window');
// Simple notification interface to match the one used in notifications screen
interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  postId?: string;
  userId?: string;
  read: boolean;
  createdAt: string;
  userAvatar?: string;
  postContent?: string;
  time?: string;
  postImage?: string;
}
interface NotificationCardProps {
  notification: SimpleNotification;
  onPress: (notification: SimpleNotification) => void;
}
export const NotificationCard = ({
  notification,
  onPress,
}: NotificationCardProps) => {
  const { colors, isDark } = useTheme();
  const getNotificationIcon = () => {
    const iconProps = { size: 10, color: getIconColor() };
    const type = notification.type?.toUpperCase() || 'LIKE';
    switch (type) {
      case 'LIKE':
        return <Heart {...iconProps} fill={iconProps.color} />;
      case 'COMMENT':
        return <MessageCircle {...iconProps} />;
      case 'FOLLOW':
        return <UserPlus {...iconProps} />;
      case 'MESSAGE':
        return <Mail {...iconProps} />;
      case 'WARNING':
        return <AlertTriangle {...iconProps} />;
      default:
        return <Heart {...iconProps} />;
    }
  };
  const getIconColor = () => {
    const type = notification.type?.toUpperCase() || 'LIKE';
    switch (type) {
      case 'LIKE':
        return '#ff4757';
      case 'COMMENT':
        return '#e385ec';
      case 'FOLLOW':
        return '#5f27cd';
      case 'MESSAGE':
        return '#004aad';
      case 'WARNING':
        return '#ff9800';
      default:
        return '#e385ec';
    }
  };
  const getBackgroundColor = () => {
    if (notification.read) {
      return isDark ? 'rgba(255,255,255,0.02)' : colors.backgroundSecondary;
    } else {
      return isDark ? 'rgba(227,133,236,0.05)' : colors.primaryAlpha;
    }
  };
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getBackgroundColor() }]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      {/* Left side - Avatar and Icon */}
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={notification.userAvatar ? { uri: notification.userAvatar } : require('@/assets/images/default-avatar.png')}
            style={styles.avatar}
          />
          <View style={[styles.iconBadge, { backgroundColor: getIconColor() }]}>
            {getNotificationIcon()}
          </View>
        </View>
      </View>
      {/* Center - Content */}
      <View style={styles.centerSection}>
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {notification.message || 'No message'}
        </Text>
        {notification.postContent && (
          <Text style={[styles.postPreview, { color: colors.textMuted }]} numberOfLines={1}>
            "{notification.postContent}"
          </Text>
        )}
        <Text style={[styles.time, { color: colors.textMuted }]}>{notification.time || 'Unknown time'}</Text>
      </View>
      {/* Right side - Post image or indicator */}
      <View style={styles.rightSection}>
        {notification.postImage ? (
          <Image source={{ uri: notification.postImage }} style={styles.postImage} />
        ) : (
          !notification.read && <View style={styles.unreadDot} />
        )}
      </View>
    </TouchableOpacity>
  );
};
// Create dynamic styles function
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
  },
  leftSection: {
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.backgroundTertiary,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,      
    height: 16,     
    borderRadius: 8, 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },  
  centerSection: {
    flex: 1,
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  postPreview: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    fontWeight: '400',
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImage: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.backgroundTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
export default NotificationCard;
