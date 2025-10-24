// app/post/[id].tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  ScrollView,
  Alert,
  TouchableOpacity,
  BackHandler
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useListen } from '@/context/ListenContext';
import { apiService } from '@/lib/api';
import { commentCache } from '@/store/commentCache';
import { NormalizedPost } from '@/types';
import CommentsModal from '@/components/Comments';
import ImageViewer from '@/components/ImageViewer';
import PostCard from '@/components/PostCard';
import { pollVoteStorage } from '@/lib/pollVoteStorage';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default function PostScreen() {
  const { id, scrollToComments, fromNotification } = useLocalSearchParams<{ 
    id: string; 
    scrollToComments?: string;
    fromNotification?: string;
  }>();
  const { getPostById, toggleLike, toggleBookmark, comments, addComment, loadComments, postInteractions, votePoll } = useListen();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedPost, setFetchedPost] = useState<NormalizedPost | null>(null);
  const [fetchingPost, setFetchingPost] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  // Try to get post from context first, then from fetched post
  const post = id ? (getPostById(id) || fetchedPost) : null;
  useEffect(() => {
    const fetchPostIfNeeded = async () => {
      if (id && !getPostById(id) && !fetchingPost) {
        setFetchingPost(true);
        try {
          const response = await apiService.getPostById(id);
          if (response.success && response.data) {
            setFetchedPost(response.data);
            } else {
          }
        } catch (error) {
          } finally {
          setFetchingPost(false);
        }
      }
    };
    fetchPostIfNeeded();
  }, [id, getPostById, fetchingPost]);
  // Load comments when screen opens
  useEffect(() => {
    if (id) {
      loadComments(id);
      // Auto-open comments if navigated from comment notification
      if (scrollToComments === 'true') {
        setTimeout(() => {
          setShowComments(true);
        }, 500); // Small delay to ensure comments are loaded
      }
    }
  }, [id, scrollToComments, loadComments]);
  // Handle hardware back button - ONLY when user presses back
  useEffect(() => {
    const backAction = () => {
      try {
        // Check if we came from a notification
        if (fromNotification === 'true') {
          // If we came from a notification, go to home screen
          router.replace('/(tabs)/');
        } else if (!router.canGoBack()) {
          // If no navigation history (deep link), go to home
          router.replace('/(tabs)/');
        } else {
          // Normal back navigation
          router.back();
        }
      } catch (error) {
        // Fallback to home screen if any navigation error occurs
        router.replace('/(tabs)/');
      }
      return true; // Prevent default behavior (closing app)
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [fromNotification]);
  const handlePollVote = useCallback(async (pollId: string, optionId: string) => {
    try {
      setLoading(true);
      // Use the context's votePoll method which handles local storage
      await votePoll(pollId, optionId);
    } catch (error: any) {
      // Error is already handled in the context, no need to show alert again
    } finally {
      setLoading(false);
    }
  }, [votePoll]);
  const handleComment = useCallback(() => {
    if (id) {
      loadComments(id);
      setShowComments(true);
    }
  }, [id, loadComments]);
  if (!post || fetchingPost) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={false} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={false} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={() => {
            try {
              // Check if we came from a notification
              if (fromNotification === 'true') {
                // If we came from a notification, go to home screen
                router.replace('/(tabs)/');
              } else if (!router.canGoBack()) {
                // If no navigation history (deep link), go to home
                router.replace('/(tabs)/');
              } else {
                // Normal back navigation
                router.back();
              }
            } catch (error) {
              // Fallback to home screen if any navigation error occurs
              router.replace('/(tabs)/');
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <PostCard
          post={post}
          // Use post.liked from server as primary source, fallback to postInteractions
          isLiked={post.liked ?? Boolean(postInteractions[post.id]?.liked)}
          isBookmarked={post.bookmarked ?? Boolean(postInteractions[post.id]?.bookmarked)}
          // Poll voting state from the post itself (loaded from local storage)
          hasVotedOnPoll={post.hasVotedOnPoll}
          userPollVote={post.userPollVote}
          allowImageClick={true} // Enable image clicking in post detail screen
          onLike={() => toggleLike(post.id)}
          onComment={handleComment}
          onBookmark={() => toggleBookmark(post.id)}
          onPollVote={handlePollVote}
          onImagePress={(imageUri) => {
            // Show image viewer modal
            setSelectedImageUri(imageUri);
            setShowImageViewer(true);
          }}
          onShare={() => {}}
          onUserPress={() => {
            if (post.userId && post.userId !== 'unknown' && post.userId !== 'undefined' && post.userId.trim() !== '') {
              router.push(`/profile/${post.userId}`);
            } else {
              Alert.alert(
                'Profile Unavailable', 
                'Unable to open user profile. The user information is not available at the moment.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          }}
        />
      </ScrollView>
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        post={post}
        comments={comments[post.id] || []}
        onAddComment={(txt, parentId) => addComment(post.id, txt, parentId)}
        onLoadComments={loadComments}
        onDeleteComment={async (commentId) => {
          try {
            await apiService.deleteComment(post.id, commentId);
            await loadComments(post.id);
          } catch (error) {
            }
        }}
        currentUserId={user?.id}
        isLiked={Boolean(postInteractions[post.id]?.liked)}
        isBookmarked={Boolean(postInteractions[post.id]?.bookmarked)}
        hasVotedOnPoll={post.hasVotedOnPoll}
        userPollVote={post.userPollVote}
        allowImageClick={true} // Enable image clicking in comments modal too
        onLike={() => toggleLike(post.id)}
        onBookmark={() => toggleBookmark(post.id)}
        onPollVote={handlePollVote}
        onImagePress={(imageUri) => {
          // Show image viewer modal
          setSelectedImageUri(imageUri);
          setShowImageViewer(true);
        }}
        onShare={async () => {
          try {
            const { ShareService } = await import('@/lib/shareService');
            await ShareService.quickShare(post.id, post.username, post.content);
          } catch (error) {
            }
        }}
        onReport={async () => {
          try {
            await apiService.reportPost(post.id);
            Alert.alert('Post Reported', 'Thank you for your report. We will review this post.');
          } catch (error) {
            Alert.alert('Error', 'Failed to report post. Please try again.');
          }
        }}
        onDelete={async () => {
          try {
            await apiService.deletePost(post.id);
            router.back(); // Go back after deleting post
            Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        }}
      />
      {/* Image Viewer Modal */}
      <ImageViewer
        visible={showImageViewer}
        imageUri={selectedImageUri}
        onClose={() => setShowImageViewer(false)}
      />
    </SafeAreaView>
  );
}