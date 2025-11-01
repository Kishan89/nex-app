import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';
import { ComponentStyles } from '../../constants/theme';

interface CommentSkeletonProps {
  isReply?: boolean;
  style?: any;
}

export const CommentSkeleton: React.FC<CommentSkeletonProps> = ({ 
  isReply = false, 
  style 
}) => {
  const { colors } = useTheme();
  const dynamicStyles = createDynamicStyles(colors);

  return (
    <View style={[
      dynamicStyles.commentItem, 
      isReply && dynamicStyles.replyItem, 
      style
    ]}>
      {/* Avatar */}
      <SkeletonAvatar 
        size={isReply ? ComponentStyles.avatar.small : ComponentStyles.avatar.medium} 
        style={dynamicStyles.avatar}
      />
      
      <View style={dynamicStyles.commentContent}>
        {/* Username and Timestamp Row */}
        <View style={dynamicStyles.userInfoRow}>
          <SkeletonText 
            width={isReply ? 80 : 100} 
            height={14} 
            style={dynamicStyles.username}
          />
        </View>
        
        {/* Timestamp below username */}
        <SkeletonText 
          width={isReply ? 40 : 50} 
          height={12} 
          style={dynamicStyles.timestamp}
        />
        
        {/* Comment Text - Multiple lines */}
        <SkeletonText 
          width={isReply ? "90%" : "95%"} 
          height={14} 
          style={dynamicStyles.commentLine} 
        />
        <SkeletonText 
          width={isReply ? "75%" : "85%"} 
          height={14} 
          style={dynamicStyles.commentLine} 
        />
        
        {/* View Replies Button (only for main comments) */}
        {!isReply && Math.random() > 0.5 && (
          <View style={dynamicStyles.viewRepliesContainer}>
            <SkeletonText width={80} height={12} style={dynamicStyles.viewRepliesText} />
          </View>
        )}
      </View>
      
      {/* Three-dot menu button */}
      <SkeletonBase 
        width={24} 
        height={24} 
        borderRadius={12} 
        style={dynamicStyles.menuButton}
      />
    </View>
  );
};
export const CommentsSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const dynamicStyles = createDynamicStyles(colors);
  
  return (
    <View style={[dynamicStyles.container, { backgroundColor: colors.background }]}>
      {/* Comments List with enhanced skeletons */}
      <View style={dynamicStyles.commentsList}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index}>
            <CommentSkeleton />
            {/* Some comments have replies (30% chance) */}
            {index % 3 === 0 && (
              <>
                <CommentSkeleton isReply />
                {Math.random() > 0.5 && <CommentSkeleton isReply />}
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export const ReplySkeleton: React.FC = () => {
  const { colors } = useTheme();
  const dynamicStyles = createDynamicStyles(colors);
  
  return (
    <View style={dynamicStyles.repliesContainer}>
      {[1, 2, 3, 4].map((index) => (
        <CommentSkeleton key={index} isReply />
      ))}
    </View>
  );
};
const createDynamicStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  commentsList: {
    paddingTop: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  replyItem: {
    marginLeft: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  avatar: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    marginBottom: 0,
  },
  timestamp: {
    marginBottom: 8,
    opacity: 0.6,
  },
  commentLine: {
    marginBottom: 4,
  },
  viewRepliesContainer: {
    marginTop: 12,
  },
  viewRepliesText: {
    opacity: 0.7,
  },
  menuButton: {
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  repliesContainer: {
    paddingVertical: 16,
  },
});
