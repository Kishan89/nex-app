import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { interactionStore } from '@/store/interactionStore';
import { postCache } from '@/store/postCache';
import { commentCache } from '@/store/commentCache';
import { apiService } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { NormalizedPost, Comment } from '@/types';
import { useAuth } from './AuthContext';
import { pollVoteStorage } from '@/lib/pollVoteStorage';
import { usePollVote } from './PollVoteContext';
interface ListenContextType {
  posts: NormalizedPost[];
  followingPosts: NormalizedPost[];
  trendingPosts: NormalizedPost[];
  postInteractions: Record<string, { liked: boolean; bookmarked: boolean }>;
  pollVotes: Record<string, { hasVoted: boolean; optionId?: string }>;
  comments: Record<string, Comment[]>;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMorePosts: boolean;
  loadingTrending: boolean;
  loadingFollowing: boolean;
  error: string | null;
  toggleLike: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  addComment: (postId: string, commentText: string, parentId?: string) => Promise<void>;
  loadPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadFollowingPosts: () => Promise<void>;
  loadTrendingPosts: () => Promise<void>;
  onRefresh: () => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  getPostById: (postId: string) => NormalizedPost | undefined;
}
const ListenContext = createContext<ListenContextType | undefined>(undefined);
const INTERACTIONS_STORAGE_KEY_PREFIX = '@user_post_interactions';
const POLL_VOTES_STORAGE_KEY_PREFIX = '@user_poll_votes';
const COMMENTS_STORAGE_KEY = '@app_comments_data';
const getUserInteractionsKey = (userId: string | null) =>
  userId ? `${INTERACTIONS_STORAGE_KEY_PREFIX}_${userId}` : `${INTERACTIONS_STORAGE_KEY_PREFIX}_guest`;
const getUserPollVotesKey = (userId: string | null) =>
  userId ? `${POLL_VOTES_STORAGE_KEY_PREFIX}_${userId}` : `${POLL_VOTES_STORAGE_KEY_PREFIX}_guest`;
