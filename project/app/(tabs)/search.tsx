import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Trophy, Star, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, UserSearchResult } from '@/lib/api';
import { XPLeadersSkeleton, SearchResultsSkeleton } from '@/components/skeletons';
import { useDebounce } from '@/hooks/useDebounce';
import KeyboardWrapper from '@/components/ui/KeyboardWrapper';
import { Spacing, FontSizes } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topXPUsers, setTopXPUsers] = useState<any[]>([]);
  const [loadingTopXP, setLoadingTopXP] = useState(true);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const handleGoBack = useCallback(() => {
    router.back();
  }, []);
  const loadTopXPUsers = useCallback(async () => {
    try {
      setLoadingTopXP(true);
      const response = await apiService.getTopXPUsers(10);
      setTopXPUsers(Array.isArray(response) ? response : (response as any)?.data || []);
    } catch (error) {
      } finally {
      setLoadingTopXP(false);
    }
  }, []);
  const fetchSearchResults = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.searchUsers(query);
      // Fetch XP data for each user if not included
      const usersWithXP = await Promise.all(
        response.users.map(async (user: any) => {
          try {
            // Try to get user profile which should include XP
            const profileResponse = await apiService.getUserProfile(user.id);
            return {
              ...user,
              xp: profileResponse.xp || 0
            };
          } catch (error) {
            return {
              ...user,
              xp: 0
            };
          }
        })
      );
      setSearchResults(usersWithXP);
    } catch (err: any) {
      setError(
        typeof err === 'string'
          ? err
          : 'Failed to fetch search results. Please check your internet connection and try again.'
      );
      Alert.alert('Error', 'Failed to fetch search results. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSearchResults(debouncedSearchQuery);
  }, [debouncedSearchQuery]);
  useEffect(() => {
    loadTopXPUsers();
  }, [loadTopXPUsers]);
  // Helper function to get rank colors for top 3 positions
  const getRankColors = (index: number): [string, string] => {
    switch (index) {
      case 0: // 1st place - Gold gradient
        return ['#FFD700', '#FFA500'];
      case 1: // 2nd place - Silver gradient  
        return ['#C0C0C0', '#808080'];
      case 2: // 3rd place - Bronze gradient
        return ['#CD7F32', '#B8860B'];
      default: // Others - App theme gradient
        return ["#3b82f6", "#ec4899"];
    }
  };
  const renderSearchState = () => {
    if (loading) {
      // Show different skeletons based on search state
      if (searchQuery.length >= 2) {
        // Searching - show search results skeleton
        return <SearchResultsSkeleton />;
      } else {
        // Loading XP leaders - show grid skeleton
        return <XPLeadersSkeleton />;
      }
    }
    if (error)
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    if (searchQuery.length < 2) {
      // Show top XP users as suggestions
      return null;
    }
    if (searchResults.length === 0)
      return (
        <View style={styles.centered}>
          <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>
        </View>
      );
  };
  const renderXPUserCard = (user: any, index: number) => (
    <TouchableOpacity
      key={user.id}
      style={styles.xpUserCard}
      onPress={() => router.push(`/profile/${user.id}` as any)}
    >
      <LinearGradient
        colors={getRankColors(index)}
        style={styles.xpUserRank}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.xpUserRankText}>#{index + 1}</Text>
      </LinearGradient>
      {/* Crown for top 3 */}
      {index < 3 && (
        <View style={styles.crownContainer}>
          <Text style={styles.crownEmoji}>
            {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
          </Text>
        </View>
      )}
      <Image
        source={user.avatar ? { uri: user.avatar } : require('@/assets/images/default-avatar.png')}
        style={styles.xpUserAvatar}
      />
      <View style={styles.xpUserContent}>
        <View style={styles.xpUserHeader}>
          <Text style={styles.xpUserName} numberOfLines={1}>
            {user.name || user.username}
          </Text>
          {user.verified && (
            <Star size={14} color={colors.primary} fill={colors.primary} />
          )}
        </View>
        <Text style={styles.xpUserUsername} numberOfLines={1}>
          @{user.username}
        </Text>
        <View style={styles.xpUserStats}>
          <View style={styles.xpUserStat}>
            <LinearGradient
              colors={getRankColors(index)}
              style={styles.xpStatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Trophy size={12} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.xpUserStatText}>{user.xp} XP</Text>
          </View>
          <View style={styles.xpUserStat}>
            <Users size={12} color={colors.textMuted} />
            <Text style={styles.xpUserStatText}>{user.followersCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* StatusBar is handled globally in main app layout */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.backgroundTertiary }]} onPress={handleGoBack}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Search size={20} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      </View>
      <KeyboardWrapper>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderSearchState()}
          {/* Show top XP users when no search query */}
          {searchQuery.length < 2 && (
            <View>
              <View style={styles.suggestionsHeader}>
                <LinearGradient
                  colors={[colors.secondary, colors.primary]}
                  style={styles.headerIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Trophy size={20} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Top XP Leaders</Text>
              </View>
              {loadingTopXP ? (
                <XPLeadersSkeleton />
              ) : (
                <View style={styles.xpUsersGrid}>
                  {topXPUsers.map((user, index) => renderXPUserCard(user, index))}
                </View>
              )}
              {topXPUsers.length === 0 && !loadingTopXP && (
                <View style={styles.centered}>
                  <Text style={styles.initialText}>No top XP users found.</Text>
                </View>
              )}
            </View>
          )}
          {/* Show search results */}
          {!loading && !error && searchQuery.length >= 2 && searchResults.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchResults.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userItem}
                  onPress={() => router.push(`/profile/${user.id}` as any)}
                >
                  <Image
                    source={user.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/default-avatar.png')}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userContent}>
                    <Text style={styles.userName}>{user.username}</Text>
                    <Text style={styles.userBio} numberOfLines={1}>
                      {user.bio || 'No bio available.'}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['#6a00f4', '#e385ec']}
                    style={styles.userXPContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.xpIconContainer}>
                      <Trophy size={12} color="#ffffff" />
                    </View>
                    <Text style={styles.userXPValue}>
                      {user.xp !== undefined && user.xp !== null ? user.xp : '?'}
                    </Text>
                    <Text style={styles.userXPLabel}>XP</Text>
                  </LinearGradient>
                  <View style={styles.fullWidthSeparator} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
// Create dynamic styles function
const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 5, // Minimal top padding for consistent spacing
    paddingBottom: 8, // Minimal bottom padding for consistent spacing
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userContent: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  userXPContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 50,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userXPValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userXPLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  xpIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    opacity: 0.7,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  fullWidthSeparator: {
    height: 1,
    backgroundColor: colors.border,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  loadingText: { marginTop: 10, fontSize: 15, color: colors.textSecondary },
  errorText: { color: colors.error, textAlign: 'center', fontSize: 15 },
  noResultsText: { color: colors.textMuted, textAlign: 'center', fontSize: 15 },
  initialText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  // XP Users Styles
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  xpUsersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  xpUserCard: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xpUserRank: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  xpUserRankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  xpUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  xpUserContent: {
    flex: 1,
  },
  xpUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  xpUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  xpUserUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  xpUserStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpUserStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpUserStatText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  headerIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpStatGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownContainer: {
    position: 'absolute',
    top: -5,
    left: 8,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
