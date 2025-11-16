import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { X, Send, Heart, MessageCircle, Bookmark, Share, MoreVertical, Flag, Trash2, ChevronDown, ChevronRight, UserX } from 'lucide-react-native';
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
import { useRouter } from 'expo-router';
import { CommentsSkeleton } from './skeletons';
import { commentCache } from '@/store/commentCache';
import { getDisplayUser, ANONYMOUS_AVATAR, DEFAULT_AVATAR } from '@/lib/commentUtils';
interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: NormalizedPost | null;
  comments: Comment[];
  onAddComment: (text: string, parentId?: string, isAnonymous?: boolean) => Promise<void>;
  onLoadComments: (postId: string, forceRefresh?: boolean) => void;
  onDeleteComment?: (commentId: string) => void;
  forceRefresh?: boolean;
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
  forceRefresh = false,
}: CommentsModalProps): React.ReactElement | null {
  const { user: currentUser } = useAuth(); // Move useAuth hook to top level
  const { colors, isDark } = useTheme();
  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<{[key: string]: boolean}>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentRefs, setCommentRefs] = useState<{[key: string]: React.RefObject<View>}>({});
  const [showMenuForComment, setShowMenuForComment] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [refreshingComments, setRefreshingComments] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { openCommentReplies } = useCommentReply();
  const router = useRouter();
  // Get real-time post data and interactions from ListenContext
  const { posts, postInteractions, getPostById } = useListen();
  // Get the current post with real-time updates
  const currentPost = post ? (getPostById(post.id) || post) : null;
  const currentInteractions = currentPost ? postInteractions[currentPost.id] : null;
  
  // Check if current user is the post owner AND post is anonymous
  const isPostOwner = currentPost?.userId === currentUserId;
  const canCommentAnonymously = isPostOwner && currentPost?.isAnonymous === true;
  
  // Reset anonymous state when post changes or when post is not anonymous
  useEffect(() => {
    if (!canCommentAnonymously) {
      setIsAnonymous(false);
    }
  }, [canCommentAnonymously]);
  
  useEffect(() => {
    if (post) {
      // Don't load from cache - use the comments passed from ListenContext which are fresh from server
      // This ensures correct isLiked status after reload
      console.log('📝 [Comments] Setting local comments:', comments.length, 'comments');
      comments.forEach((c, i) => {
        console.log(`  Comment ${i + 1}: id=${c.id.substring(0, 8)}, replies=${c.replies?.length || 0}`);
      });
      
      // Apply display masking to all comments and replies
      const processedComments = comments.map(comment => ({
        ...comment,
        likesCount: comment.likesCount || 0,
        isLiked: comment.isLiked || false,
        username: getDisplayUser(comment.user || comment, comment.isAnonymous).username,
        avatar: getDisplayUser(comment.user || comment, comment.isAnonymous).avatar,
        user: getDisplayUser(comment.user || { id: comment.userId, username: comment.username, avatar: comment.avatar }, comment.isAnonymous),
        replies: comment.replies?.map(reply => ({
          ...reply,
          likesCount: reply.likesCount || 0,
          isLiked: reply.isLiked || false,
          username: getDisplayUser(reply.user || reply, reply.isAnonymous).username,
          avatar: getDisplayUser(reply.user || reply, reply.isAnonymous).avatar,
          user: getDisplayUser(reply.user || { id: reply.userId, username: reply.username, avatar: reply.avatar }, reply.isAnonymous)
        })) || []
      }));
      
      setLocalComments(processedComments);
      setCommentsLoading(false);
      // Clear old refs when comments change
      setCommentRefs({});
    }
  }, [post, comments]);

  // NOTE: Comment cache loading removed because it contains stale user-specific data (isLiked status)
  // The fresh comments from ListenContext are used directly instead
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
      onLoadComments(post.id, forceRefresh);
      // Reset loading after a delay (comments should load quickly)
      setTimeout(() => setCommentsLoading(false), 1000); // Reduced from 1500ms to 1000ms
    }
  }, [visible, post?.id, onLoadComments, forceRefresh]);
  
  // Handle pull-to-refresh for comments
  const handleRefreshComments = useCallback(async () => {
    if (!post?.id || !onLoadComments) return;
    setRefreshingComments(true);
    try {
      await onLoadComments(post.id, true); // Force refresh
    } finally {
      setRefreshingComments(false);
    }
  }, [post?.id, onLoadComments]);
  // Real-time comment sync with nested structure support
  useEffect(() => {
    if (!post?.id || !visible) return;
    const channel = supabase
      .channel('post-comments')
      .on('broadcast', { event: 'comment_added' }, (payload) => {
        const { postId, comment } = payload.payload;
        if (postId === post.id) {
          // Debug logging
          console.log('📥 [Comments] Received comment from server:', {
            commentId: comment.id,
            avatar: comment.avatar,
            userAvatar: comment.user?.avatar,
            isAnonymous: comment.isAnonymous
          });
          
          // Apply display masking to the new comment
          const processedComment = {
            ...comment,
            likesCount: comment.likesCount || 0,
            isLiked: comment.isLiked || false,
            username: getDisplayUser(comment.user || comment, comment.isAnonymous).username,
            avatar: getDisplayUser(comment.user || comment, comment.isAnonymous).avatar,
            user: getDisplayUser(comment.user || { id: comment.userId, username: comment.username, avatar: comment.avatar }, comment.isAnonymous),
            isOptimistic: false // Mark as real from server
          };
          
          console.log('✅ [Comments] Processed comment avatar:', {
            commentId: processedComment.id,
            avatar: processedComment.avatar,
            avatarType: typeof processedComment.avatar
          });
          
          // Check if this is a reply (has parentId)
          if (processedComment.parentId) {
            // This is a REPLY - add it to the parent comment's replies array
            setLocalComments(prev => {
              return prev.map(c => {
                if (c.id === processedComment.parentId) {
                  // Found the parent comment - add reply to its replies array
                  const existingReplies = c.replies || [];
                  const replyExists = existingReplies.some(r => r.id === processedComment.id);
                  if (replyExists) return c; // Reply already exists
                  
                  return {
                    ...c,
                    replies: [...existingReplies, processedComment]
                  };
                }
                return c;
              });
            });
          } else {
            // This is a TOP-LEVEL COMMENT - add to main comments list
            setLocalComments(prev => {
              // Check if this is replacing an optimistic comment
              const optimisticIndex = prev.findIndex(c => 
                c.isOptimistic && c.text === processedComment.text && c.userId === processedComment.userId
              );
              
              if (optimisticIndex !== -1) {
                // Replace optimistic comment with real one
                const newComments = [...prev];
                newComments[optimisticIndex] = processedComment;
                return newComments;
              }
              
              // Check if this comment already exists (by ID)
              const exists = prev.some(c => c.id === processedComment.id);
              if (exists) return prev; // Already added, skip
              return [...prev, processedComment]; // Add to end for oldest-to-latest
            });
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
  const addComment = React.useCallback((newComment: Comment) => {
    setLocalComments(prev => {
      if (!newComment.parentId) {
        // Top-level comment handling
        if (newComment.isOptimistic) {
          // Add optimistic comment immediately
          const newComments = [...prev, newComment];
          // Auto-scroll to bottom for new comments
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
          return newComments;
        } else {
          // Real comment from server - check if replacing optimistic
          const optimisticIndex = prev.findIndex(c => 
            c.isOptimistic && c.text === newComment.text && c.userId === newComment.userId
          );
          
          if (optimisticIndex !== -1) {
            // Replace optimistic with real
            const newComments = [...prev];
            newComments[optimisticIndex] = newComment;
            return newComments;
          }
          
          // Check if comment already exists by ID
          const exists = prev.some(c => c.id === newComment.id);
          if (exists) return prev;
          
          // Add new real comment
          return [...prev, newComment];
        }
      }
      
      // Reply handling - this shouldn't happen in Comments.tsx as replies go through ReplyPanel
      return prev;
    });
  }, []);

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (text) {
      // Create instant comment with proper user data (no "You" text)
      const currentUserData = {
        id: currentUserId || '',
        username: isAnonymous ? 'Anonymous' : (currentUser?.username || 'User'),
        avatar: isAnonymous ? ANONYMOUS_AVATAR : (currentUser?.avatar_url || DEFAULT_AVATAR)
      };
      
      const instantComment: Comment = {
        id: `temp-${Date.now()}`, // Temporary ID
        text: text,
        userId: currentUserId || '',
        username: currentUserData.username,
        avatar: currentUserData.avatar,
        time: 'now',
        createdAt: new Date().toISOString(),
        parentId: undefined,
        replies: [],
        isAnonymous: isAnonymous,
        user: currentUserData,
        likesCount: 0,
        isLiked: false
      };

      // Add instant comment immediately
      addComment(instantComment);
      setNewComment('');
      // Don't reset anonymous state - let user control it
      
      // Scroll to bottom immediately to show the optimistic comment
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Fire-and-forget API call - don't wait for response
      onAddComment(text, undefined, isAnonymous).catch(error => {
        console.error('Error adding comment:', error);
      });
    }
  };
  const handleDeleteComment = async (commentId: string) => {
    setShowMenuForComment(null);
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

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!post?.id) return;
    
    // Optimistic update
    const updatedComments = localComments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLiked: !isLiked,
          likesCount: (c.likesCount || 0) + (isLiked ? -1 : 1)
        };
      }
      // Update in replies
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map(r => 
            r.id === commentId 
              ? { ...r, isLiked: !isLiked, likesCount: (r.likesCount || 0) + (isLiked ? -1 : 1) }
              : r
          )
        };
      }
      return c;
    });
    
    setLocalComments(updatedComments);
    
    // Update cache immediately
    await commentCache.cacheComments(post.id, updatedComments);

    try {
      const response = await apiService.toggleCommentLike(post.id, commentId);
      // Update with actual count from server
      if (response?.data?.likeCount !== undefined) {
        const serverUpdatedComments = localComments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              isLiked: response.data.liked,
              likesCount: response.data.likeCount
            };
          }
          // Update in replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => 
                r.id === commentId 
                  ? { ...r, isLiked: response.data.liked, likesCount: response.data.likeCount }
                  : r
              )
            };
          }
          return c;
        });
        setLocalComments(serverUpdatedComments);
        await commentCache.cacheComments(post.id, serverUpdatedComments);
      }
    } catch (error) {
      // Rollback on error
      const rolledBackComments = updatedComments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: isLiked,
            likesCount: (c.likesCount || 0) + (isLiked ? 1 : -1)
          };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r => 
              r.id === commentId 
                ? { ...r, isLiked: isLiked, likesCount: (r.likesCount || 0) + (isLiked ? 1 : -1) }
                : r
            )
          };
        }
        return c;
      });
      
      setLocalComments(rolledBackComments);
      // Rollback cache too
      await commentCache.cacheComments(post.id, rolledBackComments);
    }
  };

  const handleReportComment = async (commentId: string) => {
    setShowMenuForComment(null);
    Alert.alert(
      'Report Comment',
      'Are you sure you want to report this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              if (post?.id) {
                await apiService.reportComment(post.id, commentId);
                Alert.alert('Success', 'Comment reported successfully');
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to report comment. Please try again.');
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
          openCommentReplies(comment, post.id, currentPost?.userId, currentPost?.isAnonymous, pageY);
        });
      } else {
        openCommentReplies(comment, post.id, currentPost?.userId, currentPost?.isAnonymous);
      }
    }
  };
  const handleViewReplies = (comment: Comment) => {
    // Open the sliding reply panel to view replies
    if (post?.id) {
      openCommentReplies(comment, post.id, currentPost?.userId, currentPost?.isAnonymous);
    }
  };
  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);

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
    const commentUserId = comment.user?.id || comment.userId;
    const isOwnComment = commentUserId && currentUser?.id && String(commentUserId) === String(currentUser.id);
    
    // Debug: Log reply count
    console.log(`💬 [Comment ${comment.id.substring(0, 8)}] hasReplies:`, hasReplies, 'replies:', comment.replies?.length || 0, 'repliesArray:', comment.replies);

    return (
      <View key={comment.id} style={styles.commentWrapper}>
        <View 
          ref={commentRef}
          style={[
            styles.commentItem,
            isReply && styles.replyItem
          ]}
        >
          <TouchableOpacity 
            onPress={comment.isAnonymous ? undefined : () => {
              const userId = comment.user?.id || comment.userId;
              if (userId && userId !== 'unknown' && userId !== 'undefined' && userId.trim() !== '') {
                router.push(`/profile/${userId}`);
              }
            }} 
            activeOpacity={comment.isAnonymous ? 1 : 0.7}
          >
            <Image 
              source={
                comment.isAnonymous 
                  ? ANONYMOUS_AVATAR 
                  : (() => {
                      const avatarValue = getDisplayUser(comment, comment.isAnonymous).avatar;
                      return typeof avatarValue === 'string' ? { uri: avatarValue } : avatarValue;
                    })()
              } 
              style={isReply ? styles.replyAvatar : styles.commentAvatar} 
            />
          </TouchableOpacity>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserInfo}>
                <TouchableOpacity 
                  onPress={comment.isAnonymous ? undefined : () => {
                    const userId = comment.user?.id || comment.userId;
                    if (userId && userId !== 'unknown' && userId !== 'undefined' && userId.trim() !== '') {
                      router.push(`/profile/${userId}`);
                    }
                  }} 
                  activeOpacity={comment.isAnonymous ? 1 : 0.7}
                >
                  <Text style={styles.commentUsername}>
                    {getDisplayUser(comment, comment.isAnonymous).username}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.commentTime}>
                  {comment.time?.includes('ago') || comment.time === 'now' ? comment.time : `${comment.time} ago`}
                </Text>
              </View>
              {/* Optimistic comment indicator */}
              {comment.isOptimistic && (
                <View style={styles.optimisticIndicator}>
                  <Text style={styles.optimisticText}>Sending...</Text>
                </View>
              )}
              {/* Three-dot menu button */}
              <TouchableOpacity
                style={styles.inlineMenuButton}
                onPress={() => setShowMenuForComment(showMenuForComment === comment.id ? null : comment.id)}
              >
                <MoreVertical size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => {
                const now = Date.now();
                const lastTap = (comment as any)._lastTap || 0;
                const DOUBLE_TAP_DELAY = 300;
                
                if (now - lastTap < DOUBLE_TAP_DELAY) {
                  // Double tap detected - like the comment
                  handleLikeComment(comment.id, comment.isLiked || false);
                  (comment as any)._lastTap = 0;
                } else {
                  // Single tap - store timestamp
                  (comment as any)._lastTap = now;
                }
              }}
            >
              <Text style={styles.commentText}>{comment.text}</Text>
            </TouchableOpacity>
            {/* Dropdown menu */}
            {showMenuForComment === comment.id && (
              <View style={styles.menuDropdown}>
                {isOwnComment && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <Text style={[styles.menuItemText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleReportComment(comment.id)}
                >
                  <Flag size={16} color={colors.textMuted} />
                  <Text style={styles.menuItemText}>Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        {/* Reply and Like buttons in same row */}
        <View style={styles.commentActionsRow}>
          <View style={styles.replyWithLike}>
            <TouchableOpacity 
              style={styles.viewRepliesButton}
              onPress={() => handleViewReplies(comment)}
            >
              <Text style={styles.viewRepliesText}>
                {hasReplies ? `${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}` : '0 replies'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commentLikeButton}
              onPress={() => handleLikeComment(comment.id, comment.isLiked || false)}
            >
              <Heart 
                size={14} 
                color={comment.isLiked ? colors.primary : colors.textMuted}
                fill={comment.isLiked ? colors.primary : 'none'}
              />
              {(comment.likesCount || 0) > 0 && (
                <Text style={[styles.commentLikeCount, comment.isLiked && { color: colors.primary }]}>
                  {comment.likesCount}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
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
          ref={scrollViewRef}
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          refreshControl={
            <RefreshControl
              refreshing={refreshingComments}
              onRefresh={handleRefreshComments}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.backgroundTertiary}
            />
          }
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
              forceExpandText={true}
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
            <View style={styles.inputRow}>
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
              {canCommentAnonymously && (
                <TouchableOpacity
                  style={[styles.anonymousToggle, { backgroundColor: isAnonymous ? colors.primaryAlpha : 'transparent' }]}
                  onPress={() => setIsAnonymous(!isAnonymous)}
                >
                  <UserX size={18} color={isAnonymous ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSendComment}
                style={[styles.sendButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
                disabled={!newComment.trim()}
              >
                <Send size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
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
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  commentUserInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  commentUsername: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  commentText: {
    fontSize: FontSizes.sm,
    color: colors.text,
    lineHeight: 18,
    marginTop: Spacing.xs,
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
    marginTop: 2,
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
  commentActionsRow: {
    marginTop: Spacing.xs,
  },
  replyWithLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  viewRepliesButton: {
    paddingVertical: Spacing.xs,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  commentLikeCount: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  viewRepliesLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.textMuted,
    marginRight: Spacing.sm,
  },
  viewRepliesText: {
    fontSize: FontSizes.sm,
    color: "#3B8FE8",
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
  inlineMenuButton: {
    padding: Spacing.xs,
    marginLeft: 'auto',
    opacity: 0.7,
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: 30,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  menuItemText: {
    fontSize: FontSizes.sm,
    color: colors.text,
    fontWeight: FontWeights.medium,
  },
  // Input Container - positioned at bottom to cover grey area
  commentInputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 0, // Base padding, will be overridden by insets
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background, // Ensure the container matches theme
    minHeight: 60,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  anonymousToggle: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Optimistic comment styles
  optimisticIndicator: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  optimisticText: {
    fontSize: FontSizes.xs,
    color: colors.primary,
    fontWeight: FontWeights.medium,
    fontStyle: 'italic',
  },
});