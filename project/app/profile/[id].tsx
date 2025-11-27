import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
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
import { Info, Heart, MessageCircle, Bookmark, Edit, ArrowLeft, PenTool, UserPlus, UserMinus, UserCircle, X, Trophy } from 'lucide-react-native';
import PostCard from '../../components/PostCard';
import ProfileCompletionBanner from '../../components/ProfileCompletionBanner';
import ImageViewer from '@/components/ImageViewer';
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

const DEFAULT_BANNER = require('../../assets/images/banner-image.png');
import { useTheme } from '@/context/ThemeContext';
import XPRulesModal from '@/components/XPRulesModal';
import { useThrottledCallback } from '@/hooks/useDebounce';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { id: routeId } = useLocalSearchParams();
  const userId = Array.isArray(routeId) ? routeId[0] : routeId || user?.id;
  const { posts, postInteractions, refreshing, onRefresh, toggleLike, toggleBookmark, votePoll, comments, addComment, loadComments } = useListen();
  const [profile, setProfile] = useState<ApiProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<NormalizedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Posts' | 'Bookmarks'>('Posts');
  const [postsPage, setPostsPage] = useState(1);
  const [hasMoreUserPosts, setHasMoreUserPosts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showXPRules, setShowXPRules] = useState(false);
  const [userXPRank, setUserXPRank] = useState<number | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NormalizedPost | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState('');
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

  const fetchUserPosts = useCallback(async (page = 1, append = false) => {
    if (!userId || isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;
    setLoadingPosts(true);
    try {
      const fetchedPosts = await apiService.getUserPosts(userId, page, 20);
      const normalized = fetchedPosts
        // Filter out anonymous posts - they should not appear on user profiles
        .filter((p: any) => !p.isAnonymous)
        .map((p: any) => {
          // Sync with global post interactions
          const globalInteraction = postInteractions[p.id];
          return {
            ...p,
            liked: globalInteraction?.liked ?? p.liked ?? false,
            bookmarked: globalInteraction?.bookmarked ?? p.bookmarked ?? false,
            hasVotedOnPoll: p.hasVotedOnPoll ?? false,
            userPollVote: p.userPollVote
          };
        });

      setHasMoreUserPosts(normalized.length === 20);

      if (append) {
        setUserPosts(prev => [...prev, ...normalized]);
      } else {
        setUserPosts(normalized);
      }
    } catch (err) {
      console.error('Error fetching user posts:', err);
    } finally {
      setLoadingPosts(false);
      isLoadingMoreRef.current = false;
    }
  }, [userId, postInteractions]);

  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setError('User ID not provided.');
      setLoading(false);
      return;
    }
    setError(null);
    if (forceRefresh) setLoading(true);
    try {
      const cachedProfile = await profileStore.getProfile(userId, forceRefresh, user?.id);
      if (cachedProfile) {
        setProfile(cachedProfile.profile);
        setUserXPRank(cachedProfile.xpRank);
        if (!isMyProfile) {
          setIsFollowing(cachedProfile.isFollowing);
        }
        // Only fetch posts if not already loaded or force refresh
        if (forceRefresh || userPosts.length === 0) {
          await fetchUserPosts(1, false);
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
  }, [userId, isMyProfile, fetchUserPosts, userPosts.length]);

  useEffect(() => {
    fetchProfileData();
  }, [userId]); // Only depend on userId, not the entire function

  // Real-time sync with global posts - immediate updates for likes
  useEffect(() => {
    if (userPosts.length > 0) {
      setUserPosts(prevPosts => 
        prevPosts.map(post => {
          const globalPost = posts.find(p => p.id === post.id);
          const globalInteraction = postInteractions[post.id];
          
          if (globalPost || globalInteraction) {
            return {
              ...post,
              liked: globalInteraction?.liked ?? globalPost?.liked ?? post.liked,
              bookmarked: globalInteraction?.bookmarked ?? globalPost?.bookmarked ?? post.bookmarked,
              likes: globalPost?.likes ?? post.likes,
              likesCount: globalPost?.likesCount ?? post.likesCount,
              // Force update to trigger re-render
              _syncTimestamp: Date.now()
            };
          }
          return post;
        })
      );
    }
  }, [postInteractions, posts]);

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
    setPostsPage(1);
    fetchProfileData(true); // Force refresh on manual pull
  }, [onRefresh, userId]); // Remove fetchProfileData dependency

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

  // Handle start chat - Check for existing chat first
  const [chatLoading, setChatLoading] = useState(false);
  const handleStartChat = useCallback(async () => {
    if (!userId || chatLoading || !user) return;
    try {
      setChatLoading(true);
      
      // First, check if a chat already exists with this user
      const userChats = await apiService.getUserChats(user.id);
      const chatsArray = Array.isArray(userChats) ? userChats : ((userChats as any)?.data || (userChats as any)?.chats || []);
      const existingChat = chatsArray.find((chat: any) => chat.userId === String(userId));
      
      if (existingChat) {
        // Chat exists, navigate to it with user data for instant display
        router.push({
          pathname: `/chat/${existingChat.id}`,
          params: {
            cachedName: profile?.username || 'User',
            cachedAvatar: profile?.avatar_url || '',
            cachedIsOnline: 'false',
          }
        });
      } else {
        // No existing chat - navigate to new chat with user data in params
        // Chat will be created when first message is sent
        router.push({
          pathname: '/chat/new',
          params: {
            userId: String(userId),
            username: profile?.username || 'User',
            avatar: profile?.avatar_url || '',
            isOnline: 'false',
          }
        });
      }
    } catch (error: any) {
      console.error('Error checking for existing chat:', error);
      Alert.alert('Error', error.message || 'Failed to start chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }, [userId, chatLoading, user, profile]);

  // Sync userPosts with global interactions and like counts in real-time
  const syncedUserPosts = useMemo(() => {
    return userPosts.map(post => {
      const globalPost = posts.find(p => p.id === post.id);
      const globalInteraction = postInteractions[post.id];
      return {
        ...post,
        liked: globalInteraction?.liked ?? globalPost?.liked ?? post.liked,
        bookmarked: globalInteraction?.bookmarked ?? globalPost?.bookmarked ?? post.bookmarked,
        likes: globalPost?.likes ?? post.likes,
        likesCount: globalPost?.likesCount ?? post.likesCount
      };
    });
  }, [userPosts, postInteractions, posts]);

  const bookmarkedPosts = useMemo(() => {
    if (!isMyProfile) return [];
    return posts.filter(p => postInteractions[p.id]?.bookmarked);
  }, [posts, postInteractions, isMyProfile]);

  const displayedPosts = useMemo(() => {
    if (!isMyProfile) return syncedUserPosts;
    return activeTab === 'Posts' ? syncedUserPosts : bookmarkedPosts;
  }, [isMyProfile, activeTab, syncedUserPosts, bookmarkedPosts]);

  const loadMoreUserPosts = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMoreUserPosts || activeTab !== 'Posts') {
      return;
    }
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchUserPosts(nextPage, true);
  }, [hasMoreUserPosts, postsPage, activeTab, fetchUserPosts]);
  
  // Throttle navigation buttons
  const handleEditProfilePress = useThrottledCallback(() => {
    router.push('/edit-profile');
  }, 1000);
  
  const handleCreatePostPress = useThrottledCallback(() => {
    router.push('/create-post');
  }, 1000);
  
  const handleBackPress = useThrottledCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/chats');
    }
  }, 1000);

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
  // Handle post press - navigate to comments page
  const handlePostPress = useCallback((post: NormalizedPost) => {
    router.push(`/comments/${post.id}`);
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
        const { UnifiedShareService } = await import('@/lib/UnifiedShareService');
        await UnifiedShareService.quickShare(selectedPost.id, selectedPost.username, selectedPost.content);
      } catch (error) {
        console.error('Share error:', error);
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
        // Alert removed for better UX
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
      // Alert removed for better UX
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
    (post: NormalizedPost) => {
      // Get the most up-to-date interaction state
      const currentInteraction = postInteractions[post.id];
      const isLiked = currentInteraction?.liked ?? post.liked ?? false;
      const isBookmarked = currentInteraction?.bookmarked ?? post.bookmarked ?? false;
      
      return (
        <PostCard
          key={`${post.id}-${isLiked}-${post.likesCount || post.likes}`}
          post={post}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
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
      );
    },
    [postInteractions, toggleLike, toggleBookmark, handlePostPress, handleCommentPress, handleSharePost, handleReportPost, handleDeletePost, handlePollVote, user?.id, userId]
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
  const bannerSource = profile.banner_url && profile.banner_url.trim() && !profile.banner_url.includes('placeholder') ? { uri: profile.banner_url } : DEFAULT_BANNER;
  const avatarUri = profile.avatar_url ?? 'https://via.placeholder.com/150';
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onCombinedRefresh} tintColor={colors.primary} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 100;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMoreUserPosts();
          }
        }}
        scrollEventThrottle={200}
      >
        <View style={styles.bannerSection}>
          <Image source={bannerSource} style={styles.banner} />
          {/* Floating Back Button */}
          <TouchableOpacity style={styles.floatingBackButton} onPress={handleBackPress}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          
          {/* Profile Completion Banner - Floating on banner image - UNSKIPPABLE for missing avatar */}
          {isMyProfile && !profile.avatar_url && (
            <View style={styles.floatingBanner}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerGradient}
              >
                <View style={styles.bannerContent}>
                  <View style={styles.bannerIconContainer}>
                    <Info size={32} color="#ffffff" strokeWidth={2.5} />
                  </View>
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>⚠️ Profile Picture Required</Text>
                    <Text style={styles.bannerSubtitle}>
                      Add your photo to unlock all features
                    </Text>
                  </View>
                  {/* NO CLOSE BUTTON - This is UNSKIPPABLE */}
                </View>
                <TouchableOpacity 
                  style={styles.bannerActionButton}
                  onPress={() => {
                    router.push('/edit-profile');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bannerActionText}>Add Photo Now</Text>
                  <View style={styles.bannerArrow}>
                    <Text style={styles.bannerArrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </View>
        {/* Profile Image Section - Separate from banner */}
        <View style={styles.profileImageSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={() => {
              if (avatarUri && avatarUri !== 'https://via.placeholder.com/150') {
                setViewerImageUri(avatarUri);
                setShowImageViewer(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Image 
              source={avatarUri && avatarUri !== 'https://via.placeholder.com/150' ? { uri: avatarUri } : require('@/assets/images/default-avatar.png')} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
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
            {/* Action Buttons for Non-Owner */}
            {!isMyProfile && (
              <View style={styles.actionButtonsContainer}>
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
              </View>
            )}
          </View>
          {/* Bio Section */}
          <Text style={styles.bioText}>{profile.bio ?? 'No bio yet.'}</Text>
          
          {/* Action Buttons for Owner - Full Width Row */}
          {isMyProfile && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <TouchableOpacity style={[styles.editButton, { flex: 1 }]} onPress={handleEditProfilePress}>
                <Edit size={18} color={colors.primary} />
                <Text style={[styles.editButtonText, { marginLeft: 8 }]}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editButton, { flex: 1, backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]} 
                onPress={() => router.push('/achievements')}
              >
                <Trophy size={18} color={colors.text} />
                <Text style={[styles.editButtonText, { marginLeft: 8, color: colors.text }]}>Achievements</Text>
              </TouchableOpacity>
            </View>
          )}


          {/* Action Buttons for Non-Owner - View Achievements */}
          {!isMyProfile && (
            <TouchableOpacity 
              style={[styles.editButton, { marginBottom: 20, width: '100%', backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]} 
              onPress={() => router.push({ pathname: '/achievements', params: { userId: userId } })}
            >
              <Trophy size={18} color={colors.text} />
              <Text style={[styles.editButtonText, { marginLeft: 8, color: colors.text }]}>View Achievements</Text>
            </TouchableOpacity>
          )}

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
          {loadingPosts && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      </ScrollView>
      {isMyProfile && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePostPress}>
          <View style={styles.fabContent}>
            <PenTool size={26} color="#ffffff" />
          </View>
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
        onPollVote={handlePollVote}
        onShare={handleSharePost}
        onReport={handleReportPost}
        onDelete={handleDeletePostInModal}
      />

      {/* Image Viewer Modal */}
      <ImageViewer 
        visible={showImageViewer}
        imageUri={viewerImageUri}
        onClose={() => setShowImageViewer(false)}
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
  bannerSection: {
    position: 'relative',
    backgroundColor: colors.background,
    overflow: 'visible', // Ensure profile image and action buttons are not clipped
    zIndex: 1, // Lower z-index than action buttons
    marginTop: -Spacing.md, // Slight negative margin to extend banner upward
  },
  banner: { 
    width: '100%', 
    height: 200, // Taller banner for full-bleed effect
    backgroundColor: colors.backgroundTertiary,
  },
  floatingBackButton: {
    position: 'absolute',
    top: Spacing.lg, // Moved down from top
    left: Spacing.md,
    width: ComponentStyles.avatar.medium,
    height: ComponentStyles.avatar.medium,
    borderRadius: ComponentStyles.avatar.medium / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  profileImageSection: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    marginTop: -50, // Negative margin to overlap banner
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
    marginBottom: 0,
    minHeight: 50,
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
    marginBottom: 0,
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
  // editButton style removed (duplicate)

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
    marginBottom: Spacing.md,
    marginTop: -8,
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
    width: 60, 
    height: 60, 
    borderRadius: 30,
    overflow: 'hidden'
  },
  fabContent: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#3B8FE8'
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
  // Floating banner styles
  floatingBanner: {
    position: 'absolute',
    top: '37%',
    left: Spacing.lg,
    right: Spacing.lg,
    transform: [{ translateY: -50 }],
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    zIndex: 5,
    ...Shadows.large,
    elevation: 8,
  },
  bannerGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  bannerIconContainer: {
    position: 'relative',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  bannerSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ffffff25',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sparkleEmoji: {
    fontSize: 12,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  bannerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: FontSizes.sm,
    color: '#ffffffdd',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  bannerCloseButton: {
    padding: 6,
    backgroundColor: '#ffffff25',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  bannerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerActionText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
    letterSpacing: 0.3,
  },
  bannerArrow: {
    backgroundColor: '#3B8FE820',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerArrowText: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#3B8FE8',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: colors.primary,
  },
});