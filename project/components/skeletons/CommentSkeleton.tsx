import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';
interface CommentSkeletonProps {
  isReply?: boolean;
  style?: any;
}
export const CommentSkeleton: React.FC<CommentSkeletonProps> = ({ 
  isReply = false, 
  style 
}) => {
  return (
    <View style={[
      styles.commentItem, 
      isReply && styles.replyItem, 
      style
    ]}>
      <SkeletonAvatar size={isReply ? 32 : 40} />
      <View style={styles.commentContent}>
        <SkeletonText 
          width={isReply ? "85%" : "90%"} 
          height={16} 
          style={styles.commentText} 
        />
        <SkeletonText 
          width={isReply ? "70%" : "75%"} 
          height={16} 
          style={styles.commentText} 
        />
        {/* Comment Actions */}
        <View style={styles.commentActions}>
          <SkeletonText width={40} height={12} />
          <SkeletonText width={35} height={12} />
          <SkeletonBase width={16} height={16} borderRadius={8} />
        </View>
        {/* View Replies Button (only for main comments) */}
        {!isReply && Math.random() > 0.6 && (
          <View style={styles.viewRepliesContainer}>
            <SkeletonBase width={24} height={1} />
            <SkeletonText width={100} height={12} style={styles.viewRepliesText} />
          </View>
        )}
      </View>
    </View>
  );
};
export const CommentsSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Comments Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SkeletonText width={100} height={20} />
      </View>
      {/* Comments List */}
      <View style={styles.commentsList}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index}>
            <CommentSkeleton />
            {/* Some comments have replies */}
            {index % 3 === 0 && (
              <>
                <CommentSkeleton isReply />
                <CommentSkeleton isReply />
              </>
            )}
          </View>
        ))}
      </View>
      {/* Input Skeleton */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <SkeletonBase width="85%" height={40} borderRadius={20} />
        <SkeletonBase width={40} height={40} borderRadius={20} />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  commentsList: {
    flex: 1,
    paddingTop: 10,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  replyItem: {
    marginLeft: 20,
    paddingVertical: 8,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentText: {
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 8,
  },
  viewRepliesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  viewRepliesText: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    gap: 10,
  },
});
