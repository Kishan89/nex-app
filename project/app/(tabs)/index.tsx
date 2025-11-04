import React, { useCallback, useMemo, useState, useEffect, useRef, startTransition } from 'react';
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
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolate, interpolateColor, runOnUI } from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PenTool, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import CommentsModal from '../../components/Comments';
import ProfileCompletionBanner from '../../components/ProfileCompletionBanner';
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
import { useThrottledCallback } from '../../hooks/useDebounce';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  
  // Refs for horizontal and vertical FlatLists
  const horizontalFlatListRef = useRef<FlatList>(null);
  const verticalFlatListRefs = useRef<{ [key: string]: FlatList | null }>({});
  
  // Animation values for scroll-to-hide
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const headerTranslateY = useRef(new RNAnimated.Value(0)).current;
  const fabScale = useRef(new RNAnimated.Value(1)).current;
  const lastScrollY = useRef(0);
  
  // Animation value for tab indicator - using reanimated for 60fps
  const tabIndicatorPosition = useSharedValue(0);
  
  // Current tab index
  const currentTabIndex = useRef(0);
  
  // Tabs array
  const tabs = ['Latest', 'Trending', 'Following'];
  const tabsRef = useRef(tabs);
  
  // Track screen view and prefetch tab data when component mounts
  useEffect(() => {
    trackScreenView('home_screen');
    
    // INSTANT prefetch - start immediately for fastest tab switching
    const prefetchTimer = setTimeout(() => {
      if (trendingPosts.length === 0) {
        loadTrendingPosts();
      }
      if (followingPosts.length === 0) {
        loadFollowingPosts();
      }
    }, 100); // Start prefetch after just 100ms
    
    return () => clearTimeout(prefetchTimer);
  }, []); // Empty dependency array to run only once
  // Notification count is now handled by NotificationCountContext
  // Real-time notifications removed - clean FCM handles this now
  // Notification counting is handled by NotificationCountContext
  // Handle scroll - optimized to prevent flicker
  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;
    
    // Increase threshold to prevent flicker
    if (Math.abs(scrollDiff) > 15) {
      if (scrollDiff > 0 && currentScrollY > 100) {
        // Scrolling down
        RNAnimated.timing(headerTranslateY, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }).start();
        RNAnimated.timing(fabScale, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      } else if (scrollDiff < -10 || currentScrollY < 50) {
        // Scrolling up
        RNAnimated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
        RNAnimated.timing(fabScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
      lastScrollY.current = currentScrollY;
    }
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
        const { UnifiedShareService } = await import('@/lib/UnifiedShareService');
        await UnifiedShareService.quickShare(selectedPost.id, selectedPost.username, selectedPost.content);
      } catch (error) {
        console.error('Share error:', error);
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
  // Throttle navigation to prevent double-clicks
  const handleNotificationPress = useThrottledCallback(() => {
    markNotificationsAsRead();
    router.push('/(tabs)/notifications');
  }, 1000);
  
  const handleProfilePress = useThrottledCallback(() => {
    if (user?.id) {
      router.push(`/profile/${user.id}`);
    }
  }, 1000);
  
  const handleCreatePostPress = useThrottledCallback(() => {
    router.push('/create-post');
  }, 1000);
  const handleRefresh = useCallback(async () => {
    setRefreshKey(prev => prev + 1); // Increment refresh key to reset TruncatedText states
    await onRefresh();
  }, [onRefresh]);

  const handleTabChange = useCallback((tab: string, tabIndex?: number) => {
    const index = tabIndex !== undefined ? tabIndex : tabs.indexOf(tab);
    
    // INSTANT UI update - no blocking
    setActiveTab(tab);
    currentTabIndex.current = index;
    
    // Scroll horizontal FlatList to the selected tab - INSTANT (no animation)
    horizontalFlatListRef.current?.scrollToIndex({
      index,
      animated: false, // No animation for instant switching
    });
    
    // Load data in background - non-blocking
    setTimeout(() => {
      if (tab === 'Following' && followingPosts.length === 0) {
        loadFollowingPosts();
      } else if (tab === 'Trending' && trendingPosts.length === 0) {
        loadTrendingPosts();
      }
      
      // Track tab change event (non-blocking)
      trackEvent('home_tab_change', {
        tab_name: tab.toLowerCase(),
        previous_tab: activeTab.toLowerCase()
      });
    }, 0);
  }, [loadFollowingPosts, loadTrendingPosts, activeTab, tabs, followingPosts.length, trendingPosts.length]);
  // Animated style for tab indicator - runs on UI thread for 60fps
  const tabIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{
        translateX: interpolate(
          tabIndicatorPosition.value,
          [0, 1, 2],
          [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
          Extrapolate.CLAMP
        )
      }]
    };
  });

  // Handle horizontal scroll for tab indicator - INSTANT response with reanimated
  const handleHorizontalScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const normalizedPosition = offsetX / SCREEN_WIDTH;
    
    // INSTANT indicator position update - runs on UI thread
    tabIndicatorPosition.value = normalizedPosition;
    
    // INSTANT tab state update
    const activeIndex = Math.round(normalizedPosition);
    if (activeIndex !== currentTabIndex.current && activeIndex >= 0 && activeIndex < tabs.length) {
      currentTabIndex.current = activeIndex;
      setActiveTab(tabs[activeIndex]);
    }
  }, [tabIndicatorPosition, tabs]);
  
  // Handle scroll end to ensure data is loaded and state is synced
  const handleHorizontalScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    // Update tab state and load data when scroll completes
    if (index >= 0 && index < tabs.length) {
      const tab = tabs[index];
      
      // Update active tab state (for non-visual logic like data loading)
      if (currentTabIndex.current !== index) {
        currentTabIndex.current = index;
        setActiveTab(tab);
      }
      
      // Load data in background - only if not already cached
      setTimeout(() => {
        if (tab === 'Following' && followingPosts.length === 0) {
          loadFollowingPosts();
        } else if (tab === 'Trending' && trendingPosts.length === 0) {
          loadTrendingPosts();
        }
      }, 0);
    }
  }, [tabs, loadFollowingPosts, loadTrendingPosts, followingPosts.length, trendingPosts.length]);
  
  const renderPostItem = useCallback(({ item }: { item: NormalizedPost }) => {
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
        onPress={() => router.push(`/comments/${post.id}`)}
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
  }, [getPostById, postInteractions, toggleLike, openComments, toggleBookmark, votePoll, user?.id, refreshKey]);
  
  // Render footer for loading more posts - ONLY show loading indicator
  const renderFooter = useCallback(() => {
    if (activeTab !== 'Latest') return null;
    
    // Only show loading indicator when actually loading
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more posts...</Text>
        </View>
      );
    }
    
    return null;
  }, [activeTab, loadingMore, colors.primary, colors.textSecondary]);
  
  // Render vertical FlatList for each tab
  const renderTabContent = useCallback(({ item, index }: { item: string; index: number }) => {
    let tabPosts: NormalizedPost[] = [];
    
    if (item === 'Latest') {
      tabPosts = posts;
    } else if (item === 'Trending') {
      tabPosts = trendingPosts;
    } else if (item === 'Following') {
      tabPosts = followingPosts;
    }
    
    // NO OPACITY ANIMATION - instant visibility for fast switching
    return (
      <View style={[styles.tabContentContainer, { width: SCREEN_WIDTH }]}>
        <FlatList
          ref={(ref) => { verticalFlatListRefs.current[item] = ref; }}
          data={tabPosts}
          renderItem={renderPostItem}
          keyExtractor={(post) => `${item}-${post.id}`}
          ListHeaderComponent={
            item === 'Latest' && user && (!user.avatar_url || !user.bio || !user.name || !user.banner_url) ? (
              <ProfileCompletionBanner
                userId={user.id}
                hasAvatar={!!user.avatar_url}
                hasBio={!!user.bio}
                hasName={!!user.name}
                hasBanner={!!user.banner_url}
                username={user.username || ''}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              title="Pull to refresh"
              titleColor={colors.textSecondary}
              progressViewOffset={120}
              progressBackgroundColor={colors.background}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 100 }}
          onEndReached={() => {
            if (item === 'Latest' && hasMorePosts && !loadingMore) {
              loadMorePosts();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={item === 'Latest' ? renderFooter : null}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          bounces={true}
          alwaysBounceVertical={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          initialNumToRender={5}
          windowSize={10}
        />
      </View>
    );
  }, [posts, trendingPosts, followingPosts, renderPostItem, refreshing, handleRefresh, colors.primary, colors.textSecondary, colors.background, hasMorePosts, loadingMore, loadMorePosts, renderFooter, handleScroll]);
  const handleLoadMore = useCallback(() => {
    if (activeTab === 'Latest' && hasMorePosts && !loadingMore) {
      loadMorePosts();
    }
  }, [activeTab, hasMorePosts, loadingMore, loadMorePosts]);
  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* StatusBar is handled globally in main app layout */}
      
      {/* Always show header and UI elements */}
      {/* Animated Header Container */}
      <RNAnimated.View 
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
                onPress={handleProfilePress}
              >
                <Image
                  source={user?.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/default-avatar.png')}
                  style={styles.profileImage}
                />
                {/* Profile Incomplete Indicator */}
                {user && (!user.avatar_url || !user.bio) && (
                  <View style={[styles.profileIncompleteBadge, { backgroundColor: '#FFD700', borderColor: colors.background }]}>
                    <Text style={styles.profileIncompleteBadgeText}>!</Text>
                  </View>
                )}
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
              </View>
            </View>
            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              <View style={styles.tabWrapper}>
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab;
                  return (
                    <TouchableOpacity key={tab} style={styles.tab} onPress={() => handleTabChange(tab, index)}>
                      <Text style={[styles.tabText, isActive && { color: colors.primary, fontWeight: FontWeights.bold }]}>{tab}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Animated Gradient Indicator - PERFECTLY SYNCED with scroll */}
              <Animated.View
                style={[
                  styles.tabIndicator,
                  tabIndicatorStyle,
                  {
                    width: SCREEN_WIDTH / 3 * 0.6,
                  },
                ]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicatorGradient}
                />
              </Animated.View>
            </View>
          </RNAnimated.View>
          
          {/* Content Area - Show loading skeleton only in content area */}
          {loading && posts.length === 0 ? (
            <View style={styles.contentContainer}>
              <HomeSkeleton />
            </View>
          ) : error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : (
            <FlatList
              ref={horizontalFlatListRef}
              data={tabs}
              renderItem={renderTabContent}
              keyExtractor={(item) => item}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleHorizontalScroll}
              onMomentumScrollEnd={handleHorizontalScrollEnd}
              scrollEventThrottle={16}
              decelerationRate={0.98}
              bounces={false}
              removeClippedSubviews={false}
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              disableIntervalMomentum={true}
              getItemLayout={(data, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
          )}
          
      {/* Animated Floating Action Button - Always show */}
      <RNAnimated.View
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
          onPress={handleCreatePostPress}
        >
          <View style={styles.fabContent}>
            <PenTool size={24} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </RNAnimated.View>
      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={selectedPost}
        comments={currentComments}
        onAddComment={(txt: string, parentId?: string, isAnonymous?: boolean) => selectedPost && addComment(selectedPost.id, txt, parentId, isAnonymous)}
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
    paddingTop: 20, // Minimal padding for tighter spacing
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
    paddingTop: 2, // Minimal top padding for consistent spacing
    paddingBottom: 4, // Minimal bottom padding for consistent spacing
    backgroundColor: colors.background,
    ...Shadows.small,
  },
  profileButton: { width: 50, height: 50, borderRadius: 25, overflow: 'visible', borderWidth: 1.5, borderColor: colors.primary, position: 'relative' },
  profileImage: { width: '100%', height: '100%', borderRadius: ComponentStyles.avatar.medium / 2 },
  profileIncompleteBadge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  profileIncompleteBadgeText: { 
    fontSize: 12, 
    fontWeight: FontWeights.extrabold, 
    color: '#000000',
  },
  logo: { fontSize: FontSizes.xxxl, fontWeight: FontWeights.extrabold, color: colors.text, letterSpacing: 1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notificationButton: { padding: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: colors.backgroundTertiary, position: 'relative' },
  notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.backgroundSecondary },
  notificationBadgeText: { fontSize: 10, fontWeight: FontWeights.bold, textAlign: 'center' },
  tabContainer: { 
    backgroundColor: colors.background, 
    paddingHorizontal: Spacing.sm, 
    paddingTop: 2, 
    paddingBottom: 2, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
  },
  tabWrapper: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center',
    position: 'relative',
  },
  tab: { 
    flex: 1,
    paddingVertical: Spacing.sm, 
    paddingHorizontal: Spacing.xs, 
    alignItems: 'center',
  },
  tabText: { fontSize: 17, fontWeight: FontWeights.semibold, color: colors.textMuted },
  activeTabText: { color: colors.text },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: SCREEN_WIDTH / 3 * 0.2, // 20% offset for centering
    height: 3.5, // Slightly thicker for better visibility
    borderRadius: 2,
    overflow: 'hidden',
  },
  tabIndicatorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fab: { position: 'absolute', right: 16, bottom: 80, height: 52, width: 52, borderRadius: 26, overflow: 'hidden' },
  fabTouchable: { width: '100%', height: '100%' },
  fabContent: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#004aad' },
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