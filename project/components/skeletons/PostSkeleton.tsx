import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonAvatar, SkeletonText, SkeletonImage, SkeletonBase } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';
import { ComponentStyles, Spacing, BorderRadius } from '../../constants/theme';

interface PostSkeletonProps {
  showImage?: boolean;
  style?: any;
}

export const PostSkeleton: React.FC<PostSkeletonProps> = ({ 
  showImage = true, 
  style 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }, style]}>
      {/* Post Header - Avatar and Username Section */}
      <View style={styles.header}>
        <SkeletonAvatar size={ComponentStyles.avatar.medium} style={styles.avatar} />
        
        <View style={styles.contentSection}>
          {/* Username and More Button Row */}
          <View style={styles.userInfoHeader}>
            <SkeletonText width={100} height={14} style={styles.username} />
            <SkeletonBase width={20} height={20} borderRadius={10} style={styles.moreButton} />
          </View>
          
          {/* Timestamp below username */}
          <SkeletonText width={60} height={12} style={styles.timestamp} />
          
          {/* Post Content Text */}
          <View style={styles.content}>
            <SkeletonText width="95%" height={14} style={styles.contentLine} />
            <SkeletonText width="85%" height={14} style={styles.contentLine} />
            {Math.random() > 0.4 && (
              <SkeletonText width="70%" height={14} />
            )}
          </View>
          
          {/* Post Image (if present) */}
          {showImage && (
            <SkeletonImage 
              width="100%" 
              height={220} 
              borderRadius={BorderRadius.md} 
              style={styles.image} 
            />
          )}
          
          {/* Action Buttons Row */}
          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <SkeletonBase width={20} height={20} borderRadius={10} />
              <SkeletonText width={30} height={12} style={styles.actionText} />
            </View>
            <View style={styles.actionButton}>
              <SkeletonBase width={20} height={20} borderRadius={10} />
              <SkeletonText width={30} height={12} style={styles.actionText} />
            </View>
            <View style={styles.actionButton}>
              <SkeletonBase width={20} height={20} borderRadius={10} />
            </View>
            <View style={styles.actionButton}>
              <SkeletonBase width={20} height={20} borderRadius={10} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: Spacing.sm,
  },
  contentSection: {
    flex: 1,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    flex: 1,
  },
  moreButton: {
    marginLeft: 8,
  },
  timestamp: {
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  content: {
    marginBottom: Spacing.sm,
  },
  contentLine: {
    marginBottom: 6,
  },
  image: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    opacity: 0.7,
  },
});
