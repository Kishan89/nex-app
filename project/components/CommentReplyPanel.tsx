import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  BackHandler,
  Modal,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
// Gesture imports removed to prevent crashes
// import {
//   Gesture,
//   GestureDetector,
//   GestureHandlerRootView,
// } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { X, Send, ArrowLeft, Trash2, MoreVertical, Flag } from 'lucide-react-native';
import { Comment } from '@/types';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/lib/api';
import { ReplySkeleton } from './skeletons';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH; // Full width like YouTube
const PANEL_HEIGHT = SCREEN_HEIGHT; // Full height like YouTube
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
};
interface CommentReplyPanelProps {
  visible: boolean;
  onClose: () => void;
  parentComment: Comment | null;
  postId: string;
  currentUserId: string;
  currentUserAvatar?: string;
  commentY?: number;
}
export default function CommentReplyPanel({
  visible,
  onClose,
  parentComment,
  postId,
  currentUserId,
  currentUserAvatar,
  commentY = 0,
}: CommentReplyPanelProps) {
  const { colors, isDark } = useTheme();
  const [replies, setReplies] = useState<Comment[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOperating, setIsOperating] = useState(false); // Prevent auto-close during operations
  const [showMenuForReply, setShowMenuForReply] = useState<string | null>(null);
  const [replyingToReply, setReplyingToReply] = useState<Comment | null>(null);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  // Animation values
  const translateX = useSharedValue(SCREEN_WIDTH); // Start off-screen to the right
  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  // Load replies when panel opens
  useEffect(() => {
    if (visible && parentComment) {
      loadReplies();
      // Small delay to prevent immediate closing
      setTimeout(() => {
        openPanel();
      }, 50);
    }
  }, [visible, parentComment?.id]);
  // Separate effect for closing to prevent conflicts
  useEffect(() => {
    if (!visible && !sending && !isOperating) {
      closePanel();
    }
  }, [visible, sending, isOperating]);
  // Set navigation bar theme-aware when panel opens
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
  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);
  const loadReplies = async () => {
    if (!parentComment || !postId) {
      return;
    }
    try {
      setLoading(true);
      
      console.log('🔍 [ReplyPanel] parentComment:', {
        id: parentComment.id,
        hasReplies: !!parentComment.replies,
        repliesIsArray: Array.isArray(parentComment.replies),
        repliesLength: parentComment.replies?.length || 0,
        repliesData: parentComment.replies
      });
      
      // Check if replies are already in the parent comment (nested structure)
      if (parentComment.replies && Array.isArray(parentComment.replies) && parentComment.replies.length > 0) {
        console.log('✅ [ReplyPanel] Using nested replies from parent comment:', parentComment.replies.length);
        setReplies(parentComment.replies);
        setLoading(false);
        return;
      }
      
      // Fallback: Fetch all comments and find the parent with nested replies
      const comments = await apiService.getPostComments(postId);
      
      console.log('🔍 [ReplyPanel] Total comments fetched:', comments.length);
      console.log('🔍 [ReplyPanel] Looking for replies to comment ID:', parentComment.id);
      
      // Find the parent comment in the fetched comments (it should have replies nested)
      const parentWithReplies = comments.find((c: Comment) => c.id === parentComment.id);
      
      if (parentWithReplies && parentWithReplies.replies && parentWithReplies.replies.length > 0) {
        console.log('✅ [ReplyPanel] Found parent comment with nested replies:', parentWithReplies.replies.length);
        setReplies(parentWithReplies.replies);
      } else {
        console.log('⚠️ [ReplyPanel] No nested replies found for parent comment');
        setReplies([]);
      }
    } catch (error) {
      console.error('❌ [ReplyPanel] Error loading replies:', error);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };
  const openPanel = () => {
    // Simplified animation to prevent crashes
    translateY.value = 0;
    translateX.value = withSpring(0, SPRING_CONFIG);
    backdropOpacity.value = 0; // No backdrop needed for full screen
  };
  const closePanel = () => {
    translateX.value = withSpring(SCREEN_WIDTH, SPRING_CONFIG);
    backdropOpacity.value = 0;
    // Call onClose directly instead of in animation callback
    setTimeout(() => {
      onClose();
    }, 300);
  };
  // Removed worklet function since gesture is disabled
  const sendReply = async () => {
    if (!newReply.trim() || !parentComment || sending) return;

    const replyText = newReply.trim();
    // Add @mention if replying to someone specific
    const finalText = replyingToReply ? `@${replyingToReply.username} ${replyText}` : replyText;
    setNewReply('');
    setReplyingToReply(null);
    setSending(true);
    setIsOperating(true);

    // Create optimistic reply for instant UI feedback
    const optimisticReply: Comment = {
      id: `temp-reply-${Date.now()}`,
      text: finalText,
      username: 'You',
      avatar: currentUserAvatar || '',
      time: 'now',
      userId: currentUserId || '',
      isOptimistic: true,
      createdAt: new Date().toISOString(),
    };

    // Add optimistic reply immediately
    setReplies(prev => [...prev, optimisticReply]);
    
    // Scroll to show the new reply
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // All replies to this panel should have parentComment.id as their parentId
      // This ensures they're nested under the original comment
      console.log('📤 [ReplyPanel] Sending reply:', {
        postId,
        parentCommentId: parentComment.id,
        replyText: finalText.substring(0, 50)
      });
      
      const response = await apiService.addComment(postId, finalText, parentComment.id);
      // Remove optimistic reply and reload to get real data
      setReplies(prev => prev.filter(reply => reply.id !== optimisticReply.id));
      await loadReplies();
      // Scroll to bottom to show new reply
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      // Remove optimistic reply on error and restore text
      setReplies(prev => prev.filter(reply => reply.id !== optimisticReply.id));
      setNewReply(replyText);
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
      setIsOperating(false);
    }
  };

  const handleReplyToReply = (reply: Comment) => {
    setReplyingToReply(reply);
    // Focus would require a ref to TextInput, keeping it simple for now
  };

  const handleDeleteReply = async (replyId: string) => {
    setShowMenuForReply(null);
    const reply = replies.find(r => r.id === replyId);
    const isOwnReply = currentUserId === reply?.user?.id;

    if (!isOwnReply) {
      Alert.alert('Error', 'You can only delete your own replies.');
      return;
    }

    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteComment(postId, replyId);
              // Remove reply from local state immediately
              setReplies(prev => prev.filter(r => r.id !== replyId));
              Alert.alert('Success', 'Reply deleted successfully');
            } catch (error: any) {
              let errorMessage = 'Failed to delete reply';
              if (error?.response?.status === 401 || error?.response?.status === 403) {
                errorMessage = 'You are not authorized to delete this reply';
              } else if (error?.response?.status === 404) {
                errorMessage = 'Reply not found or already deleted';
              } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              Alert.alert('Error', `${errorMessage}. Please try again.`);
            }
          }
        }
      ]
    );
  };

  const handleReportReply = async (replyId: string) => {
    setShowMenuForReply(null);
    Alert.alert(
      'Report Reply',
      'Are you sure you want to report this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.reportComment(postId, replyId);
              Alert.alert('Success', 'Reply reported successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to report reply. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value }
    ],
  }));
  const renderReply = (reply: Comment) => {
    const isOwnReply = currentUserId === reply.user?.id;
    return (
      <View key={reply.id} style={styles.replyItem}>
        <View style={styles.replyItemRow}>
          <Image 
            source={reply.avatar && reply.avatar.trim() !== '' ? { uri: reply.avatar } : require('@/assets/images/default-avatar.png')} 
            style={styles.replyAvatar} 
          />
          <View style={styles.replyContent}>
          <View style={styles.replyHeader}>
            <View style={styles.replyUserInfo}>
              <Text style={styles.replyUsername}>{reply.username}</Text>
              <Text style={styles.replyTime}>
                {reply.time?.includes('ago') || reply.time === 'now' ? reply.time : `${reply.time} ago`}
              </Text>
            </View>
            {/* Optimistic reply indicator */}
            {reply.isOptimistic && (
              <View style={styles.optimisticIndicator}>
                <Text style={styles.optimisticText}>Sending...</Text>
              </View>
            )}
            {/* Three-dot menu */}
            <TouchableOpacity 
              style={styles.inlineMenuButton}
              onPress={() => setShowMenuForReply(showMenuForReply === reply.id ? null : reply.id)}
            >
              <MoreVertical size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.replyText}>
            {reply.text.split(/(@\w+)/g).map((part, index) => 
              part.startsWith('@') ? (
                <Text key={index} style={styles.mentionText}>{part}</Text>
              ) : (
                part
              )
            )}
          </Text>
          {/* Dropdown menu */}
          {showMenuForReply === reply.id && (
            <View style={styles.menuDropdown}>
              {isOwnReply && (
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleDeleteReply(reply.id)}
                >
                  <Trash2 size={16} color={colors.error} />
                  <Text style={[styles.menuItemText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleReportReply(reply.id)}
              >
                <Flag size={16} color={colors.textMuted} />
                <Text style={styles.menuItemText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </View>
        {/* Reply button */}
        <TouchableOpacity 
          style={styles.replyButton}
          onPress={() => handleReplyToReply(reply)}
        >
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible || !parentComment) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Sliding Panel - 75% height */}
          <Animated.View style={[styles.panel, panelStyle]}>
            <KeyboardAvoidingView
              style={styles.container}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
              enabled={Platform.OS === 'ios'}
            >
              {/* Header */}
              <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={closePanel} style={styles.backButton}>
                  <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Replies</Text>
                <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              {/* Parent Comment */}
              <View style={styles.parentCommentContainer}>
                <View style={styles.parentComment}>
                  <Image 
                    source={parentComment.avatar && parentComment.avatar.trim() !== '' ? { uri: parentComment.avatar } : require('@/assets/images/default-avatar.png')} 
                    style={styles.parentAvatar} 
                  />
                  <View style={styles.parentContent}>
                    <View style={styles.parentHeader}>
                    <View style={styles.parentUserInfo}>
                        <Text style={styles.parentUsername}>{parentComment.username}</Text>
                        <Text style={styles.parentTime}>
                          {parentComment.time?.includes('ago') || parentComment.time === 'now' ? parentComment.time : `${parentComment.time} ago`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.parentText}>{parentComment.text}</Text>
                  </View>
                </View>
              </View>
              {/* Replies List */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.repliesContainer}
                contentContainerStyle={styles.repliesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {loading ? (
                  <ReplySkeleton />
                ) : replies.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No replies yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to reply!</Text>
                  </View>
                ) : (
                  replies.map(renderReply)
                )}
              </ScrollView>
              {/* Reply Input - Same as Comments Modal */}
              <View
              style={[
                styles.commentInputContainer, 
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }
              ]}
            >
              {/* Reply indicator */}
              {replyingToReply && (
                <View style={styles.replyingIndicator}>
                  <Text style={styles.replyingText}>Replying to {replyingToReply.username}</Text>
                  <TouchableOpacity onPress={() => setReplyingToReply(null)}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}
                  placeholder={replyingToReply ? `Reply to ${replyingToReply.username}...` : `Reply to ${parentComment.username}...`}
                  placeholderTextColor={colors.textPlaceholder}
                  value={newReply}
                  onChangeText={setNewReply}
                  multiline
                  keyboardAppearance={isDark ? "dark" : "light"} 
                />
                <TouchableOpacity
                  onPress={sendReply}
                  style={[styles.sendButton, { opacity: newReply.trim() ? 1 : 0.5 }]}
                  disabled={!newReply.trim()}
                >
                  <Send size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            </KeyboardAvoidingView>
          </Animated.View>
      </View>
    </Modal>
  );
}
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    height: '75%',
    backgroundColor: colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // This ensures input stays at bottom
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  parentCommentContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  parentComment: {
    flexDirection: 'row',
    padding: Spacing.lg,
  },
  parentAvatar: {
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: ComponentStyles.avatar.medium / 2,
    marginRight: Spacing.md,
  },
  parentContent: {
    flex: 1,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  parentUserInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  parentUsername: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  parentTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  parentText: {
    fontSize: FontSizes.md,
    color: colors.text,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  repliesContainer: {
    flex: 1,
  },
  repliesContent: {
    padding: Spacing.lg,
    paddingBottom: 20, // Reduced padding to account for fixed input box at bottom
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: colors.text,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  replyItem: {
    flexDirection: 'column',
    marginBottom: Spacing.lg,
  },
  replyItemRow: {
    flexDirection: 'row',
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
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  replyUserInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  replyUsername: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  replyTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  replyButton: {
    paddingVertical: Spacing.xs,
    paddingLeft: 0,
    marginTop: Spacing.xs,
    marginLeft: 0,
  },
  replyButtonText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  replyText: {
    fontSize: FontSizes.sm,
    color: colors.text,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  mentionText: {
    color: colors.primary,
    fontWeight: FontWeights.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  inputAvatar: {
    width: ComponentStyles.avatar.small,
    height: ComponentStyles.avatar.small,
    borderRadius: ComponentStyles.avatar.small / 2,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: colors.text,
    maxHeight: 100,
    minHeight: 36,
    textAlignVertical: 'top',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.lg,
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
  // Comments Modal Input Styles - Copied exactly
  commentInputContainer: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 0, // Base padding, will be overridden by insets
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background, // Same as Comments modal
    minHeight: 60,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  replyingIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  replyingText: {
    fontSize: FontSizes.xs,
    color: colors.primary,
    fontWeight: FontWeights.medium,
  },
  replyToReplyButton: {
    marginTop: Spacing.xs,
  },
  replyToReplyText: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  commentInput: {
    flex: 1,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    color: colors.text,
    marginRight: Spacing.sm,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
    borderWidth: isDark ? 0 : 1,
    borderColor: isDark ? 'transparent' : colors.border,
  },
  // Optimistic reply styles
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