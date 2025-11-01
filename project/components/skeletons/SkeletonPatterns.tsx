import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonImage, SkeletonBase } from './SkeletonBase';
// Common skeleton patterns used across the app
export const UserRowSkeleton: React.FC<{ 
  showFollowButton?: boolean; 
  avatarSize?: number;
  style?: any;
}> = React.memo(({ 
  showFollowButton = true, 
  avatarSize = 50,
  style 
}) => (
  <View style={[styles.userRow, style]}>
    <SkeletonAvatar size={avatarSize} />
    <View style={styles.userInfo}>
      <SkeletonText width={120} height={16} style={styles.username} />
      <SkeletonText width={180} height={14} />
    </View>
    {showFollowButton && (
      <SkeletonButton width={80} height={32} />
    )}
  </View>
));
export const PostHeaderSkeleton: React.FC<{ style?: any }> = React.memo(({ style }) => (
  <View style={[styles.postHeader, style]}>
    <SkeletonAvatar size={44} />
    <View style={styles.headerInfo}>
      <SkeletonText width={120} height={16} style={styles.username} />
      <SkeletonText width={80} height={12} />
    </View>
    <SkeletonBase width={24} height={24} borderRadius={12} />
  </View>
));
export const PostContentSkeleton: React.FC<{ 
  lines?: number;
  showImage?: boolean;
  style?: any;
}> = React.memo(({ 
  lines = 3, 
  showImage = true,
  style 
}) => (
  <View style={[styles.postContent, style]}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonText 
        key={index}
        width={index === lines - 1 ? "60%" : "90%"} 
        height={16} 
        style={styles.contentLine} 
      />
    ))}
    {showImage && (
      <SkeletonImage 
        width="100%" 
        height={200} 
        borderRadius={12} 
        style={styles.postImage} 
      />
    )}
  </View>
));
export const PostActionsSkeleton: React.FC<{ style?: any }> = React.memo(({ style }) => (
  <View style={[styles.postActions, style]}>
    <SkeletonButton width={60} height={20} />
    <SkeletonButton width={60} height={20} />
    <SkeletonButton width={60} height={20} />
    <SkeletonButton width={60} height={20} />
  </View>
));
export const StatsRowSkeleton: React.FC<{ 
  itemCount?: number;
  style?: any;
}> = React.memo(({ 
  itemCount = 3,
  style 
}) => (
  <View style={[styles.statsRow, style]}>
    {Array.from({ length: itemCount }).map((_, index) => (
      <View key={index} style={styles.statItem}>
        <SkeletonText width={40} height={20} style={styles.statNumber} />
        <SkeletonText width={60} height={14} />
      </View>
    ))}
  </View>
));
export const GridItemSkeleton: React.FC<{ 
  size?: number;
  style?: any;
}> = React.memo(({ 
  size = 120,
  style 
}) => (
  <SkeletonBase 
    width={size} 
    height={size} 
    borderRadius={8}
    animationType="pulse"
    style={style}
  />
));
export const ChatMessageSkeleton: React.FC<{ 
  isOwn?: boolean;
  style?: any;
}> = React.memo(({ 
  isOwn = false,
  style 
}) => (
  <View style={[
    styles.chatMessage, 
    isOwn && styles.ownMessage,
    style
  ]}>
    {!isOwn && <SkeletonAvatar size={32} />}
    <View style={[styles.messageContent, isOwn && styles.ownMessageContent]}>
      <SkeletonText width="80%" height={16} style={styles.messageText} />
      <SkeletonText width="60%" height={16} />
    </View>
  </View>
));
export const NotificationItemSkeleton: React.FC<{ style?: any }> = React.memo(({ style }) => (
  <View style={[styles.notificationItem, style]}>
    <SkeletonAvatar size={44} />
    <View style={styles.notificationContent}>
      <SkeletonText width="90%" height={16} style={styles.notificationText} />
      <SkeletonText width="70%" height={14} />
      <SkeletonText width={80} height={12} style={styles.notificationTime} />
    </View>
    <SkeletonBase width={8} height={8} borderRadius={4} />
  </View>
));
const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  username: {
    marginBottom: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  postContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  contentLine: {
    marginBottom: 8,
  },
  postImage: {
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    marginBottom: 4,
  },
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  ownMessage: {
    flexDirection: 'row-reverse',
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  ownMessageContent: {
    marginLeft: 0,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  messageText: {
    marginBottom: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  notificationText: {
    marginBottom: 4,
  },
  notificationTime: {
    marginTop: 8,
  },
});
