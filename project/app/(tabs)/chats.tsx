import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, MessageCircle, Plus } from 'lucide-react-native';
import { ChatSkeleton } from '../../components/skeletons';
import { apiService } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
import { chatCache } from '@/store/chatCache';
import { chatMessageCache } from '@/store/chatMessageCache';
import { router } from 'expo-router';
import { Spacing, FontSizes, FontWeights, BorderRadius, ComponentStyles, Shadows } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { socketService } from '../../lib/socketService';
import { useFocusEffect } from '@react-navigation/native';
type Chat = {
  id: string | number;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastMessage?: string;
  time?: string;
  unread?: number;
  userId?: string;
  lastSeen?: string;
  lastSeenText?: string;
};
const ChatsScreen = React.memo(function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { chatReadCounts, markChatAsRead, refreshUnreadCounts } = useChatContext();
  const { colors, isDark } = useTheme();
  // Refresh chats and sync with context
  const refreshChats = useCallback(() => {
    refreshUnreadCounts();
  }, [refreshUnreadCounts]);
  const loadChats = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    // Try to load from cache first for instant display
    if (!forceRefresh) {
      const cachedData = await chatCache.getCachedChats();
      if (cachedData && cachedData.chats.length > 0) {
        setChats(cachedData.chats);
        setLoading(false);
        setRefreshing(false);
        // Load fresh data in background after showing cached content
        setTimeout(() => {
          loadChats(true); // Force refresh to get latest data
        }, 500);
        return;
      }
    }
    try {
      setError(null);
      if (chats.length === 0) setLoading(true);
      const resp = await apiService.getUserChats(user.id);
      let items: Chat[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp && typeof resp === 'object' && Array.isArray((resp as any).data)) {
        items = (resp as any).data;
      } else if (resp && typeof resp === 'object' && Array.isArray((resp as any).chats)) {
        items = (resp as any).chats;
      } else {
        items = [];
      }
      // Debug: Log chat data to check avatar URLs
      setChats(items);
      // Cache the chats for instant loading next time
      chatCache.cacheChats(items);
      // Preload recent chat messages for instant chat opening (top 5 chats)
      const topChats = items.slice(0, 5);
      const chatIds = topChats.map(chat => String(chat.id));
      if (chatIds.length > 0) {
        // Preload in background without blocking UI
        setTimeout(() => {
          chatMessageCache.preloadChats(chatIds);
        }, 500);
      }
      // Keep old AsyncStorage cache for backward compatibility
      AsyncStorage.setItem(`user_chats_${user.id}`, JSON.stringify(items)).catch(() => {});
    } catch (err) {
      setError('Failed to load chats. Please try again.');
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);
  useEffect(() => {
    loadChats();
  }, [loadChats]);
  // Socket listeners for new messages and online status updates
  useEffect(() => {
    if (!user) return;
    const handleNewMessage = (socketMessage: any) => {
      // Update cache immediately
      chatCache.addMessageToCache(
        socketMessage.chatId,
        socketMessage.text || socketMessage.content,
        socketMessage.sender?.id,
        user?.id
      );
      // Update the chat list with the new message
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (String(chat.id) === String(socketMessage.chatId)) {
            return {
              ...chat,
              lastMessage: socketMessage.text || socketMessage.content,
              time: 'now',
              unread: socketMessage.sender?.id !== user?.id ? (chat.unread || 0) + 1 : chat.unread || 0
            };
          }
          return chat;
        });
        // Sort chats by most recent message
        return updatedChats.sort((a, b) => {
          if (a.lastMessage && !b.lastMessage) return -1;
          if (!a.lastMessage && b.lastMessage) return 1;
          return 0;
        });
      });
      // Refresh unread counts in context for bottom navigation sync
      refreshChats();
    };
    const handleOnlineStatusChange = (data: { userId: string; isOnline: boolean }) => {
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.userId === data.userId 
            ? { 
                ...chat, 
                isOnline: data.isOnline, 
                lastSeenText: data.isOnline ? 'Online' : 'Last seen recently' 
              }
            : chat
        )
      );
    };
    // Add socket listeners
    socketService.addMessageListener(handleNewMessage);
    const removeOnlineStatusListener = socketService.onOnlineStatusChange(handleOnlineStatusChange);
    // Cleanup listeners on unmount
    return () => {
      socketService.removeMessageListener(handleNewMessage);
      removeOnlineStatusListener();
    };
  }, []);
  // Load chats only on first mount, refresh counts on focus
  useEffect(() => {
    if (user && chats.length === 0) {
      loadChats();
    }
  }, [user, loadChats]);
  // Only refresh unread counts when screen comes into focus (no reloading)
  useFocusEffect(
    useCallback(() => {
      if (user && chats.length > 0) {
        refreshChats(); // Only refresh counts, don't reload data
      }
    }, [user, refreshChats, chats.length])
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats(true); // Force refresh on pull to refresh
  }, [loadChats]);
  const handleChatPress = async (chat: Chat) => {
    // Mark chat as read using context (pass current unread count)
    const currentUnreadCount = chat.unread || 0;
    markChatAsRead(String(chat.id), currentUnreadCount);
    // Mark chat as read locally (optimistic update)
    setChats(prevChats => 
      prevChats.map(c => 
        String(c.id) === String(chat.id) 
          ? { ...c, unread: 0 }
          : c
      )
    );
    // Mark messages as read on server
    try {
      await apiService.markMessagesAsRead(String(chat.id));
    } catch (error) {
      // Even if server call fails, keep local state updated
    }
    // Navigate to standalone chat screen
    router.push(`/chat/${chat.id}`);
  };
  const handleSearchPress = () => {
    router.push('/search-users');
  };
  const renderChatItem = ({ item }: { item: Chat }) => {
    // Backend now returns accurate unread count, no need for local calculation
    // item.unread already contains only unread messages from others
    const effectiveUnread = item.unread || 0;
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: (item.avatar && item.avatar.trim() !== '') ? item.avatar : 'https://placehold.co/50' }} 
            style={styles.avatar}
            onError={(error) => {
              }}
            onLoad={() => {
              }}
          />
          {/* {item.isOnline && <View style={styles.onlineIndicator} />} */}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, effectiveUnread > 0 && styles.unreadChatName]}>
              {item.name}
            </Text>
            <Text style={[styles.chatTime, effectiveUnread > 0 && styles.unreadTime]}>
              {item.time}
            </Text>
          </View>
          <Text 
            style={[styles.lastMessage, effectiveUnread > 0 && styles.unreadMessage]} 
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {/* {item.lastSeenText && effectiveUnread === 0 && (
            <Text style={styles.lastSeen}>{item.lastSeenText}</Text>
          )} */}
        </View>
        {/* Green dot positioned to the right of the banner */}
        {effectiveUnread > 0 && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };
  // Create dynamic styles inside component to access colors
  const styles = createStyles(colors, isDark);
  return (
    <SafeAreaView style={styles.container}>
      {/* StatusBar is handled globally in main app layout */}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSearchPress}>
            <Search size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Render based on loading, error, or data */}
      {loading ? (
        <ChatSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadChats(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No chats available</Text>
        </View>
      ) : (
        <FlatList
          style={styles.chatsList}
          data={chats}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingTop: 5, paddingBottom: 8, }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.backgroundTertiary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
});
export default ChatsScreen;
// Create dynamic styles function
const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2, 
    paddingBottom: 5, 
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extrabold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerLeft: {
    width: 36,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    ...Shadows.small,
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.backgroundTertiary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.backgroundSecondary,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  time: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
    marginLeft: Spacing.sm,
  },
  messageContainer: {
    flex: 1,
  },
  lastMessage: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    fontWeight: FontWeights.regular,
    lineHeight: 18,
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    lineHeight: 16,
    color: colors.textMuted, // Fix: Add proper color for last seen
  },
  unreadText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4757',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#e385ec',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: 35,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.backgroundSecondary,
  },
  chatName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  unreadChatName: {
    fontWeight: FontWeights.bold,
    color: colors.text,
  },
  chatTime: {
    fontSize: FontSizes.xs,
    color: colors.textMuted,
    fontWeight: FontWeights.medium,
    marginLeft: Spacing.sm,
  },
  unreadTime: {
    color: colors.primary,
    fontWeight: FontWeights.bold,
  },
  unreadMessage: {
    fontWeight: FontWeights.semibold,
    color: colors.text,
  },
});