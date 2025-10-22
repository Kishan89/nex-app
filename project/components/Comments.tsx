import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { X, Send, Heart, MessageCircle, Bookmark, Share, MoreVertical, Flag, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
// Assuming the following types and constants are defined correctly in your project
import { NormalizedPost, Comment } from '@/types'; 
import { supabase } from '@/lib/supabase';
import { Spacing, FontSizes, FontWeights, BorderRadius, Shadows, ComponentStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useListen } from '@/context/ListenContext';
import { useCommentReply } from '@/context/CommentReplyContext';
import PostCard from './PostCard';
import { CommentsSkeleton } from './skeletons';
interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: NormalizedPost | null;
  comments: Comment[];
  onAddComment: (text: string, parentId?: string) => void;
  onLoadComments: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  currentUserId?: string;
  onLike?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  onPollVote?: (pollId: string, optionId: string) => Promise<void>;
  onImagePress?: (imageUri: string) => void;
  allowImageClick?: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  hasVotedOnPoll?: boolean;
  userPollVote?: string;
}
// Define theme constants for clarity and adherence to requirements
const getModalBackground = (isDark: boolean) => isDark ? '#000000' : '#ffffff';
export default function CommentsModal({
  visible,
  onClose,
  post,
  comments,
  onAddComment,
  onLoadComments,
  onDeleteComment,
  currentUserId,
  onLike,
  onBookmark,
  onShare,
  onReport,
  onDelete,
  onPollVote,
  onImagePress,
  allowImageClick = false,
  isLiked,
  isBookmarked,
  hasVotedOnPoll,
  userPollVote,
}: CommentsModalProps) {
  const { user: currentUser } = useAuth(); // Move useAuth hook to top level
  const { colors, isDark } = useTheme();
  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<{[key: string]: boolean}>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentRefs, setCommentRefs] = useState<{[key: string]: React.RefObject<View>}>({});
  const insets = useSafeAreaInsets();
  const { openCommentReplies } = useCommentReply();
  // Get real-time post data and interactions from ListenContext
  const { posts, postInteractions, getPostById } = useListen();
  // Get the current post with real-time updates
  const currentPost = post ? (getPostById(post.id) || post) : null;
  const currentInteractions = currentPost ? postInteractions[currentPost.id] : null;
  useEffect(() => {
    if (post) {
      setLocalComments(comments);
      setCommentsLoading(false);
      // Clear old refs when comments change
      setCommentRefs({});
    }
  }, [post, comments]);
  // Set navigation bar theme-aware when modal opens
  useEffect(() => {
    if (Platform.OS === 'android') {
      const navBarColor = isDark ? '#000000' : '#ffffff';
      const buttonStyle = isDark ? 'light' : 'dark';
      if (visible) {
        // Immediately set navigation bar color using both APIs
        NavigationBar.setBackgroundColorAsync(navBarColor);
        NavigationBar.setButtonStyleAsync(buttonStyle);
        SystemUI.setBackgroundColorAsync(navBarColor);
        // Force it multiple times with different delays
        setTimeout(() => {
          NavigationBar.setBackgroundColorAsync(navBarColor);
          NavigationBar.setButtonStyleAsync(buttonStyle);
          SystemUI.setBackgroundColorAsync(navBarColor);
        }, 50);
        setTimeout(() => {
          NavigationBar.setBackgroundColorAsync(navBarColor);
          NavigationBar.setButtonStyleAsync(buttonStyle);
          SystemUI.setBackgroundColorAsync(navBarColor);
        }, 200);
        setTimeout(() => {
          NavigationBar.setBackgroundColorAsync(navBarColor);
          NavigationBar.setButtonStyleAsync(buttonStyle);
          SystemUI.setBackgroundColorAsync(navBarColor);
        }, 500);
      }
    }
  }, [visible, isDark]);
  // Reload comments when modal opens (logic preserved)
  useEffect(() => {
    if (visible && post?.id && onLoadComments) {
      setCommentsLoading(true);
      onLoadComments(post.id);
      // Reset loading after a delay (comments should load quickly)
      setTimeout(() => setCommentsLoading(false), 1500);
    }
  }, [visible, post?.id, onLoadComments]);
  // Real-time comment sync with nested structure support
  useEffect(() => {
    if (!post?.id || !visible) return;
    const channel = supabase
      .channel('post-comments')
      .on('broadcast', { event: 'comment_added' }, (payload) => {
        const { postId, comment } = payload.payload;
        if (postId === post.id) {
          // Reload comments to maintain proper nested structure
          if (onLoadComments) {
            onLoadComments(post.id);
          }
        }
      })
      .on('broadcast', { event: 'comment_deleted' }, (payload) => {
        const { postId, commentId, deletedBy, cascadeDelete } = payload.payload;
        if (postId === post.id) {
          if (cascadeDelete) {
            // Remove parent comment and all its replies
            setLocalComments(prev => prev.filter(comment => 
              comment.id !== commentId && comment.parentId !== commentId
            ));
          } else {
            // Remove only the specific comment
            setLocalComments(prev => prev.filter(comment => comment.id !== commentId));
          }
          // Also reload comments to ensure consistency
          if (onLoadComments) {
            onLoadComments(post.id);
          }
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id, visible, onLoadComments]);
  const handleSendComment = () => {
    const text = newComment.trim();
    if (text) {
      onAddComment(text);
      setNewComment('');
    }
  };
  const handleDeleteComment = async (commentId: string) => {
    // Find the comment to show appropriate confirmation message
    const comment = localComments.find(c => c.id === commentId);
    const commentUserId = comment?.user?.id || comment?.userId;
    const isOwnComment = commentUserId && currentUser?.id && String(commentUserId) === String(currentUser.id);
    // Debug logging for delete attempt
    // Check if this is a parent comment with replies
    const hasReplies = comment?.replies && comment.replies.length > 0;
    let confirmationMessage = '';
    if (isOwnComment) {
      confirmationMessage = hasReplies 
        ? `Are you sure you want to delete your comment? This will also delete all ${comment?.replies?.length} replies. This action cannot be undone.`
        : 'Are you sure you want to delete your comment? This action cannot be undone.';
    } else {
      Alert.alert('Error', 'You can only delete your own comments.');
      return;
    }
    Alert.alert(
      'Delete Comment',
      confirmationMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (post?.id) {
                await apiService.deleteComment(post.id, commentId);
                // Remove comment from local state immediately for better UX
                // If it's a parent comment with replies, remove all related comments
                if (hasReplies) {
                  setLocalComments(prev => prev.filter(c => 
                    c.id !== commentId && c.parentId !== commentId
                  ));
                } else {
                  setLocalComments(prev => prev.filter(c => c.id !== commentId));
                }
                // Call parent callback if provided
                onDeleteComment?.(commentId);
                // Show success message
                Alert.alert(
                  'Success', 
                  hasReplies 
                    ? 'Comment and all replies deleted successfully' 
                    : 'Comment deleted successfully'
                );
              }
            } catch (error: any) {
              // Check if comment was actually deleted successfully despite the error
              const wasDeleted = !localComments.find(c => c.id === commentId);
              if (wasDeleted) {
                return; // Don't show error or restore comment
              }
              // Restore comment in local state if deletion actually failed
              if (comment) {
                setLocalComments(prev => [...prev, comment].sort((a, b) => 
                  new Date(a.time).getTime() - new Date(b.time).getTime()
                ));
              }
              // Show appropriate error message based on error type
              let errorMessage = 'Failed to delete comment';
              if (error?.response?.status === 401 || error?.response?.status === 403) {
                errorMessage = 'You are not authorized to delete this comment';
              } else if (error?.response?.status === 404) {
                errorMessage = 'Comment not found or already deleted';
              } else if (error?.response?.status === 500) {
                // Check if it's just a response parsing error but deletion succeeded
                if (wasDeleted) {
                  return; // Don't show error
                }
                errorMessage = 'Server error occurred while deleting comment';
              } else if (error?.response?.data?.error) {
                errorMessage = error.response.data.error;
              } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error?.message) {
                errorMessage = error.message;
              }
              Alert.alert('Error', `${errorMessage}. Please try again.`);
            }
          }
        }
      ]
    );
  };
  const getOrCreateCommentRef = (commentId: string) => {
    if (!commentRefs[commentId]) {
      setCommentRefs(prev => ({
        ...prev,
        [commentId]: React.createRef<View>()
      }));
    }
    return commentRefs[commentId];
  };
  const handleReply = (comment: Comment) => {
    // Open the sliding reply panel instead of inline reply
    if (post?.id) {
      const commentRef = commentRefs[comment.id];
      if (commentRef?.current) {
        commentRef.current.measure((x, y, width, height, pageX, pageY) => {
          openCommentReplies(comment, post.id, pageY);
        });
      } else {
        openCommentReplies(comment, post.id);
      }
    }
  };
  const handleViewReplies = (comment: Comment) => {
    // Open the sliding reply panel to view replies
    if (post?.id) {
      openCommentReplies(comment, post.id);
    }
  };
  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };
  // Helper function to render text with @mentions highlighted (logic preserved)
  const renderTextWithMentions = (text: string, username: string, isReply = false) => {
    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);
    const textStyle = isReply ? styles.replyTextContent : styles.commentText;
    const usernameStyle = isReply ? styles.replyUsername : styles.commentUsername;
    return (
      <Text style={textStyle}>
        <Text style={usernameStyle}>{username}</Text>{' '}
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            // This is a mention (username part)
            return (
              <Text key={index} style={styles.mentionText}>
                @{part}
              </Text>
            );
          }
          // Regular text
          return part;
        })}
      </Text>
    );
  };
  // YouTube-style comment rendering with sliding panel replies
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isReply = depth > 0;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const repliesExpanded = expandedReplies[comment.id] || false;
    const commentRef = getOrCreateCommentRef(comment.id);
    return (
      <View key={comment.id} style={styles.commentWrapper}>
        <View 
          ref={commentRef}
          style={[
            styles.commentItem,
            isReply && styles.replyItem
          ]}
        >
          {comment.avatar && (
            <Image 
              source={{ uri: comment.avatar }} 
              style={isReply ? styles.replyAvatar : styles.commentAvatar} 
            />
          )}
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{comment.username}</Text>
              <Text style={styles.commentTime}>{comment.time}</Text>
              {/* Delete button inline with header - show for comment author OR post owner */}
              {(() => {
                // Enhanced logic: Check if user can delete comment
                // Backend sends both comment.user.id and comment.userId as fallback
                const commentUserId = comment.user?.id || comment.userId;
                // User can delete ONLY their own comments (regardless of post ownership)
                const isCommentAuthor = commentUserId && currentUser?.id && String(commentUserId) === String(currentUser.id);
                const shouldShowDelete = isCommentAuthor;
                return shouldShowDelete && (
                  <TouchableOpacity
                    style={styles.inlineDeleteButton}
                    onPress={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 size={12} color={colors.error} />
                  </TouchableOpacity>
                );
              })()}
            </View>
            <Text style={styles.commentText}>{comment.text}</Text>
            {/* YouTube-style Comment Actions - Reply */}
            <View style={styles.commentActions}>
              <TouchableOpacity 
                style={styles.replyButton}
                onPress={() => handleReply(comment)}
              >
                <Text style={styles.replyText}>
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* YouTube-style View Replies Button - Opens sliding panel */}
        {hasReplies && !isReply && (
          <TouchableOpacity 
            style={styles.viewRepliesButton}
            onPress={() => handleViewReplies(comment)}
          >
            <Text style={styles.viewRepliesIcon}>💬</Text>
            <Text style={styles.viewRepliesText}>
              View {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  if (!post) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      style={{ backgroundColor: getModalBackground(isDark) }}
    >
      <View style={{ flex: 1, backgroundColor: getModalBackground(isDark) }}>
        {/* 1, 2, 5. Use KeyboardAvoidingView with correct behavior and style for full black screen */}
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: getModalBackground(isDark) }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          enabled={Platform.OS === 'ios'}
        >
        {/* Header: Apply top safe area inset here */}
        <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
          <Text style={styles.modalTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          bounces={false}
        >
          {/* Post Content - Using PostCard for consistency */}
          <View style={styles.postContainer}>
            <PostCard
              post={currentPost || post}
              isLiked={currentInteractions?.liked ?? currentPost?.liked ?? isLiked}
              isBookmarked={currentInteractions?.bookmarked ?? currentPost?.bookmarked ?? isBookmarked}
              hasVotedOnPoll={hasVotedOnPoll ?? currentPost?.hasVotedOnPoll}
              userPollVote={userPollVote ?? currentPost?.userPollVote}
              allowImageClick={allowImageClick}
              onLike={onLike}
              onComment={() => {}} // Disable comment button in modal
              onBookmark={onBookmark}
              onPollVote={onPollVote}
              onImagePress={onImagePress}
              onShare={onShare}
              onReport={onReport}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          </View>
          {/* Comments Section (preserved) */}
          <View style={styles.commentsSection}>
            {commentsLoading ? (
              <CommentsSkeleton />
            ) : (
              <>
                <Text style={styles.commentsTitle}>
                  {localComments.length} {localComments.length === 1 ? 'Comment' : 'Comments'}
                </Text>
                {localComments.length === 0 ? (
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.commentsList}>
                    {localComments.map((comment) => renderComment(comment, 0))}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
        {/* Main comment input - always show (replies handled by panel) */}
        {(
          <View 
              style={[
                  styles.commentInputContainer, 
                  { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }
              ]}
          >
            <TextInput
              style={[
                styles.commentInput, 
                { 
                  backgroundColor: isDark ? colors.backgroundTertiary : colors.background,
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? 'transparent' : colors.border,
                }
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              keyboardAppearance={isDark ? "dark" : "light"}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              style={[styles.sendButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
              disabled={!newComment.trim()}
            >
              <Send size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
// Create dynamic styles function
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  // 1. Ensure modalContainer is full black
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    // Removed redundant paddingTop, now handled by insets in modalHeader
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background, // Ensure header is black
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Reduced padding to account for fixed input box at bottom
  },
  postContainer: {
    borderBottomWidth: 0,
    borderBottomColor: colors.border,
  },
  commentsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  commentsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: colors.text,
    marginBottom: Spacing.md,
  },
  commentsList: {
    gap: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  commentAvatar: {
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: ComponentStyles.avatar.medium / 2,
    marginRight: Spacing.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  commentUsername: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: colors.text,
    marginRight: Spacing.sm, // Add space between username and time
  },
  commentText: {
    fontSize: FontSizes.sm,
    color: colors.text,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  mentionText: {
    fontSize: FontSizes.sm,
    color: colors.primary, // Blue color for @mentions
    fontWeight: FontWeights.semibold,
  },
  emptyComments: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: FontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.lg,
  },
  commentTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
  },
  replyButton: {
    paddingVertical: Spacing.xs,
  },
  replyText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  likeButton: {
    paddingVertical: Spacing.xs,
  },
  likeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  viewRepliesLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.textMuted,
    marginRight: Spacing.sm,
  },
  viewRepliesText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  repliesContainer: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xl, // Instagram-style indentation
  },
  youtubeReplyItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  replyAvatar: {
    width: ComponentStyles.avatar.small,
    height: ComponentStyles.avatar.small,
    borderRadius: ComponentStyles.avatar.small / 2,
    marginRight: Spacing.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  replyUsername: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: colors.text, // White like Instagram
  },
  replyTextContent: {
    fontSize: FontSizes.sm,
    color: colors.text,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  replyTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
  },
  // Reply Actions for nested replies
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.lg,
  },
  replyActionText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  replyLikeText: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    fontWeight: FontWeights.regular,
  },
  // Reply Indicator
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 40,
  },
  replyIndicatorText: {
    fontSize: FontSizes.sm,
    color: colors.primary,
    fontWeight: FontWeights.medium,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.md,
  },
  inlineDeleteButton: {
    padding: Spacing.xs,
    marginLeft: 'auto', // Push to right side
    opacity: 0.7,
  },
  // Input Container - positioned at bottom to cover grey area
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 0, // Base padding, will be overridden by insets
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background, // Ensure the container matches theme
    minHeight: 60,
  },
  // 3. Input field style (background is set inline using DARK_INPUT_BACKGROUND)
  commentInput: {
    flex: 1,
    // backgroundColor: DARK_INPUT_BACKGROUND, // Applied inline
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    color: colors.text,
    marginRight: Spacing.sm,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: Spacing.sm,
  },
  // YouTube-style comment styles
  commentWrapper: {
    marginBottom: Spacing.md,
  },
  replyItem: {
    marginLeft: Spacing.xl,
    marginTop: Spacing.sm,
  },
  likeIcon: {
    fontSize: FontSizes.sm,
    marginRight: Spacing.xs,
  },
  likeCount: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  dislikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  dislikeIcon: {
    fontSize: FontSizes.sm,
  },
  replyTextActive: {
    color: colors.primary,
    fontWeight: FontWeights.bold,
  },
  viewRepliesIcon: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginRight: Spacing.sm,
    fontWeight: FontWeights.bold,
  },
  // Inline reply styles
  inlineReplyContainer: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    marginLeft: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyInputAvatar: {
    width: ComponentStyles.avatar.small,
    height: ComponentStyles.avatar.small,
    borderRadius: ComponentStyles.avatar.small / 2,
    marginRight: Spacing.sm,
  },
  inlineReplyInputContainer: {
    flex: 1,
  },
  inlineReplyInput: {
    backgroundColor: isDark ? colors.backgroundTertiary : colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    color: colors.text,
    marginBottom: Spacing.sm,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    borderWidth: isDark ? 0 : 1,
    borderColor: isDark ? 'transparent' : colors.border,
  },
  inlineReplyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelReplyButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  cancelReplyText: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  sendReplyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  sendReplyText: {
    fontSize: FontSizes.sm,
    color: '#ffffff',
    fontWeight: FontWeights.semibold,
  },
  viewMoreRepliesButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  viewMoreRepliesText: {
    fontSize: FontSizes.xs,
    color: colors.primary,
    fontWeight: FontWeights.semibold,
  },
});