const normalizePost = (p: any): NormalizedPost => {
  const id = String(p.id ?? p._id ?? p.postId ?? Math.random());
  const avatar = p.avatar ?? p.author?.avatar ?? 'https://placehold.co/40';
  const username = p.username ?? p.author?.username ?? 'Unknown';
  const createdAt = p.createdAt ?? p.time ?? '';
  const content = p.content ?? p.body ?? '';
  const image = p.image ?? p.imageUrl ?? null;
  const likes = Number(p.likes ?? 0);
  const commentsCount = Number(p.commentsCount || p.comments || p._count?.comments || 0);
  const bookmarksCount = Number(p.bookmarks ?? 0);
  const liked = Boolean(p.liked ?? p.isLiked ?? false);
  const bookmarked = Boolean(p.bookmarked ?? p.isBookmarked ?? false);
  const userId = String(p.userId ?? p.author?.id ?? p.user?.id ?? 'unknown');
  const isPinned = Boolean(p.isPinned ?? false);
  return {
    id,
    avatar,
    username,
    createdAt,
    content,
    image,
    userId, 
    likes,
    comments: commentsCount,
    bookmarks: bookmarksCount,
    likeCount: likes,
    liked,
    bookmarked,
    isPinned,
    // Include poll data
    poll: p.poll ? {
      id: p.poll.id,
      question: p.poll.question,
      options: p.poll.options || []
    } : null,
    // Additional fields for enhanced functionality
    likesCount: likes,
    commentsCount,
    bookmarksCount,
    // YouTube integration fields
    youtubeVideoId: p.youtubeVideoId || null,
    youtubeTitle: p.youtubeTitle || null,
    youtubeAuthor: p.youtubeAuthor || null,
    youtubeThumbnail: p.youtubeThumbnail || null,
    youtubeUrl: p.youtubeUrl || null,
    youtubeDuration: p.youtubeDuration || null,
  };
};
const normalizeComment = (c: any): Comment => {
  // Extract user information from the comment data
  const userInfo = c.user || {};
  const userId = userInfo.id || c.userId;
  
  // Recursively normalize replies if they exist (preserve backend nested structure)
  const replies = c.replies && Array.isArray(c.replies) 
    ? c.replies.map(normalizeComment) 
    : [];
  
  return {
    id: String(c.id ?? c._id ?? Date.now()),
    username: c.username ?? userInfo.username ?? 'User',
    avatar: c.avatar ?? userInfo.avatar ?? 'https://placehold.co/40',
    text: c.text ?? c.body ?? '',
    time: c.createdAt ?? c.time ?? 'now',
    parentId: c.parentId ? String(c.parentId) : undefined,
    replyTo: c.replyTo ?? undefined,
    user: userInfo.id ? userInfo : undefined, // Only include if we have a valid user object
    userId: userId, // Include userId for delete functionality
    replies: replies, // Preserve nested replies from backend
  };
};
// Function to build nested comment structure from flat array
const buildNestedComments = (flatComments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];
  // First pass: create a map of all comments
  flatComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  // Second pass: build the nested structure
  flatComments.forEach(comment => {
    const normalizedComment = commentMap.get(comment.id)!;
    if (comment.parentId) {
      // This is a reply, add it to parent's replies
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(normalizedComment);
      } else {
        // Parent not found, treat as root comment
        rootComments.push(normalizedComment);
      }
    } else {
      // This is a root comment
      rootComments.push(normalizedComment);
    }
  });
  return rootComments;
};
export const ListenContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { syncPollVoteAcrossScreens, hasVotedOnPoll, getUserVoteForPoll } = usePollVote();
  const storageKey = getUserInteractionsKey(user?.id ?? null);
  const pollVotesStorageKey = getUserPollVotesKey(user?.id ?? null);
  const [posts, setPosts] = useState<NormalizedPost[]>([]);
  const [followingPosts, setFollowingPosts] = useState<NormalizedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<NormalizedPost[]>([]);
  const [postInteractions, setPostInteractions] = useState<Record<string, { liked: boolean; bookmarked: boolean }>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, { hasVoted: boolean; optionId?: string }>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed pendingActions ref - now using interactionStore for pending state management
  const saveInteractions = useCallback(async (interactions: Record<string, { liked: boolean; bookmarked: boolean }>) => {
    try { await AsyncStorage.setItem(storageKey, JSON.stringify(interactions)); }
    catch (err) { }
  }, [storageKey]);
  const savePollVotes = useCallback(async (votes: Record<string, { hasVoted: boolean; optionId?: string }>) => {
    try { await AsyncStorage.setItem(pollVotesStorageKey, JSON.stringify(votes)); }
    catch (err) { }
  }, [pollVotesStorageKey]);
  const loadSavedInteractions = useCallback(async () => {
    try { const storedInteractions = await AsyncStorage.getItem(storageKey); return storedInteractions ? JSON.parse(storedInteractions) : {}; }
    catch (err) { return {}; }
  }, [storageKey]);
  const loadSavedPollVotes = useCallback(async () => {
    try { const storedVotes = await AsyncStorage.getItem(pollVotesStorageKey); return storedVotes ? JSON.parse(storedVotes) : {}; }
    catch (err) { return {}; }
  }, [pollVotesStorageKey]);
  const saveComments = useCallback(async (commentsData: Record<string, Comment[]>) => {
    try { await AsyncStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(commentsData)); }
    catch (e) { }
  }, []);
  const loadSavedComments = useCallback(async () => {
    try { const savedComments = await AsyncStorage.getItem(COMMENTS_STORAGE_KEY); return savedComments ? JSON.parse(savedComments) : {}; }
    catch (e) { return {}; }
  }, []);
  const loadPosts = useCallback(async (page: number = 1, append: boolean = false, forceRefresh: boolean = false) => {
    setError(null);
    if (page === 1) {
      // Try to load from cache first for instant display (only if not forcing refresh)
      if (!forceRefresh) {
        const cachedData = await postCache.getCachedPosts();
        if (cachedData && !append) {
          setPosts(cachedData.posts);
          setFollowingPosts(cachedData.followingPosts);
          setTrendingPosts(cachedData.trendingPosts);
          setPostInteractions(cachedData.interactions);
          setLoading(false);
          // Load fresh data in background after showing cached content
          setTimeout(() => {
            loadPosts(1, false, true); // Force refresh to get latest data
          }, 500);
          return;
        }
      }
      setLoading(true);
      setCurrentPage(1);
      setHasMorePosts(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const savedInteractions = await loadSavedInteractions();
      const savedComments = await loadSavedComments();
      const savedPollVotes = await loadSavedPollVotes();
      // Add pagination parameters
      const postsData = await apiService.getPosts(page, 20); // 20 posts per page
      const normalized = (postsData || []).map(normalizePost);
      // Check if we have more posts
      setHasMorePosts(normalized.length === 20); // If we got less than 20, no more posts
      // Use server data for like counts and status - prioritize server truth
      const combinedInteractions: Record<string, { liked: boolean; bookmarked: boolean }> = {};
      normalized.forEach(p => {
        // Always use server data for like/bookmark status (server is source of truth)
        combinedInteractions[p.id] = { 
          liked: p.liked, 
          bookmarked: p.bookmarked 
        };
      });
      // Check poll votes from global context first, then local storage
      const postsWithPollVotes = await Promise.all(normalized.map(async (p) => {
        if (p.poll) {
          // Check global context first
          const globalHasVoted = hasVotedOnPoll(p.poll.id);
          const globalUserVote = getUserVoteForPoll(p.poll.id);
          // Fallback to local storage if not in global context
          let hasVoted = globalHasVoted;
          let userVote = globalUserVote;
          if (!hasVoted) {
            hasVoted = await pollVoteStorage.hasVotedOnPoll(p.poll.id);
            userVote = hasVoted ? await pollVoteStorage.getUserVoteForPoll(p.poll.id) : undefined;
            // Sync with global context if found in local storage
            if (hasVoted && userVote) {
              syncPollVoteAcrossScreens(p.poll.id, userVote);
            }
          }
          return {
            ...p,
            liked: combinedInteractions[p.id].liked,
            bookmarked: combinedInteractions[p.id].bookmarked,
            hasVotedOnPoll: hasVoted,
            userPollVote: userVote
          };
        }
        return {
          ...p,
          liked: combinedInteractions[p.id].liked,
          bookmarked: combinedInteractions[p.id].bookmarked,
          hasVotedOnPoll: false,
          userPollVote: undefined
        };
      }));
      // Use fresh server data for posts (including like counts and status)
      if (append && page > 1) {
        // Append new posts to existing ones
        setPosts(prevPosts => [...prevPosts, ...postsWithPollVotes]);
        setPostInteractions(prevInteractions => ({ ...prevInteractions, ...combinedInteractions }));
      } else {
        // Replace posts (refresh or first load)
        setPosts(postsWithPollVotes);
        setPostInteractions(combinedInteractions);
        setComments(savedComments);
      }
      setPollVotes(savedPollVotes);
      // Save the fresh server interactions to storage
      saveInteractions(combinedInteractions);
      // Cache posts for instant loading next time (only for first page)
      if (page === 1 && !append) {
        postCache.cachePosts({
          posts: postsWithPollVotes,
          followingPosts: followingPosts, // Keep existing following posts
          trendingPosts: trendingPosts,   // Keep existing trending posts
          interactions: combinedInteractions
        });
      }
    } catch (err) {
      setError('Failed to load posts.');
      setPosts([]);
      setPostInteractions({});
      setPollVotes({});
      setComments({});
    } finally { 
      setLoading(false); 
      setLoadingMore(false);
    }
  }, [loadSavedInteractions, loadSavedComments, loadSavedPollVotes, hasVotedOnPoll, getUserVoteForPoll, syncPollVoteAcrossScreens]);
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMorePosts) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadPosts(nextPage, true);
  }, [loadingMore, hasMorePosts, currentPage, loadPosts]);
  const loadFollowingPosts = useCallback(async () => {
    setLoadingFollowing(true);
    setError(null);
    try {
      const savedInteractions = await loadSavedInteractions();
      const savedPollVotes = await loadSavedPollVotes();
      const postsData = await apiService.getFollowingPosts();
      const normalized = (postsData || []).map(normalizePost);
      // Use server data for like counts and status - prioritize server truth
      const combinedInteractions: Record<string, { liked: boolean; bookmarked: boolean }> = {};
      normalized.forEach(p => {
        // Always use server data for like/bookmark status (server is source of truth)
        combinedInteractions[p.id] = { 
          liked: p.liked, 
          bookmarked: p.bookmarked 
        };
      });
      // Check local storage for poll votes
      const postsWithPollVotes = await Promise.all(normalized.map(async (p) => {
        if (p.poll) {
          const hasVoted = await pollVoteStorage.hasVotedOnPoll(p.poll.id);
          const userVote = hasVoted ? await pollVoteStorage.getUserVoteForPoll(p.poll.id) : undefined;
          return {
            ...p,
            liked: combinedInteractions[p.id].liked,
            bookmarked: combinedInteractions[p.id].bookmarked,
            hasVotedOnPoll: hasVoted,
            userPollVote: userVote
          };
        }
        return {
          ...p,
          liked: combinedInteractions[p.id].liked,
          bookmarked: combinedInteractions[p.id].bookmarked,
          hasVotedOnPoll: false,
          userPollVote: undefined
        };
      }));
      // Use fresh server data for following posts
      setFollowingPosts(postsWithPollVotes);
      // Update interactions for following posts too
      setPostInteractions(prev => ({ ...prev, ...combinedInteractions }));
    } catch (err) {
      setError('Failed to load following posts.');
      setFollowingPosts([]);
    } finally {
      setLoadingFollowing(false);
    }
  }, [loadSavedInteractions, loadSavedPollVotes]);
  const loadTrendingPosts = useCallback(async () => {
    setLoadingTrending(true);
    setError(null);
    try {
      const savedInteractions = await loadSavedInteractions();
      const savedPollVotes = await loadSavedPollVotes();
      const postsData = await apiService.getTrendingPosts();
      const normalized = (postsData || []).map(normalizePost);
      // Use server data for like counts and status - prioritize server truth
      const combinedInteractions: Record<string, { liked: boolean; bookmarked: boolean }> = {};
      normalized.forEach(p => {
        // Always use server data for like/bookmark status (server is source of truth)
        combinedInteractions[p.id] = { 
          liked: p.liked, 
          bookmarked: p.bookmarked 
        };
      });
      // Check local storage for poll votes
      const postsWithPollVotes = await Promise.all(normalized.map(async (p) => {
        if (p.poll) {
          const hasVoted = await pollVoteStorage.hasVotedOnPoll(p.poll.id);
          const userVote = hasVoted ? await pollVoteStorage.getUserVoteForPoll(p.poll.id) : undefined;
          return {
            ...p,
            liked: combinedInteractions[p.id].liked,
            bookmarked: combinedInteractions[p.id].bookmarked,
            hasVotedOnPoll: hasVoted,
            userPollVote: userVote
          };
        }
        return {
          ...p,
          liked: combinedInteractions[p.id].liked,
          bookmarked: combinedInteractions[p.id].bookmarked,
          hasVotedOnPoll: false,
          userPollVote: undefined
        };
      }));
      // Use fresh server data for trending posts
      setTrendingPosts(postsWithPollVotes);
      // Update interactions for trending posts too
      setPostInteractions(prev => ({ ...prev, ...combinedInteractions }));
    } catch (err) {
      setError('Failed to load trending posts.');
      setTrendingPosts([]);
    } finally {
      setLoadingTrending(false);
    }
  }, [loadSavedInteractions, loadSavedPollVotes]);
  useEffect(() => { 
    // Initialize stores for fast loading
    const initializeStores = async () => {
      if (user?.id) {
        // Initialize interaction store and post cache in parallel
        await Promise.all([
          interactionStore.loadFromStorage(user.id),
          postCache.preloadCache()
        ]);
      }
      // Load posts (will use cache if available)
      loadPosts(1, false);
      // Load other post types in background (non-blocking)
      setTimeout(() => {
        loadFollowingPosts();
        loadTrendingPosts();
      }, 200);
    };
    initializeStores();
  }, [loadPosts, loadFollowingPosts, loadTrendingPosts, user?.id]);
  // Real-time like sync - Update all post arrays
  useEffect(() => {
    const updatePostLikes = (postId: string, likeDelta: number) => {
      const updateFunction = (post: NormalizedPost) => 
        post.id === postId 
          ? { ...post, likes: Math.max((post.likes || 0) + likeDelta, 0), likesCount: Math.max((post.likesCount || 0) + likeDelta, 0) }
          : post;
      setPosts(prev => prev.map(updateFunction));
      setFollowingPosts(prev => prev.map(updateFunction));
      setTrendingPosts(prev => prev.map(updateFunction));
    };
    const channel = supabase
      .channel('post-likes')
      .on('broadcast', { event: 'like_added' }, (payload) => {
        const { postId, userId: likerUserId } = payload.payload;
        if (likerUserId !== user?.id) { // Don't update for own actions
          updatePostLikes(postId, 1);
        }
      })
      .on('broadcast', { event: 'like_removed' }, (payload) => {
        const { postId, userId: likerUserId } = payload.payload;
        if (likerUserId !== user?.id) { // Don't update for own actions
          updatePostLikes(postId, -1);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  // Real-time bookmark sync - Update all post arrays
  useEffect(() => {
    const updatePostBookmarks = (postId: string, bookmarkDelta: number) => {
      const updateFunction = (post: NormalizedPost) => 
        post.id === postId 
          ? { ...post, bookmarks: Math.max((post.bookmarks || 0) + bookmarkDelta, 0), bookmarksCount: Math.max((post.bookmarksCount || 0) + bookmarkDelta, 0) }
          : post;
      setPosts(prev => prev.map(updateFunction));
      setFollowingPosts(prev => prev.map(updateFunction));
      setTrendingPosts(prev => prev.map(updateFunction));
    };
    const channel = supabase
      .channel('post-bookmarks')
      .on('broadcast', { event: 'bookmark_added' }, (payload) => {
        const { postId, userId: bookmarkerUserId } = payload.payload;
        if (bookmarkerUserId !== user?.id) { // Don't update for own actions
          updatePostBookmarks(postId, 1);
        }
      })
      .on('broadcast', { event: 'bookmark_removed' }, (payload) => {
        const { postId, userId: bookmarkerUserId } = payload.payload;
        if (bookmarkerUserId !== user?.id) { // Don't update for own actions
          updatePostBookmarks(postId, -1);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPosts(1, false, true);
    } finally {
      // Add a small delay to ensure loading circle is visible
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [loadPosts]);
  const toggleLike = useCallback((postId: string) => {
    // Check if already processing this like
    if (interactionStore.isPending(postId, 'liking')) return;
    // NON-BLOCKING haptic feedback - fire and forget
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      Vibration.vibrate(10);
    });
    // Mark as pending with auto-timeout
    interactionStore.setPending(postId, 'liking', true, 150); // Auto-clear after 150ms
    // Get current state from posts array (server truth)
    const currentPost = posts.find(p => p.id === postId) || 
                       followingPosts.find(p => p.id === postId) || 
                       trendingPosts.find(p => p.id === postId);
    if (!currentPost) {
      interactionStore.setPending(postId, 'liking', false);
      return;
    }
    const isCurrentlyLiked = currentPost.liked;
    const likeDelta = isCurrentlyLiked ? -1 : 1;
    // INSTANT optimistic update - synchronous
    const newInteractions = { ...postInteractions, [postId]: { 
      liked: !isCurrentlyLiked, 
      bookmarked: postInteractions[postId]?.bookmarked || currentPost.bookmarked || false 
    }};
    // Update interaction store immediately
    interactionStore.setInteraction(postId, { liked: !isCurrentlyLiked });
    // Update React state immediately
    setPostInteractions(newInteractions);
    // Update all post arrays with optimistic update IMMEDIATELY
    const updateFunction = (p: NormalizedPost) => p.id === postId ? { 
      ...p, 
      likes: Math.max(0, p.likes + likeDelta),
      likesCount: Math.max(0, (p.likesCount || p.likes) + likeDelta),
      liked: !isCurrentlyLiked 
    } : p;
    setPosts(prev => prev.map(updateFunction));
    setFollowingPosts(prev => prev.map(updateFunction));
    setTrendingPosts(prev => prev.map(updateFunction));
    // Update cache immediately for faster future loads
    postCache.updatePostInCache(postId, { liked: !isCurrentlyLiked, likes: Math.max(0, currentPost.likes + likeDelta) });
    postCache.updateInteractionsInCache({ [postId]: { liked: !isCurrentlyLiked, bookmarked: postInteractions[postId]?.bookmarked || currentPost.bookmarked || false } });
    // Pending state will auto-clear after 150ms via interactionStore
    // Background operations - don't block UI
    Promise.resolve().then(() => {
      // Save to storage in background
      saveInteractions(newInteractions);
      // API call in background
      return apiService.toggleLikePost(postId);
    })
    .then(result => {
      // Update with server response to ensure consistency
      if (result && result.data && typeof result.data.liked !== 'undefined') {
        const serverInteractions = { ...newInteractions, [postId]: { 
          ...newInteractions[postId],
          liked: result.data.liked
        }};
        setPostInteractions(serverInteractions);
        interactionStore.setInteraction(postId, { liked: result.data.liked });
        saveInteractions(serverInteractions);
      }
    })
    .catch(err => {
      // Revert optimistic update only on error
      const revertedInteractions = { ...postInteractions, [postId]: { 
        liked: isCurrentlyLiked, 
        bookmarked: postInteractions[postId]?.bookmarked || currentPost.bookmarked || false 
      }};
      setPostInteractions(revertedInteractions);
      interactionStore.setInteraction(postId, { liked: isCurrentlyLiked });
      // Revert all post arrays
      const revertFunction = (p: NormalizedPost) => p.id === postId ? { 
        ...p, 
        likes: Math.max(0, p.likes - likeDelta),
        likesCount: Math.max(0, (p.likesCount || p.likes) - likeDelta),
        liked: isCurrentlyLiked 
      } : p;
      setPosts(prev => prev.map(revertFunction));
      setFollowingPosts(prev => prev.map(revertFunction));
      setTrendingPosts(prev => prev.map(revertFunction));
      saveInteractions(revertedInteractions);
      Alert.alert('Error', 'Failed to update like. Please try again.');
      // Re-enable interactions on error
      interactionStore.setPending(postId, 'liking', false);
    });
  }, [posts, followingPosts, trendingPosts, postInteractions, saveInteractions]);
  const toggleBookmark = useCallback((postId: string) => {
    // Check if already processing this bookmark
    if (interactionStore.isPending(postId, 'bookmarking')) return;
    // NON-BLOCKING haptic feedback - fire and forget
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      Vibration.vibrate(15);
    });
    // Mark as pending with auto-timeout
    interactionStore.setPending(postId, 'bookmarking', true, 150); // Auto-clear after 150ms
    const prevInteraction = postInteractions[postId] || { liked: false, bookmarked: false };
    const isBookmarked = prevInteraction.bookmarked;
    const bookmarkDelta = isBookmarked ? -1 : 1;
    // INSTANT optimistic update - synchronous
    const newInteractions = { ...postInteractions, [postId]: { ...prevInteraction, bookmarked: !isBookmarked } };
    // Update interaction store immediately
    interactionStore.setInteraction(postId, { bookmarked: !isBookmarked });
    // Update React state immediately
    setPostInteractions(newInteractions);
    // Update all post arrays with optimistic update IMMEDIATELY
    const updateFunction = (p: NormalizedPost) => p.id === postId ? { 
      ...p, 
      bookmarks: Math.max(0, (p.bookmarks || 0) + bookmarkDelta), 
      bookmarked: !isBookmarked 
    } : p;
    setPosts(prev => prev.map(updateFunction));
    setFollowingPosts(prev => prev.map(updateFunction));
    setTrendingPosts(prev => prev.map(updateFunction));
    // Update cache immediately for faster future loads
    postCache.updatePostInCache(postId, { bookmarked: !isBookmarked, bookmarks: Math.max(0, (prevInteraction.bookmarked ? 1 : 0) + bookmarkDelta) });
    postCache.updateInteractionsInCache({ [postId]: { liked: prevInteraction.liked, bookmarked: !isBookmarked } });
    // Pending state will auto-clear after 150ms via interactionStore
    // Background operations - don't block UI
    Promise.resolve().then(() => {
      // Save to storage in background
      saveInteractions(newInteractions);
      // API call in background
      return apiService.toggleBookmark(postId);
    })
    .catch(err => {
      // Revert optimistic update only on error
      const revertFunction = (p: NormalizedPost) => p.id === postId ? { 
        ...p, 
        bookmarks: Math.max(0, (p.bookmarks || 0) - bookmarkDelta), 
        bookmarked: isBookmarked 
      } : p;
      setPostInteractions(prev => ({ ...prev, [postId]: { ...prev[postId], bookmarked: isBookmarked } }));
      interactionStore.setInteraction(postId, { bookmarked: isBookmarked });
      setPosts(prev => prev.map(revertFunction));
      setFollowingPosts(prev => prev.map(revertFunction));
      setTrendingPosts(prev => prev.map(revertFunction));
      Alert.alert('Error', 'Failed to update bookmark.');
      saveInteractions({ ...postInteractions, [postId]: { ...prevInteraction, bookmarked: isBookmarked } });
      // Re-enable interactions on error
      interactionStore.setPending(postId, 'bookmarking', false);
    });
  }, [postInteractions, saveInteractions]);
  const votePoll = useCallback(async (pollId: string, optionId: string) => {
    try {
      // Check if user has already voted on this poll (use global context first)
      const globalHasVoted = hasVotedOnPoll(pollId);
      const globalUserVote = getUserVoteForPoll(pollId);
      if (globalHasVoted) {
        // Update UI to show already voted state without API call
        const newPollVotes = { 
          ...pollVotes, 
          [pollId]: { hasVoted: true, optionId: globalUserVote || optionId } 
        };
        setPollVotes(newPollVotes);
        savePollVotes(newPollVotes);
        setPosts(prev => prev.map(p => 
          p.poll?.id === pollId 
            ? { ...p, hasVotedOnPoll: true, userPollVote: globalUserVote || optionId }
            : p
        ));
        // Show user-friendly message instead of error
        Alert.alert('Already Voted', 'You have already voted on this poll.');
        return;
      }
      // Check local storage as fallback
      const hasAlreadyVoted = await pollVoteStorage.hasVotedOnPoll(pollId);
      if (hasAlreadyVoted) {
        const existingVote = await pollVoteStorage.getUserVoteForPoll(pollId);
        // Sync with global context
        syncPollVoteAcrossScreens(pollId, existingVote || optionId);
        // Update UI to show already voted state without API call
        const newPollVotes = { 
          ...pollVotes, 
          [pollId]: { hasVoted: true, optionId: existingVote || optionId } 
        };
        setPollVotes(newPollVotes);
        savePollVotes(newPollVotes);
        setPosts(prev => prev.map(p => 
          p.poll?.id === pollId 
            ? { ...p, hasVotedOnPoll: true, userPollVote: existingVote || optionId }
            : p
        ));
        // Show user-friendly message instead of error
        Alert.alert('Already Voted', 'You have already voted on this poll.');
        return;
      }
      // Optimistic update - mark as voted
      const newPollVotes = { 
        ...pollVotes, 
        [pollId]: { hasVoted: true, optionId } 
      };
      setPollVotes(newPollVotes);
      savePollVotes(newPollVotes);
      // Update posts to reflect voting state
      setPosts(prev => prev.map(p => 
        p.poll?.id === pollId 
          ? { ...p, hasVotedOnPoll: true, userPollVote: optionId }
          : p
      ));
      // Sync vote across all screens globally
      syncPollVoteAcrossScreens(pollId, optionId);
      // Call API to vote
      await apiService.votePoll(pollId, optionId);
      // Save vote to local storage after successful API call
      await pollVoteStorage.savePollVote(pollId, optionId);
      // NO REFRESH - Optimistic update already handled the UI
      // The vote count is already incremented in PollComponent
      // No need to reload all posts just for poll counts
    } catch (error: any) {
      // Check if it's a 409 error (already voted)
      if (error.message?.includes('409') || error.message?.includes('already voted')) {
        // Save to local storage even if API returns 409
        await pollVoteStorage.savePollVote(pollId, optionId);
        Alert.alert('Already Voted', 'You have already voted on this poll.');
        return;
      }
      // Revert optimistic update on other errors
      const revertedVotes = { ...pollVotes };
      delete revertedVotes[pollId];
      setPollVotes(revertedVotes);
      savePollVotes(revertedVotes);
      setPosts(prev => prev.map(p => 
        p.poll?.id === pollId 
          ? { ...p, hasVotedOnPoll: false, userPollVote: undefined }
          : p
      ));
      throw error; // Re-throw to let the component handle the error
    }
  }, [pollVotes, savePollVotes, hasVotedOnPoll, getUserVoteForPoll, syncPollVoteAcrossScreens, loadPosts]);
  const loadComments = useCallback(async (postId: string) => {
    try {
      // Show cached comments immediately if available
      const cachedComments = comments[postId];
      if (cachedComments && cachedComments.length > 0) {
        // Comments already loaded, return early for instant display
        return;
      }

      // Try to load from comment cache first for instant display
      const commentCacheData = await commentCache.getCachedComments(postId);
      if (commentCacheData.length > 0) {
        setComments(prev => ({ ...prev, [postId]: commentCacheData }));
        console.log(`📦 Loaded ${commentCacheData.length} cached comments for instant display`);
      }

      // Fetch fresh comments from server
      const remoteResponse: any = await apiService.getPostComments(postId);
      // Debug logging - temporary
      // Handle both direct array and wrapped response formats
      let commentsArray = [];
      if (Array.isArray(remoteResponse)) {
        commentsArray = remoteResponse;
      } else if (remoteResponse?.data && Array.isArray(remoteResponse.data)) {
        commentsArray = remoteResponse.data;
      } else if (remoteResponse?.success && Array.isArray(remoteResponse.data)) {
        commentsArray = remoteResponse.data;
      }
      // Fix missing user object in comments (temporary workaround)
      const fixedCommentsArray = commentsArray.map(comment => {
        if (!comment.user && comment.username) {
          // Try to extract user ID from comment data
          let userId = comment.userId || comment.authorId;
          // Smart user ID detection based on username and current user
          if (!userId) {
            // Use current user ID from auth context if username matches
            if (comment.username === user?.username) {
              userId = user.id;
              } else {
              // For other users, create a deterministic ID based on username
              userId = `user-${comment.username.toLowerCase()}`;
              }
          }
          return {
            ...comment,
            user: {
              id: userId,
              username: comment.username,
              avatar: comment.avatar
            }
          };
        }
        return comment;
      });
      const normalized = fixedCommentsArray.map(normalizeComment);
      // Backend already returns nested structure, so no need to call buildNestedComments
      // The normalizeComment function now preserves replies from backend
      console.log(`✅ Normalized ${normalized.length} comments with nested replies preserved`);
      normalized.forEach((c, i) => {
        console.log(`  Comment ${i + 1}: id=${c.id.substring(0, 8)}, replies=${c.replies?.length || 0}`);
      });
      
      setComments(prev => {
        const newState = { ...prev, [postId]: normalized };
        saveComments(newState);
        return newState;
      });

      // Cache the fresh comments for future instant loading
      await commentCache.cacheComments(postId, normalized);
      console.log(`💾 Cached ${normalized.length} fresh comments for post ${postId}`);
    } catch (err) {
    }
  }, [saveComments]);
  const addComment = useCallback(async (postId: string, commentText: string, parentId?: string) => {
    try {
      const newCommentResponse = await apiService.addComment(postId, commentText, parentId);
      // Refresh comments from server to ensure sync
      await loadComments(postId);
      // Update post comment count in all post arrays (both fields for consistency)
      const updateCommentCount = (p: NormalizedPost) => p.id === postId ? { 
        ...p, 
        comments: p.comments + 1,
        commentsCount: (p.commentsCount || p.comments) + 1
      } : p;
      
      setPosts(prev => prev.map(updateCommentCount));
      setFollowingPosts(prev => prev.map(updateCommentCount));
      setTrendingPosts(prev => prev.map(updateCommentCount));
      
      // Cache will be updated by loadComments function
      console.log('✅ Comment added successfully, cache updated');
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to add comment.';
      Alert.alert('Error', errorMessage);
    }
  }, [loadComments]);
  const getPostById = useCallback((postId: string) => {
    // First check in regular posts, then in following posts
    return posts.find(p => p.id === postId) || followingPosts.find(p => p.id === postId);
  }, [posts, followingPosts]);
  return (
    <ListenContext.Provider value={{
      posts, followingPosts, trendingPosts, postInteractions, pollVotes, comments, loading, refreshing, loadingMore, hasMorePosts, loadingTrending, loadingFollowing, error,
      toggleLike, toggleBookmark, votePoll, addComment, loadPosts, loadMorePosts, loadFollowingPosts, loadTrendingPosts, onRefresh, loadComments, getPostById
    }}>
      {children}
    </ListenContext.Provider>
  );
};
export const useListen = () => {
  const context = useContext(ListenContext);
  if (!context) throw new Error('useListen must be used within ListenContextProvider');
  return context;
};
