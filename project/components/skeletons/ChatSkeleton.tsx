import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { Spacing, ComponentStyles } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface ChatItemSkeletonProps {
  style?: any;
  hasUnread?: boolean;
}

export const ChatItemSkeleton: React.FC<ChatItemSkeletonProps> = ({
  style,
  hasUnread = false
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.chatItem, style]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <SkeletonAvatar size={50} />
      </View>
      
      {/* Chat Content */}
      <View style={styles.chatContent}>
        {/* Chat Header - Name and Time */}
        <View style={styles.chatHeader}>
          <SkeletonText width={120} height={16} style={styles.chatName} />
          <SkeletonText width={50} height={12} style={styles.chatTime} />
        </View>
        
        {/* Last Message */}
        <SkeletonText width="75%" height={14} style={styles.lastMessage} />
      </View>
      
      {/* Unread Indicator - Green Dot */}
      {hasUnread && (
        <SkeletonBase width={8} height={8} borderRadius={4} style={styles.unreadDot} />
      )}
    </View>
  );
};

// Message Bubble Skeleton for Chat Detail Screen
export const MessageBubbleSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.otherBubble]}>
      <SkeletonText width="60%" height={14} />
      <SkeletonText width={40} height={11} style={styles.messageTime} />
    </View>
  );
};

export const ChatSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Chat List - Show 5-6 chats */}
      <View style={styles.chatsList}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <ChatItemSkeleton
            key={`chat-skeleton-${index}`}
            hasUnread={index % 3 === 1} // Some chats have unread indicator
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: 12,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    flex: 1,
  },
  chatTime: {
    marginLeft: Spacing.sm,
    opacity: 0.6,
  },
  lastMessage: {
    opacity: 0.7,
  },
  unreadDot: {
    marginLeft: Spacing.sm,
    backgroundColor: colors.success || '#4ade80',
  },
  // Message bubble styles for chat detail screen
  messageBubble: {
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginRight: Spacing.md,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    marginLeft: Spacing.md,
  },
  messageTime: {
    marginTop: 4,
    opacity: 0.6,
  },
});
