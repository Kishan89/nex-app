import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, Alert, Share as RNShare } from 'react-native';
import { Heart, MessageCircle, Bookmark, Share, MoreVertical, Flag, Trash2, Pin, Radio } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { NormalizedPost } from '@/types';
import TruncatedText from './TruncatedText';
import PollComponent from './PollComponent';
import YouTubePreview from './YouTubePreview';
import LinkDetector from './LinkDetector';
import ImageOptimizer from '@/lib/imageOptimizer';
import { useTheme } from '@/context/ThemeContext';
import { useThrottledCallback } from '@/hooks/useDebounce';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { ANONYMOUS_AVATAR } from '@/lib/commentUtils';
const { width } = Dimensions.get('window');
type Props = {
  post: NormalizedPost;
  isLiked?: boolean;
  isBookmarked?: boolean;
  hasVotedOnPoll?: boolean;
  userPollVote?: string;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onPollVote?: (pollId: string, optionId: string) => Promise<void>;
  onPress?: () => void;
  onUserPress?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onToggleLive?: () => void;
  onImagePress?: (imageUri: string) => void;
  currentUserId?: string;
  isCurrentUserAdmin?: boolean; // New prop - true if current user is app admin
  allowImageClick?: boolean; // New prop to control image click functionality
  onTextToggle?: () => void; // Callback for text expand/collapse
  refreshKey?: number; // Key to reset TruncatedText state on refresh
  forceExpandText?: boolean; // Force text to be fully expanded (for comment screen)
};
const PostCard = React.memo(function PostCard({
  post,
  isLiked,
  isBookmarked,
  hasVotedOnPoll,
  userPollVote,
  onLike,
  onComment,
  onBookmark,
  onPollVote,
  onPress,
  onUserPress,
  onShare,
  onReport,
  onDelete,
  onTogglePin,
  onToggleLive,
  onImagePress,
  allowImageClick = false,
  currentUserId,
  isCurrentUserAdmin = false,
  onTextToggle,
  refreshKey,
  forceExpandText = false,
}: Props) {
  const { colors, isDark } = useTheme();
  
  // Use post.liked as the source of truth, with isLiked as fallback
  const [localIsLiked, setLocalIsLiked] = useState(post.liked ?? isLiked ?? false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount || post.likes || 0);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || post.comments || 0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Blinking animation for Live indicator
  const liveOpacity = useSharedValue(1);
  
  useEffect(() => {
    if (post.isLive) {
      // Create a blinking effect: fade out to 0.3, then back to 1, repeat forever
      liveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1, // Repeat indefinitely
        false
      );
    }
  }, [post.isLive]);
  
  const liveAnimatedStyle = useAnimatedStyle(() => ({
    opacity: liveOpacity.value,
  }));
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [optimizedImageUri, setOptimizedImageUri] = useState<string | null>(null);
  const moreButtonRef = React.useRef<any>(null);
  const likeScale = useSharedValue(1);
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  // Update local state when post prop changes - immediate sync
  React.useEffect(() => {
    setLocalIsLiked(post.liked ?? isLiked ?? false);
    setLocalLikesCount(post.likesCount || post.likes || 0);
    setLocalCommentsCount(post.commentsCount || post.comments || 0);
  }, [post.liked, isLiked, post.likesCount, post.likes, post.commentsCount, post.comments, post.id]);

  // Optimize image when post changes - memoized to prevent re-runs
  React.useEffect(() => {
    if (post.image && !optimizedImageUri) {
      ImageOptimizer.optimizeImage(post.image, {
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 600
      }).then(setOptimizedImageUri);
    }
  }, [post.image, optimizedImageUri]);
  // Throttle handlers to prevent rapid clicks
  const handleLike = useThrottledCallback(() => {
    // Animate heart
    likeScale.value = withSpring(1.2, {}, () => {
      likeScale.value = withSpring(1);
    });
    // Call parent handler (which handles optimistic updates)
    onLike?.();
  }, 500);
  
  const handleComment = useThrottledCallback(() => {
    onComment?.();
  }, 500);
  
  const handleBookmark = useThrottledCallback(() => {
    onBookmark?.();
  }, 500);
  
  const handleShare = async () => {
    setShowOptionsMenu(false);
    try {
      // Use UnifiedShareService - complete sharing with deep linking
      const { UnifiedShareService } = await import('@/lib/UnifiedShareService');
      UnifiedShareService.showShareOptions(post.id, post.username, post.content);
    } catch (error) {
      console.error('Share error:', error);
    }
    // Call the onShare callback for analytics
    onShare?.();
  };
  const handleReport = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          style: 'destructive',
          onPress: () => onReport?.()
        }
      ]
    );
  };
  const handleDelete = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete?.()
        }
      ]
    );
  };
  
  const handleTogglePin = () => {
    setShowOptionsMenu(false);
    onTogglePin?.();
  };
  
  const handleToggleLive = () => {
    setShowOptionsMenu(false);
    onToggleLive?.();
  };
  
  const isOwnPost = currentUserId === post.userId;
  
  return (
    <View style={[styles.postCard, { backgroundColor: colors.background }]}>
      {/* Header with Avatar */}
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={post.isAnonymous ? undefined : onUserPress} activeOpacity={post.isAnonymous ? 1 : 0.7}>
          <Image 
            source={post.isAnonymous ? ANONYMOUS_AVATAR : (post.avatar ? { uri: post.avatar } : require('@/assets/images/default-avatar.png'))} 
            style={styles.userAvatar} 
          />
        </TouchableOpacity>
        <View style={styles.contentSection}>
          {/* Username, timestamp and more button */}
          <View style={styles.userInfoHeader}>
            <View style={styles.userInfoColumn}>
              <View style={styles.usernameRow}>
                <TouchableOpacity onPress={post.isAnonymous ? undefined : onUserPress} activeOpacity={post.isAnonymous ? 1 : 0.7} style={styles.usernameContainer}>
                  <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                    {post.isAnonymous ? 'Anonymous' : post.username}
                  </Text>
                </TouchableOpacity>
                {post.isPinned && (
                  <View style={[styles.pinnedBadge, { backgroundColor: '#3B8FE815', borderColor: '#3B8FE830' }]}>
                    <Pin size={13} color="#3B8FE8" strokeWidth={2.8} fill="#3B8FE8" />
                    <Text style={[styles.pinnedText, { color: '#3B8FE8' }]}>Pinned</Text>
                  </View>
                )}
                {post.isLive && (
                  <View style={[styles.liveBadge, { backgroundColor: '#ff000015', borderColor: '#ff000030' }]}>
                    <Animated.View style={[styles.liveIndicator, liveAnimatedStyle]} />
                    <Text style={[styles.liveText, { color: '#ff0000' }]}>Live</Text>
                  </View>
                )}
              </View>
              {/* Timestamp parallel to profile picture */}
              <Text style={[styles.timeStamp, { color: colors.textMuted }]}>
                {post.createdAt?.includes('ago') || post.createdAt === 'now' ? post.createdAt : `${post.createdAt} ago`}
              </Text>
            </View>
            <TouchableOpacity 
              ref={moreButtonRef}
              style={styles.shareButton}
              onPress={() => {
                moreButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                  setMenuPosition({ 
                    x: x - 140,
                    y: y + height + 5
                  });
                  setShowOptionsMenu(true);
                });
              }}
            >
              <MoreVertical size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {/* Content under username with more space */}
          <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            {post.content && (
              <TruncatedText 
                text={post.content}
                maxLines={6}
                style={styles.postContent}
                onPress={onPress}
                onToggle={onTextToggle}
                refreshKey={refreshKey}
                forceExpand={forceExpandText}
              />
            )}
            {post.image && (
              allowImageClick ? (
                <TouchableOpacity onPress={() => onImagePress?.(post.image)} activeOpacity={0.9}>
                  <Image 
                    source={{ uri: optimizedImageUri || post.image }} 
                    style={styles.postImage}
                    loadingIndicatorSource={{ uri: post.image }}
                  />
                </TouchableOpacity>
              ) : (
                <Image 
                  source={{ uri: optimizedImageUri || post.image }} 
                  style={styles.postImage}
                  loadingIndicatorSource={{ uri: post.image }}
                />
              )
            )}
            {/* YouTube Preview */}
            {post.youtubeVideoId && (
              <YouTubePreview
                youtubeData={{
                  videoId: post.youtubeVideoId,
                  title: post.youtubeTitle || 'YouTube Video',
                  author: post.youtubeAuthor || 'YouTube',
                  thumbnail: post.youtubeThumbnail || `https://img.youtube.com/vi/${post.youtubeVideoId}/maxresdefault.jpg`,
                  thumbnailHQ: `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`,
                  duration: post.youtubeDuration || '',
                  url: post.youtubeUrl || `https://www.youtube.com/watch?v=${post.youtubeVideoId}`,
                  embedUrl: `https://www.youtube.com/embed/${post.youtubeVideoId}`,
                  provider: 'YouTube'
                }}
              />
            )}
            {/* Debug: Show if YouTube data exists */}
            {__DEV__ && post.youtubeVideoId && (
              <Text style={{color: 'green', fontSize: 12, marginTop: 5}}>
                🎥 YouTube: {post.youtubeVideoId}
              </Text>
            )}
            {/* Poll Component */}
            {post.poll && onPollVote && (
              <PollComponent
                poll={post.poll}
                hasVoted={hasVotedOnPoll}
                userVote={userPollVote}
                onVote={onPollVote}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* Actions - Reply left, Like and Bookmark right */}
      <View style={styles.postActions}>
        {/* Left side - Reply button */}
        <TouchableOpacity style={styles.replyButton} onPress={handleComment}>
          <Text style={[styles.replyText, { color: '#3B8FE8' }]}>
            {localCommentsCount === 0 ? '0 replies' : localCommentsCount === 1 ? '1 reply' : `${localCommentsCount} replies`}
          </Text>
        </TouchableOpacity>
        {/* Right side - Like count and Bookmark */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Animated.View style={likeAnimatedStyle}>
              <Heart
                size={18}
                color={localIsLiked ? colors.like : colors.textMuted}
                fill={localIsLiked ? colors.like : 'transparent'}
                strokeWidth={1.5}
              />
            </Animated.View>
            <Text style={[styles.actionText, { color: colors.textMuted }, localIsLiked && { color: colors.like }]}>
              {localLikesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
            <Bookmark
              size={18}
              color={isBookmarked || post.bookmarked ? colors.bookmark : colors.textMuted}
              fill={isBookmarked || post.bookmarked ? colors.bookmark : 'transparent'}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.postSeparator, { backgroundColor: colors.border }]} />
      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[styles.optionsMenu, { 
            position: 'absolute',
            left: menuPosition.x,
            top: menuPosition.y,
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border
          }]}>
            <TouchableOpacity style={styles.optionItem} onPress={handleShare}>
              <Share size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
            {isCurrentUserAdmin && (
              <>
                <TouchableOpacity style={styles.optionItem} onPress={handleTogglePin}>
                  <Pin size={20} color={post.isPinned ? colors.primary : colors.text} />
                  <Text style={[styles.optionText, { color: post.isPinned ? colors.primary : colors.text }]}>
                    {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={handleToggleLive}>
                  <Radio size={20} color={post.isLive ? '#ff0000' : colors.text} />
                  <Text style={[styles.optionText, { color: post.isLive ? '#ff0000' : colors.text }]}>
                    {post.isLive ? 'End Live' : 'Go Live'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
              <Flag size={20} color={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>Report Post</Text>
            </TouchableOpacity>
            {isOwnPost && (
              <TouchableOpacity style={styles.optionItem} onPress={handleDelete}>
                <Trash2 size={20} color={colors.error} />
                <Text style={[styles.optionText, { color: colors.error }]}>Delete Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.post.likesCount === nextProps.post.likesCount &&
    prevProps.post.commentsCount === nextProps.post.commentsCount &&
    prevProps.post.isPinned === nextProps.post.isPinned &&
    prevProps.post.isLive === nextProps.post.isLive &&
    prevProps.hasVotedOnPoll === nextProps.hasVotedOnPoll &&
    prevProps.userPollVote === nextProps.userPollVote &&
    prevProps.refreshKey === nextProps.refreshKey
  );
});

export default PostCard;

const styles = StyleSheet.create({
  postCard: { 
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#000000',
    marginBottom: 0,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  userAvatar: { 
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium, 
    borderRadius: ComponentStyles.avatar.medium / 2, 
    backgroundColor: Colors.backgroundTertiary,
    marginRight: Spacing.sm,
  },
  contentSection: {
    flex: 1,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  userInfoColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  usernameContainer: {
    flexShrink: 1,
  },
  username: { 
    fontSize: 16, 
    fontWeight: FontWeights.bold, 
    color: Colors.text,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    gap: 3,
    borderWidth: 1,
    borderColor: '#3B8FE840',
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    gap: 3,
    borderWidth: 1,
    borderColor: '#ff000040',
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ff0000',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  timeStamp: { 
    fontSize: FontSizes.xs, 
    color: Colors.textMuted,
    marginTop: 2,
  },
  postContent: { 
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.sm,
    fontWeight: FontWeights.regular,
    marginTop: Spacing.xs,
  },
  postImage: { 
    width: '100%', 
    height: 200, // Reduced height for compactness
    borderRadius: BorderRadius.md, // Smaller radius
    marginTop: Spacing.sm, // Space between timestamp and image
    marginBottom: Spacing.sm, // Slight spacing before actions
    backgroundColor: Colors.backgroundTertiary,
  },
  postSeparator: { 
    height: 1, 
    backgroundColor: '#333333',
    marginTop: Spacing.sm,
    marginHorizontal: -Spacing.md, // Extend to full width
  },
  postActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  shareButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  replyButton: {
    paddingVertical: Spacing.xs,
  },
  replyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, 
  },
  moreButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    minWidth: 45, 
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  actionText: { 
    fontSize: FontSizes.xs, 
    color: Colors.textMuted, 
    marginLeft: Spacing.xs, 
    fontWeight: FontWeights.semibold,
  },
  likedText: { 
    color: Colors.like 
  },
  commentedText: {
    color: Colors.primary
  },
  bookmarkedText: { 
    color: Colors.bookmark 
  },
  // Options Menu Styles - Positioned near three-dot button
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  optionsMenu: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    minWidth: 160,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
    elevation: 8, // For Android shadow
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.md,
    fontWeight: FontWeights.medium,
  },
});
