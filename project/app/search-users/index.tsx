import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Search, ArrowLeft, UserPlus, UserMinus, MessageCircle } from 'lucide-react-native';
import { apiService } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { followSync } from '@/store/followSync';
interface SearchUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  isOnline?: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  xp?: number;
}
export default function SearchUsersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  // Helper function to filter out test users
  const filterTestUsers = (users: SearchUser[]) => {
    return users.filter(user => {
      const username = user.username?.toLowerCase() || '';
      return !username.includes('alice') &&
             !username.includes('bob') &&
             !username.includes('test');
    });
  };
  // Load suggested and recent users on mount
  useEffect(() => {
    loadInitialData();
  }, []);
  // Listen for follow state changes from other screens
  useEffect(() => {
    const unsubscribe = followSync.subscribe((syncUserId, syncIsFollowing) => {
      updateUserFollowStatus(syncUserId, syncIsFollowing);
    });
    return unsubscribe;
  }, []);
  const loadInitialData = async () => {
    try {
      setLoadingSuggestions(true);
      const [suggested] = await Promise.all([
        apiService.getSuggestedUsers(20) // Get more to filter top 5 by XP
      ]);
      const suggestedData = (suggested as any)?.data || suggested || [];
      // Filter and sort by XP, then take top 5
      const filteredSuggested = filterTestUsers(suggestedData)
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 5);
      setSuggestedUsers(filteredSuggested);
      // Load recent searches from AsyncStorage
      loadRecentSearches();
    } catch (error) {
      } finally {
      setLoadingSuggestions(false);
    }
  };
  const loadRecentSearches = async () => {
    try {
      const recentSearchesData = await AsyncStorage.getItem('recent_searches');
      if (recentSearchesData) {
        const parsed = JSON.parse(recentSearchesData);
        setRecentSearches(parsed.slice(0, 5)); // Show only 5 recent searches
      }
    } catch (error) {
      }
  };
  const saveRecentSearch = async (user: SearchUser) => {
    try {
      const existing = await AsyncStorage.getItem('recent_searches');
      let recentSearches = existing ? JSON.parse(existing) : [];
      // Remove if already exists
      recentSearches = recentSearches.filter((item: SearchUser) => item.id !== user.id);
      // Add to beginning
      recentSearches.unshift(user);
      // Keep only 10 recent searches
      recentSearches = recentSearches.slice(0, 10);
      await AsyncStorage.setItem('recent_searches', JSON.stringify(recentSearches));
      setRecentSearches(recentSearches.slice(0, 5));
    } catch (error) {
      }
  };
  // Search users with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const response = await apiService.searchUsersEnhanced(searchQuery.trim());
      const users = (response as any)?.data?.users || (response as any)?.users || [];
      // Filter out test users from search results too
      setSearchResults(filterTestUsers(users));
    } catch (error) {
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleFollowToggle = async (targetUser: SearchUser) => {
    if (followLoading === targetUser.id) {
      return; // Prevent multiple clicks while loading
    }
    
    try {
      setFollowLoading(targetUser.id); // Set loading for this specific user
      
      // 🚀 INSTANT FOLLOW: Update UI immediately, sync in background
      const { followOptimizations } = await import('../../lib/followOptimizations');
      const result = await followOptimizations.optimisticFollowToggle(targetUser.id, targetUser.isFollowing);
      
      if (result.success) {
        // ⚡ INSTANT UI UPDATE: Update local state immediately
        updateUserFollowStatus(targetUser.id, result.isFollowing);
        console.log(`⚡ Instant follow toggle in search: ${targetUser.id} -> ${result.isFollowing}`);
        
        // Show success alert for follow/unfollow
        const message = result.isFollowing ? 'Following!' : 'Unfollowed!';
        Alert.alert('Success', message);
      } else {
        // Handle failure case - don't show alert for operation in progress
        if (result.error !== 'Operation already in progress') {
          Alert.alert('Info', result.error || 'Please try again');
        }
      }
    } catch (error) {
      console.error('❌ Follow toggle failed in search:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(null); // Clear loading state
    }
  };
  const updateUserFollowStatus = (userId: string, isFollowing: boolean) => {
    const updateUser = (user: SearchUser) =>
      user.id === userId ? { ...user, isFollowing } : user;
    setSuggestedUsers(prev => prev.map(updateUser));
    setSearchResults(prev => prev.map(updateUser));
    setRecentSearches(prev => prev.map(updateUser));
  };
  const handleMessageUser = async (targetUser: SearchUser) => {
    if (chatLoadingId) return;
    // Save to recent searches
    saveRecentSearch(targetUser);
    try {
      setChatLoadingId(targetUser.id);
      // Create chat then navigate once with real ID
      const chat = await apiService.createChatWithUser(targetUser.id);
      const chatId = (chat as any)?.id || (chat as any)?.data?.id;
      if (chatId) {
        router.push(`/chat/${chatId}`);
      } else {
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start chat. Please try again.');
    } finally {
      setChatLoadingId(null);
    }
  };
  // Handle user profile navigation
  const handleUserProfile = useCallback((user: SearchUser) => {
    // Save to recent searches
    saveRecentSearch(user);
    // Navigate to profile screen
    router.push(`/profile/${user.id}`);
  }, []);
  const renderUserItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserProfile(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar || 'https://placehold.co/50' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.username}>
            {item.username}
            {item.verified && <Text style={styles.verified}> ✓</Text>}
          </Text>
          {/* {item.isOnline && <View style={styles.onlineIndicator} />} */}
        </View>
        <Text style={styles.handle}>@{item.username}</Text>
        {item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.followButton,
            item.isFollowing ? styles.followingButton : styles.followButton,
            followLoading === item.id && styles.loadingButton
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleFollowToggle(item);
          }}
          disabled={followLoading === item.id}
        >
          {followLoading === item.id ? (
            <ActivityIndicator size="small" color={item.isFollowing ? colors.text : "#ffffff"} />
          ) : item.isFollowing ? (
            <UserMinus size={16} color={colors.text} />
          ) : (
            <UserPlus size={16} color="#ffffff" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={(e) => {
            e.stopPropagation();
            handleMessageUser(item);
          }}
          disabled={chatLoadingId === item.id}
        >
          {chatLoadingId === item.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MessageCircle size={16} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  const renderSection = (title: string, data: SearchUser[], showLoading = false) => {
    if (showLoading && loadingSuggestions) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        </View>
      );
    }
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((item) => (
          <View key={item.id}>
            {renderUserItem({ item })}
          </View>
        ))}
      </View>
    );
  };
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Users</Text>
        <View style={styles.placeholder} />
      </View>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      </View>
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length >= 2 ? (
          // Search Results
          <>
            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            )}
            {searchResults.length > 0 ? (
              renderSection('Search Results', searchResults)
            ) : !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            )}
          </>
        ) : (
          // Default Content
          <>
            {renderSection('Top Suggested Users', suggestedUsers, true)}
            {renderSection('Recent Searches', recentSearches)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: colors.text,
    marginLeft: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
    backgroundColor: colors.backgroundTertiary,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
  },
  verified: {
    color: colors.primary,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: Spacing.xs,
  },
  handle: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: FontSizes.sm,
    color: colors.textMuted,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.xs,
  },
  followingButton: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingButton: {
    opacity: 0.7,
  },
  chatButton: {
    backgroundColor: colors.backgroundTertiary,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loader: {
    paddingVertical: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: colors.textMuted,
  },
});