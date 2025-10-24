import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Heart, MessageCircle, Bookmark, Edit, ArrowLeft, PenTool, UserPlus, UserMinus } from 'lucide-react-native';
import PostCard from '../../components/PostCard';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import apiService, { ProfileData as ApiProfileData } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileStore } from '@/store/profileStore';
import { followSync } from '@/store/followSync';
import { useAuth } from '@/context/AuthContext';
import { ProfileSkeleton, PostSkeleton } from '../../components/skeletons';
import { useListen } from '@/context/ListenContext';
import { NormalizedPost } from '@/types';
import CommentsModal from '../../components/Comments';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import XPRulesModal from '@/components/XPRulesModal';
export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { id: routeId } = useLocalSearchParams();
  const userId = Array.isArray(routeId) ? routeId[0] : routeId || user?.id;
  const { posts, postInteractions, refreshing, onRefresh, toggleLike, toggleBookmark, votePoll, comments, addComment, loadComments } = useListen();
  const [profile, setProfile] = useState<ApiProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Posts' | 'Bookmarks'>('Posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showXPRules, setShowXPRules] = useState(false);
  const [userXPRank, setUserXPRank] = useState<number | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NormalizedPost | null>(null);
  const isMyProfile = user?.id === userId;
  // Function to get medal emoji for top 3 XP users
  const getXPMedal = (rank: number | null) => {
    if (!rank) return null;
    switch (rank) {
      case 1: return '👑'; // Gold crown for #1
      case 2: return '🥈'; // Silver medal for #2
      case 3: return '🥉'; // Bronze medal for #3
      default: return null;
    }
  };
  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setError('User ID not provided.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cachedProfile = await profileStore.getProfile(userId, forceRefresh, user?.id);
      if (cachedProfile) {
        setProfile(cachedProfile.profile);
        setUserXPRank(cachedProfile.xpRank);
        if (!isMyProfile) {
          setIsFollowing(cachedProfile.isFollowing);
        }
      } else {
        setError('Profile not found.');
      }
    } catch (err: any) {
      if (err.message?.includes('User not found') || err.status === 404) {
        setError('User not found. This user may not exist or may have been deleted.');
      } else {
        setError('Failed to load profile data. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, isMyProfile]);
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);
  // Listen for follow state changes from other screens
  useEffect(() => {
    if (!userId || isMyProfile) return;
    const unsubscribe = followSync.subscribe((syncUserId, syncIsFollowing) => {
      if (String(syncUserId) === String(userId)) {
        setIsFollowing(syncIsFollowing);
      }
    });
    // Check for existing follow state in sync
    const existingState = followSync.getFollowState(String(userId));
    if (existingState !== null) {
      setIsFollowing(existingState);
    }
    return unsubscribe;
  }, [userId, isMyProfile]);

  const onCombinedRefresh = useCallback(() => {
    onRefresh();
    fetchProfileData(true); // Force refresh on manual pull
  }, [onRefresh, fetchProfileData]);

  // Remove frequent auto-refresh to improve performance
  // Only refresh on manual pull-to-refresh or when returning from background
  // Handle follow/unfollow with INSTANT UI updates
  const handleFollowToggle = useCallback(async () => {
    if (!userId || followLoading) {
      console.log(`⚠️ Follow toggle blocked: userId=${userId}, followLoading=${followLoading}`);
      return;
    }

    try {
      setFollowLoading(true);
      console.log(`🚀 Starting follow toggle: userId=${userId}, currentState=${isFollowing}`);

      // 🚀 INSTANT FOLLOW: UI updates immediately, API syncs in background
      const { followOptimizations } = await import('../../lib/followOptimizations');
      const result = await followOptimizations.optimisticFollowToggle(String(userId), isFollowing);

      console.log(`📋 Follow toggle result:`, result);

      if (result.success) {
        // ⚡ INSTANT UI UPDATE: Update local state immediately
        setIsFollowing(result.isFollowing);

        // 🎉 SUCCESS FEEDBACK: Show success alert
        const message = result.isFollowing ? 'Following!' : 'Unfollowed!';
        console.log(`✅ ${message} User: ${userId}`);
        
        // Show success alert for follow/unfollow
        Alert.alert('Success', message);

      } else {
        // Handle failure case
        console.warn(`⚠️ Follow toggle failed:`, result.error);
        
        // Don't show alert for "operation in progress" - it's just protection
        if (result.error !== 'Operation already in progress') {
          Alert.alert('Info', result.error || 'Please try again');
        }
      }

    } catch (error: any) {
      console.error('❌ Follow toggle failed:', error);
      Alert.alert('Error', error.message || 'Failed to update follow status. Please try again.');
    } finally {
      // ⚡ INSTANT LOADING STATE: Remove loading immediately
      setFollowLoading(false);
    }
  }, [userId, isFollowing, followLoading]);

  // Handle start chat - INSTANT NAVIGATION
  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = useCallback(async () => {
    if (!userId || chatLoading) return;
    try {
      setChatLoading(true);
      const chat = await apiService.createChatWithUser(String(userId));
      const chatId = (chat as any)?.id || (chat as any)?.data?.id;
      if (chatId) {
        router.push(`/chat/${chatId}`);
      } else {
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }, [userId, chatLoading]);
  // Optimized post filtering with early returns
  const userPosts = useMemo(() => {
    if (!profile?.username) return [];
    return posts.filter(p => p.username === profile.username);
  }, [posts, profile?.username]);
  const bookmarkedPosts = useMemo(() => {
    if (!isMyProfile) return [];
    return posts.filter(p => postInteractions[p.id]?.bookmarked);
  }, [posts, postInteractions, isMyProfile]);
  const displayedPosts = useMemo(() => {
    if (!isMyProfile) return userPosts;
    return activeTab === 'Posts' ? userPosts : bookmarkedPosts;
  }, [isMyProfile, activeTab, userPosts, bookmarkedPosts]);
  const formatRelativeTime = useCallback((raw?: string) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^just now$/i.test(s)) return 'just now';
    if (/ago$/i.test(s)) return s.replace(/\s+ago$/i, '');
    const shortRel = s.match(/^(\d+)(s|m|h|d)$/i);
    if (shortRel) return `${shortRel[1]}${shortRel[2].toLowerCase()}`;
    const verboseRel = s.match(/^(\d+)\s*(second|sec|s|minute|min|m|hour|hr|h|day|d)/i);
    if (verboseRel) {
      const num = verboseRel[1];
      const unit = verboseRel[2].toLowerCase();
      if (/^(second|sec|s)$/.test(unit)) return `${num}s`;
      if (/^(minute|min|m)$/.test(unit)) return `${num}m`;
      if (/^(hour|hr|h)$/.test(unit)) return `${num}h`;
      if (/^(day|d)/.test(unit)) return `${num}d`;
    }
    try {
      const postDate = /^\d+$/.test(s) ? new Date(s.length === 10 ? Number(s) * 1000 : Number(s)) : new Date(s);
      if (isNaN(postDate.getTime())) return s;
      const diffSec = Math.floor((new Date().getTime() - postDate.getTime()) / 1000);
      if (diffSec < 5) return 'just now';
      if (diffSec < 60) return `${diffSec}s`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
      return postDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return s;
    }
  }, []);
  // Handle post press - navigate to post detail
  const handlePostPress = useCallback((post: NormalizedPost) => {
    router.push(`/post/${post.id}`);
  }, []);
  // Handle comment button press - open comments modal
  const handleCommentPress = useCallback(async (post: NormalizedPost) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    await loadComments(post.id);
  }, [loadComments]);
  const handleSharePost = useCallback(async () => {
    if (selectedPost) {
      try {
        const { ShareService } = await import('@/lib/shareService');
        await ShareService.quickShare(selectedPost.id, selectedPost.username, selectedPost.content);
      } catch (error) {
        }
    }
  }, [selectedPost]);
  const handleReportPost = useCallback(async (postId?: string) => {
    const targetPostId = postId || selectedPost?.id;
    if (targetPostId) {
      try {
        await apiService.reportPost(targetPostId);
        Alert.alert('Post Reported', 'Thank you for your report. We will review this post.');
      } catch (error) {
        Alert.alert('Error', 'Failed to report post. Please try again.');
      }
    }
  }, [selectedPost]);
  const handleDeletePostInModal = useCallback(async () => {
    if (selectedPost) {
      try {
        await apiService.deletePost(selectedPost.id);
        setShowCommentsModal(false);
        // Refresh profile data to remove deleted post
        await fetchProfileData();
        Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
      } catch (error) {
        Alert.alert('Error', 'Failed to delete post. Please try again.');
      }
    }
  }, [selectedPost, fetchProfileData]);
  // Get current comments for selected post
  const currentComments = useMemo(() => {
    if (!selectedPost) return [];
    return comments[selectedPost.id] || [];
  }, [comments, selectedPost]);
  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await apiService.deletePost(postId);
      // Refresh profile data after deletion
      onRefresh();
      Alert.alert('Post Deleted', 'Your post has been deleted successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    }
  }, [onRefresh]);
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      if (selectedPost) {
        await apiService.deleteComment(selectedPost.id, commentId);
        await loadComments(selectedPost.id);
        Alert.alert('Comment Deleted', 'Your comment has been deleted successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  }, [selectedPost, loadComments]);
  const handlePollVote = useCallback(async (pollId: string, optionId: string) => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'Please log in to vote on polls');
        return;
      }
      // Use global votePoll function for synchronized voting across screens
      await votePoll(pollId, optionId);
      } catch (error) {
      Alert.alert('Error', 'Failed to vote on poll. Please try again.');
    }
  }, [user?.id, votePoll]);
  const renderPost = useCallback(
    (post: NormalizedPost) => (
      <PostCard
        key={post.id}
        post={post}
        isLiked={post.liked ?? Boolean(postInteractions[post.id]?.liked)}
        isBookmarked={post.bookmarked ?? Boolean(postInteractions[post.id]?.bookmarked)}
        hasVotedOnPoll={post.hasVotedOnPoll}
        userPollVote={post.userPollVote}
        onLike={() => toggleLike(post.id)}
        onComment={() => handleCommentPress(post)}
        onBookmark={() => toggleBookmark(post.id)}
        onPollVote={handlePollVote}
        onPress={() => handlePostPress(post)}
        onUserPress={() => {
          if (post.userId && post.userId !== userId) {
            router.push(`/profile/${post.userId}`);
          }
        }}
        onShare={handleSharePost}
        onReport={() => handleReportPost(post.id)}
        onDelete={() => handleDeletePost(post.id)}
        currentUserId={user?.id}
      />
    ),
    [postInteractions, toggleLike, toggleBookmark, handlePostPress, handleCommentPress, handleSharePost, handleReportPost, handleDeletePost, user?.id, userId]
  );
  if (loading) return <ProfileSkeleton />;
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);
  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Profile not found.'}</Text>
        <TouchableOpacity onPress={onCombinedRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const bannerUri = profile.banner_url ?? 'https://via.placeholder.com/600x200';
  const avatarUri = profile.avatar_url ?? 'https://via.placeholder.com/150';
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onCombinedRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/chats');
            }
          }}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{profile.username}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.bannerSection}>
          <Image source={{ uri: bannerUri }} style={styles.banner} />
        </View>
        {/* Profile Image Section - Separate from banner */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={avatarUri && avatarUri !== 'https://via.placeholder.com/150' ? { uri: avatarUri } : require('@/assets/images/default-avatar.png')} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
        </View>
        <View style={styles.profileSection}>
          {/* Profile Header with Action Buttons */}
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              {/* Username and XP Section - Inline */}
              <View style={styles.usernameXpRow}>
                <Text style={styles.userName}>{profile.username}</Text>
                {getXPMedal(userXPRank) && (
                  <Text style={styles.xpMedal}>{getXPMedal(userXPRank)}</Text>
                )}
                <View style={styles.xpBadge}>
                  <Text style={styles.xpText}>+{profile.xp ?? 0} XP</Text>
                  <TouchableOpacity style={styles.infoButton} onPress={() => setShowXPRules(true)}>
                    <Info size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {isMyProfile ? (
                <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
                  <Edit size={20} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.followButton, isFollowing && styles.followingButton]} 
                    onPress={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.background} />
                    ) : (
                      <>
                        {isFollowing ? (
                          <UserMinus size={20} color={colors.text} />
                        ) : (
                          <UserPlus size={20} color={colors.background} />
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chatButton, { backgroundColor: colors.backgroundTertiary, borderColor: colors.primary }]} onPress={handleStartChat} disabled={chatLoading}>
                    {chatLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MessageCircle size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          {/* Bio Section */}
          <Text style={styles.bioText}>{profile.bio ?? 'No bio yet.'}</Text>
          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.followers_count ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.following_count ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>
        {/* Tab Container - Show for own profile only */}
        {isMyProfile && (
          <View style={styles.tabContainer}>
            {['Posts', 'Bookmarks'].map(tab => (
              <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab as 'Posts' | 'Bookmarks')}>
                <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === tab && { color: colors.primary }]}>{tab}</Text>
                {activeTab === tab && <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* Posts Section Header - Show for other users */}
        {!isMyProfile && (
          <View style={styles.postsHeaderContainer}>
            <Text style={styles.postsHeaderText}>Posts</Text>
            <View style={styles.postsHeaderUnderline} />
          </View>
        )}
        <View style={styles.contentSection}>
          {displayedPosts.length > 0 ? displayedPosts.map(renderPost) : <Text style={styles.emptyText}>No posts found.</Text>}
        </View>
      </ScrollView>
      {isMyProfile && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post')}>
          <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.fabGradient}>
            <PenTool size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      {/* XP Rules Modal */}
      <XPRulesModal 
        visible={showXPRules} 
        onClose={() => setShowXPRules(false)} 
      />
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
        onPollVote={handlePollVote}
        onShare={handleSharePost}
        onReport={handleReportPost}
        onDelete={handleDeletePostInModal}
      />
    </SafeAreaView>
  );
}
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  scrollContainer: { 
    flex: 1,
    backgroundColor: colors.background
  },
  headerBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.sm, 
    backgroundColor: colors.background,
    ...Shadows.small,
  },
  backButton: { 
    width: ComponentStyles.avatar.medium, 
    height: ComponentStyles.avatar.medium, 
    borderRadius: ComponentStyles.avatar.medium / 2, 
    backgroundColor: colors.backgroundTertiary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: FontSizes.xl, 
    fontWeight: FontWeights.bold, 
    color: colors.text 
  },
  bannerSection: {
    position: 'relative',
    backgroundColor: colors.background,
    overflow: 'visible', // Ensure profile image and action buttons are not clipped
    zIndex: 1, // Lower z-index than action buttons
  },
  banner: { 
    width: '100%', 
    height: 160, // Increased from 120 to ensure profile image fits
    backgroundColor: colors.backgroundTertiary,
  },
  profileImageSection: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    marginTop: -50, // Increased negative margin to move component up
    marginBottom: Spacing.xs, // Reduced margin for tighter spacing
    zIndex: 2,
  },
  profileImageContainer: {
    zIndex: 2,
    width: ComponentStyles.avatar.xlarge + 8,
    height: ComponentStyles.avatar.xlarge + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: { 
    paddingHorizontal: Spacing.md, 
    marginTop: 0, // Remove top margin to bring content closer
    backgroundColor: colors.background
  },
  profileHeader: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between', 
    marginBottom: Spacing.xs, // Minimal margin to bring bio very close
    minHeight: 50, // Ensure enough height for proper alignment
  },
  profileInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  actionButtonsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: -30, // Move buttons up more to overlap with banner (better overlap)
    zIndex: 3, // Ensure buttons appear above banner
  },
  usernameXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2, // Minimal margin between name and bio
  },
  profileImage: { 
    width: ComponentStyles.avatar.xlarge, 
    height: ComponentStyles.avatar.xlarge, 
    borderRadius: ComponentStyles.avatar.xlarge / 2, 
    borderWidth: 3, 
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
    // Ensure image is properly centered and visible
    alignSelf: 'center',
  },
  editButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: colors.backgroundTertiary, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  nameXpContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  xpBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.backgroundTertiary, 
    paddingHorizontal: Spacing.sm, 
    paddingVertical: 4, 
    borderRadius: BorderRadius.lg, 
    marginLeft: Spacing.sm,
    height: 28, // Fixed height for better alignment with username
  },
  xpText: { 
    fontSize: FontSizes.xs, 
    color: colors.primary, 
    fontWeight: FontWeights.semibold, 
    marginRight: Spacing.xs 
  },
  infoButton: { 
    padding: 2 
  },
  userName: { 
    fontSize: FontSizes.xxl, 
    fontWeight: FontWeights.bold, 
    color: colors.text,
  },
  bioText: { 
    fontSize: FontSizes.sm, 
    color: colors.textSecondary, 
    marginBottom: Spacing.lg,
    marginTop: 0, // No top margin for minimal spacing with username
    lineHeight: 20,
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    backgroundColor: colors.backgroundTertiary, 
    borderRadius: BorderRadius.lg, 
    paddingVertical: Spacing.md,
    marginBottom: 0, 
    ...Shadows.small,
  },
  statItem: { 
    alignItems: 'center' 
  },
  statNumber: { 
    fontSize: FontSizes.lg, 
    fontWeight: FontWeights.bold, 
    color: colors.text 
  },
  statLabel: { 
    fontSize: FontSizes.xs, 
    color: colors.textMuted,
    marginTop: 2,
  },
  tabContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: Spacing.sm, 
    backgroundColor: colors.background,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs, 
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { 
    flex: 1,
    paddingBottom: Spacing.sm, 
    alignItems: 'center', 
    position: 'relative',
    paddingHorizontal: Spacing.md,
  },
  tabText: { 
    fontSize: FontSizes.lg, 
    color: colors.textMuted, 
    fontWeight: FontWeights.bold 
  },
  activeTabText: { 
    color: colors.primary 
  },
  postDivider: {
    height: 1,
    backgroundColor: colors.border, 
    marginVertical: Spacing.sm,
  },
  activeTabIndicator: { 
    position: 'absolute', 
    bottom: 0, 
    left: '30%', 
    right: '30%', 
    height: 2, 
    borderRadius: 1 
  },
  postsHeaderContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md, // Reduced spacing after Posts header
    backgroundColor: colors.background,
  },
  postsHeaderText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  postsHeaderUnderline: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginTop: Spacing.xs,
  },
  contentSection: { 
    paddingBottom: 80,
    backgroundColor: colors.background,
  },
  postCard: { 
    padding: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 1,
    ...Shadows.small,
  },
  postHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.sm 
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  userAvatar: { 
    width: ComponentStyles.avatar.medium, 
    height: ComponentStyles.avatar.medium, 
    borderRadius: ComponentStyles.avatar.medium / 2, 
    marginRight: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
  },
  postUsername: { 
    fontSize: FontSizes.sm, 
    fontWeight: FontWeights.semibold, 
    color: colors.text 
  },
  timeText: { 
    fontSize: FontSizes.xs, 
    color: colors.textMuted,
    marginTop: 2,
  },
  postContent: { 
    fontSize: FontSizes.sm, 
    color: colors.textSecondary, 
    marginBottom: Spacing.sm, 
    lineHeight: 20 
  },
  postImage: { 
    width: '100%', 
    height: 180, 
    borderRadius: BorderRadius.lg, 
    backgroundColor: colors.backgroundTertiary, 
    marginBottom: Spacing.sm 
  },
  postActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingTop: Spacing.sm 
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.round,
    minWidth: 60,
    justifyContent: 'center',
  },
  actionText: { 
    marginLeft: Spacing.xs, 
    fontSize: FontSizes.xs, 
    color: colors.textMuted,
    fontWeight: FontWeights.semibold,
  },
  fab: { 
    position: 'absolute', 
    bottom: 20, 
    right: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28,
    // Removed shadow to prevent octagon-like appearance
  },
  fabGradient: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: { 
    color: colors.error, 
    textAlign: 'center', 
    marginBottom: Spacing.sm,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  retryButton: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Spacing.sm, 
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  retryButtonText: { 
    color: colors.background, 
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.md,
  },
  emptyText: { 
    color: colors.textMuted, 
    textAlign: 'center', 
    marginTop: Spacing.lg,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  followButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  // Simple username with medal
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  xpMedal: {
    fontSize: FontSizes.md,
  },
});