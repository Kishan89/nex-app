// app/comments/[id].tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  TouchableOpacity,
  BackHandler
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useListen } from '@/context/ListenContext';
import { apiService } from '@/lib/api';
import { NormalizedPost } from '@/types';
import CommentsModal from '@/components/Comments';
import ImageViewer from '@/components/ImageViewer';
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
    paddingVertical: 5,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function CommentsScreen() {
  const { id, fromNotification } = useLocalSearchParams<{ 
    id: string; 
    fromNotification?: string;
  }>();
  const { getPostById, toggleLike, toggleBookmark, comments, addComment, loadComments, postInteractions, votePoll } = useListen();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetchedPost, setFetchedPost] = useState<NormalizedPost | null>(null);
  const [fetchingPost, setFetchingPost] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');

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
            Alert.alert('Error', 'Post not found or has been deleted.');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to load post. Please try again.');
        } finally {
          setFetchingPost(false);
        }
      }
    };
    fetchPostIfNeeded();
  }, [id, getPostById]);

  useEffect(() => {
    if (id) {
      loadComments(id);
    }
  }, [id, loadComments]);

  useEffect(() => {
    const backAction = () => {
      try {
        if (fromNotification === 'true') {
          router.replace('/(tabs)/');
        } else if (!router.canGoBack()) {
          router.replace('/(tabs)/');
        } else {
          router.back();
        }
      } catch (error) {
        router.replace('/(tabs)/');
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [fromNotification]);

  const handlePollVote = useCallback(async (pollId: string, optionId: string) => {
    try {
      setLoading(true);
      await votePoll(pollId, optionId);
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  }, [votePoll]);

  if (!post || fetchingPost) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CommentsModal
        visible={true}
        onClose={() => {
          try {
            if (fromNotification === 'true') {
              router.replace('/(tabs)/');
            } else if (!router.canGoBack()) {
              router.replace('/(tabs)/');
            } else {
              router.back();
            }
          } catch (error) {
            router.replace('/(tabs)/');
          }
        }}
        post={post}
        comments={comments[post.id] || []}
        onAddComment={(txt, parentId, isAnonymous) => {
          console.log('🔥 [CommentsScreen] Calling addComment with:', { postId: post.id, txt: txt.substring(0, 20), parentId, isAnonymous });
          return addComment(post.id, txt, parentId, isAnonymous);
        }}
        onLoadComments={loadComments}
        onDeleteComment={async (commentId) => {
          try {
            await apiService.deleteComment(post.id, commentId);
            await loadComments(post.id, true);
          } catch (error) {
          }
        }}
        currentUserId={user?.id}
        isLiked={Boolean(postInteractions[post.id]?.liked)}
        isBookmarked={Boolean(postInteractions[post.id]?.bookmarked)}
        hasVotedOnPoll={post.hasVotedOnPoll}
        userPollVote={post.userPollVote}
        allowImageClick={true}
        forceRefresh={fromNotification === 'true'}
        onLike={() => toggleLike(post.id)}
        onBookmark={() => toggleBookmark(post.id)}
        onPollVote={handlePollVote}
        onImagePress={(imageUri) => {
          setSelectedImageUri(imageUri);
          setShowImageViewer(true);
        }}
        onShare={async () => {
          try {
            const { UnifiedShareService } = await import('@/lib/UnifiedShareService');
            UnifiedShareService.showShareOptions(post.id, post.username, post.content);
          } catch (error) {
            console.error('Share error:', error);
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
            router.back();
            Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        }}
      />

      <ImageViewer
        visible={showImageViewer}
        imageUri={selectedImageUri}
        onClose={() => setShowImageViewer(false)}
      />
    </SafeAreaView>
  );
}