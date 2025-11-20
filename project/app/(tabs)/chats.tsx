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
import { Search, MessageCircle, Plus, Users } from 'lucide-react-native';
import { ChatSkeleton } from '../../components/skeletons';
import { apiService } from '../../lib/api';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
import { chatCache } from '@/store/chatCache';
import { chatMessageCache } from '@/store/chatMessageCache';
import { ultraFastChatCache } from '@/lib/ChatCache';
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
  isGroup?: boolean;
};
const getLastMessagePreview = (socketMessage: any): string => {
  const rawText = (socketMessage.text || socketMessage.content || '').trim();
  if (rawText.length > 0) {
    return rawText;
  }
  if (socketMessage.imageUrl) {
    return 'Photo';
  }
  return '';
};
const ChatsScreen = React.memo(function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { chatReadCounts, markChatAsRead, refreshUnreadCounts, addMessageToChat } = useChatContext();
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
    
    // 🚀 INSTANT: Load from cache first (0ms delay) for instant display
    const cachedData = await chatCache.getCachedChats();
    if (cachedData && cachedData.chats.length > 0) {
      setChats(cachedData.chats);
      setLoading(false);
    }
    
    // Always refresh from server to get fresh lastMessage data (fixes stale "No messages yet" cache)
    // This ensures image-only messages show "Photo" instead of "No messages yet"
    
    // Background refresh from server (only if force refresh or no cache)
    try {
      setError(null);
      // Only show loading if we don't have cached data
      if (chats.length === 0 && !cachedData) setLoading(true);
      
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
      
      // Debug: Log groups to check avatar data
      const groups = items.filter(item => item.isGroup);
      if (groups.length > 0) {
        console.log('📋 Groups loaded:', groups.length);
        groups.forEach(group => {
          console.log(`  - ${group.name}: avatar=${group.avatar || 'NO AVATAR'}`);
        });
      }
      
      // Update state with fresh data
      setChats(items);
      
      // Cache the chats for instant loading next time
      chatCache.cacheChats(items);
      
      // Preload recent chat messages in background
      const topChats = items.slice(0, 5);
      const chatIds = topChats.map(chat => String(chat.id));
      if (chatIds.length > 0) {
        setTimeout(() => {
          chatMessageCache.preloadChats(chatIds);
        }, 500);
      }
      
      // Keep old AsyncStorage cache for backward compatibility
      AsyncStorage.setItem(`user_chats_${user.id}`, JSON.stringify(items)).catch(() => {});
    } catch (err) {
      setError('Failed to load chats. Please try again.');
      // Don't clear chats if we have cached data
      if (!cachedData || cachedData.chats.length === 0) {
        setChats([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, chats.length]);
  useEffect(() => {
    loadChats();
  }, [loadChats]);
  // Socket listeners for new messages, online status, chat creation and deletion
  useEffect(() => {
    if (!user) return;
    const handleNewMessage = (socketMessage: any) => {
      const chatId = String(socketMessage.chatId);
      const previewText = getLastMessagePreview(socketMessage);
      
      // Update chat cache immediately
      chatCache.addMessageToCache(
        chatId,
        previewText,
        socketMessage.sender?.id,
        user?.id
      );
      
      // IMPORTANT: Also update message cache so ChatScreen can load the message
      // This ensures messages appear when user returns to ChatScreen
      
      // Format timestamp to "11:42 pm" format
      const formattedTimestamp = socketMessage.timestamp 
        ? new Date(socketMessage.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        : new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
      
      const newMessage = {
        id: socketMessage.id,
        text: socketMessage.text || socketMessage.content,
        isUser: socketMessage.sender?.id === user?.id,
        timestamp: formattedTimestamp,
        status: 'delivered' as const,
        sender: socketMessage.sender
      };
      
      // CRITICAL: Update ALL caches and global state for instant message availability
      // 1. Update regular cache (synchronous)
      chatMessageCache.addMessageToCache(chatId, newMessage);
      
      // 2. Update ultra-fast cache for instant loading (synchronous)
      ultraFastChatCache.addMessageInstantly(chatId, newMessage);
      
      // 3. Update global ChatContext state so ChatScreen loads it immediately
      // Wrap in setTimeout to avoid "Cannot update component while rendering" warning
      setTimeout(() => {
        addMessageToChat(chatId, newMessage, false);
      }, 0);
      
      // Update the chat list with the new message
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (String(chat.id) === chatId) {
            return {
              ...chat,
              lastMessage: previewText,
              time: 'now',
              unread: socketMessage.sender?.id !== user?.id ? (chat.unread || 0) + 1 : chat.unread || 0
            };
          }
          return chat;
        });
        // Sort chats by most recent message - prioritize 'now' time
        return updatedChats.sort((a, b) => {
          // Chats with 'now' time should be at the top
          if (a.time === 'now' && b.time !== 'now') return -1;
          if (a.time !== 'now' && b.time === 'now') return 1;
          // If both have 'now' or neither, maintain order
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
    
    // 🚀 INSTANT: Handle chat created event
    const handleChatCreated = (data: { chat: any; chatId: string; timestamp: string }) => {
      console.log('✅ [CHAT CREATED] Received socket event:', data.chatId, data.chat);
      
      // Immediately add to list (synchronous)
      setChats(prevChats => {
        // Check if chat already exists
        const chatExists = prevChats.some(chat => String(chat.id) === String(data.chatId));
        if (chatExists) {
          console.log('⚠️ [CHAT CREATED] Chat already exists, skipping');
          return prevChats;
        }
        
        // Extract other participant's info for 1-on-1 chats
        let otherParticipant = null;
        if (data.chat.participants && Array.isArray(data.chat.participants)) {
          otherParticipant = data.chat.participants.find(
            (p: any) => p.userId !== user?.id || p.user?.id !== user?.id
          );
        }
        
        const participantUser = otherParticipant?.user;
        
        // Create new chat object with proper user data
        const newChat: Chat = {
          id: data.chat.id || data.chatId,
          name: participantUser?.username || data.chat.name || 'New Chat',
          avatar: participantUser?.avatar || data.chat.avatar || '',
          isOnline: data.chat.isOnline || false,
          lastMessage: data.chat.lastMessage || '',
          time: 'now',
          unread: 0,
          userId: participantUser?.id || data.chat.userId || '',
          lastSeen: data.chat.lastSeen || 'recently',
          lastSeenText: data.chat.lastSeenText || (data.chat.isOnline ? 'Online' : 'Last seen recently')
        };
        
        console.log('✅ [CHAT CREATED] Instantly added to list with user:', newChat.name);
        
        // Add to cache (synchronous)
        chatCache.addChatToCache(newChat);
        
        // Add to top of list
        return [newChat, ...prevChats];
      });
    };
    
    // 🚀 INSTANT: Handle chat deleted event
    const handleChatDeleted = (data: { chatId: string; timestamp: string }) => {
      console.log('✅ [CHAT DELETED] Received socket event:', data.chatId);
      
      // Immediately remove from list (synchronous)
      setChats(prevChats => {
        const filtered = prevChats.filter(chat => String(chat.id) !== String(data.chatId));
        console.log(`✅ [CHAT DELETED] Instantly removed. Before: ${prevChats.length}, After: ${filtered.length}`);
        return filtered;
      });
      
      // Remove from cache (synchronous)
      chatCache.removeChatFromCache(data.chatId);
      
      console.log('✅ [CHAT DELETED] Cache cleared instantly');
    };
    
    // Add socket listeners
    socketService.addMessageListener(handleNewMessage);
    const removeOnlineStatusListener = socketService.onOnlineStatusChange(handleOnlineStatusChange);
    
    // 🚀 NEW: Add listeners for chat created/deleted events
    const socket = (socketService as any).socket;
    if (socket) {
      socket.on('chat_created', handleChatCreated);
      socket.on('chat_deleted', handleChatDeleted);
    }
    
    // Cleanup listeners on unmount
    return () => {
      socketService.removeMessageListener(handleNewMessage);
      removeOnlineStatusListener();
      
      // 🚀 NEW: Remove chat created/deleted listeners
      if (socket) {
        socket.off('chat_created', handleChatCreated);
        socket.off('chat_deleted', handleChatDeleted);
      }
    };
  }, [user, refreshChats]);
  // Load chats only on first mount
  useEffect(() => {
    if (user && chats.length === 0) {
      loadChats();
    }
  }, [user, loadChats]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats(true); // Force refresh on pull to refresh
  }, [loadChats]);
  const handleGroupsPress = () => {
    router.push('/groups');
  };
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
    // Navigate to standalone chat screen with cached data for instant display
    router.push({
      pathname: `/chat/${chat.id}`,
      params: {
        cachedName: chat.name || 'User',
        cachedAvatar: chat.avatar || '',
        cachedIsOnline: chat.isOnline ? 'true' : 'false',
        cachedUserId: chat.userId || 'unknown',
        cachedIsGroup: chat.isGroup ? 'true' : 'false',
      }
    });
  };
  const handleSearchPress = () => {
    router.push('/search-users');
  };
  const renderChatItem = ({ item }: { item: Chat }) => {
    const effectiveUnread = item.unread || 0;
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          {item.isGroup ? (
            item.avatar && item.avatar.trim() !== '' ? (
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.avatar}
                onError={(e) => {
                  console.log('❌ Group avatar failed to load:', item.avatar, e.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Group avatar loaded:', item.avatar);
                }}
              />
            ) : (
              <View style={[styles.avatar, styles.groupAvatarPlaceholder]}>
                <Users size={24} color={colors.primary} />
              </View>
            )
          ) : (
            item.avatar && item.avatar.trim() !== '' ? (
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.avatar}
              />
            ) : (
              <Image 
                source={require('@/assets/images/default-avatar.png')} 
                style={styles.avatar}
              />
            )
          )}
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
          <TouchableOpacity style={[styles.actionButton, styles.groupsButton]} onPress={handleGroupsPress}>
            <Users size={20} color="#FFFFFF" />
            <Text style={styles.groupsButtonText}>Groups</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ChatSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadChats(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.chatsList}
          data={chats}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingTop: 5, paddingBottom: 100, }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chats available</Text>
              {/* Suggestion to create groups */}
              <TouchableOpacity style={styles.groupsHint} onPress={handleGroupsPress}>
                <Users size={16} color={colors.primary} />
                <Text style={[styles.groupsHintText, { color: colors.primary }]}>Try creating a group chat</Text>
              </TouchableOpacity>
            </View>
          }
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
  groupsButton: {
    flexDirection: 'row',
    width: 'auto',
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B8FE8', // Solid primary color
    paddingHorizontal: Spacing.md,
    borderWidth: 0,
    ...Shadows.medium, // Increased shadow for prominence
  },
  groupsButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
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
  groupsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  groupsHintText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginLeft: Spacing.xs,
  },
  groupAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
  },
});