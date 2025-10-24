import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
  Share as RNShare,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, PenTool, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import CommentsModal from '../../components/Comments';
import { PostSkeleton, HomeSkeleton } from '../../components/skeletons';
import { useListen } from '../../context/ListenContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../lib/api';
// Real-time notification service removed - using clean FCM now
import { NormalizedPost } from '../../types';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useNotificationCount } from '../../context/NotificationCountContext';
import { trackScreenView, trackEvent } from '../../lib/firebase';
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadNotificationCount, markNotificationsAsRead } = useNotificationCount();
  const {
    posts,
    followingPosts,
    trendingPosts,
    postInteractions,
    pollVotes,
    comments,
    loading,
    refreshing,
    loadingMore,
    hasMorePosts,
    error,
    toggleLike,
    toggleBookmark,
    votePoll,
    addComment,
    onRefresh,
    loadComments,
    loadFollowingPosts,
    loadTrendingPosts,
    loadMorePosts,
    getPostById,
  } = useListen();
  const [activeTab, setActiveTab] = useState('Latest');
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NormalizedPost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Animation values for scroll-to-hide
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('home_screen');
  }, []);
  const tabs = ['Latest', 'Trending', 'Following'];
  // Notification count is now handled by NotificationCountContext
  // Real-time notifications removed - clean FCM handles this now
  // Notification counting is handled by NotificationCountContext
  // Handle scroll for hiding/showing header and FAB
  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;
    // Only trigger animation if scroll difference is significant
    if (Math.abs(scrollDiff) > 5) {
      if (scrollDiff > 0 && currentScrollY > 100) {
        // Scrolling down - hide header and FAB
        Animated.parallel([
          Animated.timing(headerTranslateY, {
            toValue: -120, // Hide header (topBar + tabs height)
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fabScale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (scrollDiff < 0 || currentScrollY < 50) {
        // Scrolling up or near top - show header and FAB
        Animated.parallel([
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fabScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    lastScrollY.current = currentScrollY;
  }, [headerTranslateY, fabScale]);
  const openComments = useCallback(
    async (post: NormalizedPost) => {
      setSelectedPost(post);
      setShowCommentsModal(true);
      await loadComments(post.id);
    },
    [loadComments]
  );
  const handleSharePost = useCallback(async () => {
    if (selectedPost) {
      try {
        const { ShareService } = await import('@/lib/shareService');
        await ShareService.quickShare(selectedPost.id, selectedPost.username, selectedPost.content);
      } catch (error) {
        }
    }
  }, [selectedPost]);
  const handleReportPost = useCallback(async () => {
    if (selectedPost) {
      try {
        await apiService.reportPost(selectedPost.id);
        Alert.alert('Post Reported', 'Thank you for your report. We will review this post.');
      } catch (error) {
        Alert.alert('Error', 'Failed to report post. Please try again.');
      }
    }
  }, [selectedPost]);
  const handleReportPostFromFeed = useCallback(async (postId: string) => {
    try {
      await apiService.reportPost(postId);
      Alert.alert('Post Reported', 'Thank you for your report. We will review this post.');
    } catch (error) {
      Alert.alert('Error', 'Failed to report post. Please try again.');
    }
  }, []);
  const handleDeletePostInModal = useCallback(async () => {
    if (selectedPost) {
      try {
        await apiService.deletePost(selectedPost.id);
        setShowCommentsModal(false);
        await onRefresh(); // Reload posts to remove deleted post
        Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
      } catch (error) {
        Alert.alert('Error', 'Failed to delete post. Please try again.');
      }
    }
  }, [selectedPost, onRefresh]);
  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await apiService.deletePost(postId);
      // Refresh posts after deletion
      await onRefresh();
      Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  }, [onRefresh]);
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      if (selectedPost) {
        await apiService.deleteComment(selectedPost.id, commentId);
        // Reload comments after deletion
        await loadComments(selectedPost.id);
        Alert.alert('Comment Deleted', 'Your comment has been deleted successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  }, [selectedPost, loadComments]);
  const currentComments = useMemo(() => {
    if (!selectedPost) return [];
    return comments[selectedPost.id] || [];
  }, [comments, selectedPost]);
  const displayedPosts = useMemo(() => {
    if (activeTab === 'Trending') {
      return trendingPosts;
    } else if (activeTab === 'Following') {
      // Show posts from followed users only
      return followingPosts;
    }
    // For "Latest" - return posts as they come from API (newest first)
    return posts;
  }, [activeTab, posts, followingPosts, trendingPosts]);
  const handleNotificationPress = () => {
    markNotificationsAsRead();
    router.push('/(tabs)/notifications');
  };
  const handleRefresh = useCallback(async () => {
    setRefreshKey(prev => prev + 1); // Increment refresh key to reset TruncatedText states
    await onRefresh();
  }, [onRefresh]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Track tab change event
    trackEvent('home_tab_change', {
      tab_name: tab.toLowerCase(),
      previous_tab: activeTab.toLowerCase()
    });
    // Reset header and FAB visibility when changing tabs
    Animated.parallel([
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    // Reset scroll position tracking
    lastScrollY.current = 0;
    if (tab === 'Following') {
      // Load following posts when Following tab is selected
      loadFollowingPosts();
    } else if (tab === 'Trending') {
      // Load trending posts when Trending tab is selected
      loadTrendingPosts();
    }
  }, [loadFollowingPosts, loadTrendingPosts, activeTab, headerTranslateY, fabScale]);
  const renderItem = ({ item }: { item: NormalizedPost }) => {
    const post = getPostById(item.id) || item;
    if (!post.id) return null;
    return (
      <PostCard
        post={post}
        isLiked={post.liked ?? Boolean(postInteractions[post.id]?.liked)}
        isBookmarked={post.bookmarked ?? Boolean(postInteractions[post.id]?.bookmarked)}
        hasVotedOnPoll={post.hasVotedOnPoll}
        userPollVote={post.userPollVote}
        onLike={() => toggleLike(post.id)}
        onComment={() => openComments(post)}
        onBookmark={() => toggleBookmark(post.id)}
        onPollVote={votePoll}
        onPress={() => router.push(`/post/${post.id}`)}
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
        onShare={handleSharePost}
        onReport={() => handleReportPostFromFeed(post.id)}
        onDelete={() => handleDeletePost(post.id)}
        currentUserId={user?.id}
        refreshKey={refreshKey}
      />
    );
  };
  const handleLoadMore = useCallback(() => {
    if (activeTab === 'Latest' && hasMorePosts && !loadingMore) {
      loadMorePosts();
    }
  }, [activeTab, hasMorePosts, loadingMore, loadMorePosts]);
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore]);
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={false} />
      
      {/* Always show header and UI elements */}
      {/* Animated Header Container */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
            {/* Top Bar */}
            <View style={[styles.topBar, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.profileButton, { borderColor: colors.primary }]}
                onPress={() => user?.id && router.push(`/profile/${user.id}`)}
              >
                <Image
                  source={user?.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/default-avatar.png')}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
              <Text style={[styles.logo, { color: colors.text }]}>Nexeed</Text>
              <View style={styles.rightActions}>
                <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colors.backgroundTertiary }]} onPress={handleNotificationPress}>
                  <Bell size={24} color={colors.text} />
                  {unreadNotificationCount > 0 && (
                    <View style={[styles.notificationBadge, { backgroundColor: colors.error, borderColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.notificationBadgeText, { color: '#ffffff' }]}>
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount.toString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.backgroundTertiary }]} onPress={() => router.push('/search')}>
                  <Search size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              <View style={styles.tabWrapper}>
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab;
                  return (
                    <TouchableOpacity key={tab} style={styles.tab} onPress={() => handleTabChange(tab)}>
                      <Text style={[styles.tabText, { color: colors.textMuted }, isActive && { color: colors.text }]}>{tab}</Text>
                      {isActive && (
                        <LinearGradient
                          colors={[colors.secondary, colors.primary]}
                          style={styles.activeTabIndicator}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
          
          {/* Content Area - Show loading skeleton only in content area */}
          {loading && posts.length === 0 ? (
            <View style={styles.contentContainer}>
              <HomeSkeleton />
            </View>
          ) : (
            <>
              {/* Feed */}
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : (
                <FlatList
                  data={displayedPosts}
                  renderItem={renderItem}
                  keyExtractor={item => item.id}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={handleRefresh}
                      colors={[colors.primary]}
                      tintColor={colors.primary}
                      title="Pull to refresh"
                      titleColor={colors.textSecondary}
                      progressViewOffset={120} // Position refresh control below header
                      progressBackgroundColor={colors.background}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80, paddingTop: 140 }} // Original padding to maintain content position
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.1}
                  ListFooterComponent={renderFooter}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  bounces={true}
                  alwaysBounceVertical={true}
                />
              )}
            </>
          )}
          
      {/* Animated Floating Action Button - Always show */}
      <Animated.View
        style={[
          styles.fab, 
          { 
            bottom: 80 + insets.bottom,
            transform: [{ scale: fabScale }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fabTouchable}
          onPress={() => router.push('/create-post')}
        >
          <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.fabGradient}>
            <PenTool size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={selectedPost}
        comments={currentComments}
        onAddComment={(txt: string, parentId?: string) => selectedPost && addComment(selectedPost.id, txt, parentId)}
        onLoadComments={loadComments}
        onDeleteComment={handleDeleteComment}
        currentUserId={user?.id}
        isLiked={Boolean(postInteractions[selectedPost?.id ?? '']?.liked)}
        isBookmarked={Boolean(postInteractions[selectedPost?.id ?? '']?.bookmarked)}
        hasVotedOnPoll={selectedPost?.hasVotedOnPoll}
        userPollVote={selectedPost?.userPollVote}
        onLike={() => selectedPost && toggleLike(selectedPost.id)}
        onBookmark={() => selectedPost && toggleBookmark(selectedPost.id)}
        onPollVote={votePoll}
        onShare={handleSharePost}
        onReport={handleReportPost}
        onDelete={handleDeletePostInModal}
      />
    </View>
  );
}
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: {
    flex: 1,
    paddingTop: 140, // Account for header height
    backgroundColor: colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
    paddingBottom: 15,
    backgroundColor: colors.background,
    ...Shadows.small,
  },
  profileButton: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.primary },
  profileImage: { width: '100%', height: '100%', borderRadius: ComponentStyles.avatar.medium / 2 },
  logo: { fontSize: FontSizes.xxxl, fontWeight: FontWeights.extrabold, color: colors.text, letterSpacing: 1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notificationButton: { padding: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: colors.backgroundTertiary, position: 'relative' },
  notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.backgroundSecondary },
  notificationBadgeText: { fontSize: 10, fontWeight: FontWeights.bold, textAlign: 'center' },
  searchButton: { padding: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: colors.backgroundTertiary },
  tabContainer: { backgroundColor: colors.background, paddingHorizontal: Spacing.sm, paddingTop: 4, paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabWrapper: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tab: { 
    paddingVertical: Spacing.sm, 
    paddingHorizontal: Spacing.xs, 
    position: 'relative',
    alignItems: 'center',
  },
  tabText: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: colors.textMuted },
  activeTabText: { color: colors.text },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  fab: { position: 'absolute', right: 16, bottom: 80, height: 52, width: 52, borderRadius: 26, overflow: 'hidden' },
  fabTouchable: { width: '100%', height: '100%' },
  fabGradient: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.error, textAlign: 'center', marginTop: Spacing.lg, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  loadingFooter: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
});