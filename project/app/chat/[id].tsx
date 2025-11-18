import React, { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Alert, ActivityIndicator, Text, AppState } from 'react-native';
import ChatScreen from '@/components/chat/ChatScreen';
import { apiService } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { Colors } from '../../constants/theme';
import { fcmService } from '../../lib/fcmService';
import { chatCache } from '@/store/chatCache';

export default function IndividualChatScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUnreadCounts, markChatAsRead: markChatAsReadContext } = useChatContext();
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFromNotification, setIsFromNotification] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const lastAppStateRef = useRef(AppState.currentState);
  
  // Check if this is a new chat (id = 'new' with user data in params)
  const isNewChat = id === 'new' && !!params.userId;
  const [actualChatId, setActualChatId] = useState<string | null>(null);

  // 🔄 APP STATE LISTENER: Detect when app returns from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      console.log('📱 [CHAT SCREEN] App state changed:', lastAppStateRef.current, '->', nextAppState);
      
      // App came back to foreground from background/inactive
      if (lastAppStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 [CHAT SCREEN] App returned to foreground, triggering refresh...');
        setForceRefresh(true);
        // Reset after ChatScreen has had time to consume it (3 seconds)
        setTimeout(() => {
          console.log('🔄 [CHAT SCREEN] Resetting forceRefresh flag');
          setForceRefresh(false);
        }, 3000);
      }
      
      lastAppStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Track current chat for notification suppression
    if (id) {
      fcmService.setCurrentChatId(id as string);
      // Check if we navigated from a notification by checking navigation params
      // When coming from notification, we should force refresh to get latest messages
      const checkNotificationSource = () => {
        // Check if app just became active (typical notification flow)
        const currentAppState = AppState.currentState;
        const wasInBackground = lastAppStateRef.current === 'background' || lastAppStateRef.current === 'inactive';
        const isNowActive = currentAppState === 'active';
        // If app just became active from background, or we can't go back, it's likely from notification
        if ((wasInBackground && isNowActive) || !router.canGoBack()) {
          console.log('🔔 [CHAT SCREEN] Opened from notification, enabling force refresh');
          setIsFromNotification(true);
          setForceRefresh(true);
        }
        lastAppStateRef.current = currentAppState;
      };
      checkNotificationSource();
    }
    loadChatData();
    // Mark chat as read when entering (but don't refresh counts immediately)
    if (user && id && !isNewChat) {
      markChatAsRead();
    }
    // Cleanup when leaving chat
    return () => {
      fcmService.setCurrentChatId(null);
      // Only refresh counts when leaving, not when entering
      if (user && id && !isNewChat) {
        markChatAsRead();
        // Debounce the refresh to avoid multiple calls
        setTimeout(() => {
          refreshUnreadCounts();
        }, 500);
      }
      setIsFromNotification(false);
      setForceRefresh(false);
    };
  }, [id, user]);

  const markChatAsRead = async () => {
    try {
      // Call API to mark chat as read (reset unread count on server)
      await apiService.markChatAsRead(id as string);
      // Update local context to sync with bottom navigation (use 0 for read)
      markChatAsReadContext(id as string, 0);
      // Don't refresh counts immediately - let it happen naturally
    } catch (error) {
      // Don't let this error break the chat functionality
    }
  };

  const loadChatData = async () => {
    if (!user) return;
    
    // Handle new chat with user data from params
    if (isNewChat && params.userId && params.username) {
      setChatData({
        id: 'new',
        name: params.username as string,
        username: params.username as string,
        avatar: (params.avatar as string) || '',
        isOnline: params.isOnline === 'true',
        lastSeen: 'recently',
        lastSeenText: params.isOnline === 'true' ? 'Online' : 'Last seen recently',
        userId: params.userId as string,
      });
      setLoading(false);
      return;
    }
    
    if (!id) return;
    
    // 🚀 OPTIMISTIC LOADING: Use cached data from params if available
    const cachedName = params.cachedName as string;
    const cachedAvatar = params.cachedAvatar as string;
    const cachedIsOnline = params.cachedIsOnline === 'true';
    const cachedUserId = params.cachedUserId as string;
    const cachedIsGroup = params.cachedIsGroup === 'true';
    
    if (cachedName) {
      console.log('Using cached data:', { cachedName, cachedUserId, cachedIsGroup, cachedAvatar });
      setChatData({
        id: id as string,
        name: cachedName,
        username: cachedName,
        avatar: cachedAvatar || '',
        isOnline: cachedIsOnline || false,
        lastSeen: 'recently',
        lastSeenText: cachedIsOnline ? 'Online' : 'Last seen recently',
        userId: cachedUserId || 'loading',
        isGroup: cachedIsGroup,
        description: '',
        memberCount: 0,
      });
      setLoading(false);
    }
    
    try {
      // Strategy 1: Try to get chat by ID directly (most reliable for new chats)
      try {
        const chat = await apiService.getChatById(id as string);
        console.log('getChatById response:', chat);
        
        // Handle both wrapped and direct response
        const chatData = (chat as any).data || chat;
        
        if (chatData) {
          // Extract userId - try multiple sources
          let userId = chatData.userId;
          
          if (!userId && chatData.participants && Array.isArray(chatData.participants)) {
            const otherParticipant = chatData.participants.find((p: any) => 
              (p.userId !== user.id && p.user?.id !== user.id)
            );
            userId = otherParticipant?.userId || otherParticipant?.user?.id;
          }
          
          console.log('Extracted userId:', userId, 'from chatData');
          
          console.log('Setting chatData with userId:', userId, 'isGroup:', chatData.isGroup);
          setChatData(prev => ({
            id: chatData.id || id as string,
            name: chatData.name || chatData.username || prev?.name || 'User',
            username: chatData.username || chatData.name || prev?.username || 'User',
            avatar: chatData.avatar || prev?.avatar || '',
            isOnline: chatData.isOnline || false,
            lastSeen: chatData.lastSeen || 'recently',
            lastSeenText: chatData.lastSeenText || (chatData.isOnline ? 'Online' : 'Last seen recently'),
            userId: userId || prev?.userId || 'unknown',
            isGroup: chatData.isGroup || false,
            description: chatData.description || prev?.description || '',
            memberCount: chatData.participants?.length || prev?.memberCount || 0,
            // Pass through full group info so ChatScreen can enforce admin permissions
            participants: chatData.participants || prev?.participants || [],
            createdById: chatData.createdById || prev?.createdById || null,
          }));
          setLoading(false);
          return;
        }
      } catch (getChatError) {
        console.log('getChatById failed, trying user chats list:', getChatError);
      }
      // Strategy 2: Get from user's chats list
      const userChats = await apiService.getUserChats(user.id);
      let chatFromList = null;
      if (Array.isArray(userChats)) {
        chatFromList = userChats.find((chat: any) => String(chat.id) === String(id));
      } else if (userChats && typeof userChats === 'object') {
        const chatsArray = (userChats as any).data || (userChats as any).chats || [];
        if (Array.isArray(chatsArray)) {
          chatFromList = chatsArray.find((chat: any) => String(chat.id) === String(id));
        }
      }
      if (chatFromList) {
        console.log('Found chat in list:', chatFromList);
        
        // Extract userId - already available in chatFromList
        let userId = chatFromList.userId;
        
        if (!userId && chatFromList.participants && Array.isArray(chatFromList.participants)) {
          const otherParticipant = chatFromList.participants.find((p: any) => 
            (p.userId !== user.id && p.user?.id !== user.id)
          );
          userId = otherParticipant?.userId || otherParticipant?.user?.id;
        }
        
        console.log('Chat list userId:', userId);
        
        setChatData(prev => ({
          id: chatFromList.id,
          name: chatFromList.name || chatFromList.username || prev?.name || 'User',
          username: chatFromList.username || chatFromList.name || prev?.username || 'User',
          avatar: chatFromList.avatar || prev?.avatar || '',
          isOnline: chatFromList.isOnline || false,
          lastSeen: chatFromList.lastSeen || 'recently',
          lastSeenText: chatFromList.lastSeenText || (chatFromList.isOnline ? 'Online' : 'Last seen recently'),
          userId: userId || prev?.userId || 'unknown',
          isGroup: chatFromList.isGroup || false,
          description: chatFromList.description || prev?.description || '',
          memberCount: chatFromList.memberCount || chatFromList.participants?.length || prev?.memberCount || 0,
          participants: chatFromList.participants || prev?.participants || [],
          createdById: chatFromList.createdById || prev?.createdById || null,
        }));
        setLoading(false);
        return;
      }
      // Strategy 3: If chat not found anywhere, show error
      Alert.alert(
        'Chat Not Found', 
        'This chat could not be loaded. It may have been deleted or you may not have access to it.',
        [
          { text: 'Go Back', onPress: () => router.back() }
        ]
      );
      setLoading(false);
    } catch (error) {
      console.error('Error loading chat data:', error);
      Alert.alert(
        'Error Loading Chat', 
        'Failed to load chat information. Please try again.',
        [
          { text: 'Retry', onPress: () => loadChatData() },
          { text: 'Go Back', onPress: () => router.back() }
        ]
      );
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/chats');
    }
  };

  const handleUserProfile = (userId: string) => {
    if (userId && userId !== 'unknown' && userId !== 'undefined' && userId !== 'loading' && userId.trim() !== '') {
      router.push(`/profile/${userId}`);
    }
  };
  
  // Handle chat deletion - immediately remove from cache
  const handleChatDeleted = (chatId: string) => {
    // Immediately remove from cache
    chatCache.removeChatFromCache(chatId);
    
    // Refresh unread counts
    refreshUnreadCounts();
  };
  
  // Handle first message for new chats
  const handleFirstMessage = async (messageContent: string) => {
    if (!user || !params.userId) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('🆕 [NEW CHAT] Creating chat and sending first message...');
      
      // Create the chat on backend
      const chat = await apiService.createChatWithUser(params.userId as string);
      const chatId = (chat as any)?.id || (chat as any)?.data?.id;
      
      if (!chatId) {
        throw new Error('Failed to create chat');
      }

      console.log('✅ [NEW CHAT] Chat created with ID:', chatId);

      // Store the actual chat ID
      setActualChatId(chatId);

      // Send the first message
      await apiService.sendMessage(chatId, {
        content: messageContent,
        chatId: chatId,
        senderId: user.id
      });

      console.log('✅ [NEW CHAT] First message sent successfully');

      // 🚀 INSTANT: Add chat to cache immediately for instant display in list
      const newChatForCache = {
        id: chatId,
        name: params.username as string,
        avatar: (params.avatar as string) || '',
        isOnline: params.isOnline === 'true',
        lastMessage: messageContent.substring(0, 50),
        time: 'now',
        unread: 0,
        userId: params.userId as string,
        lastSeen: 'recently',
        lastSeenText: params.isOnline === 'true' ? 'Online' : 'Last seen recently'
      };
      
      chatCache.addChatToCache(newChatForCache);
      console.log('✅ [NEW CHAT] Added to cache instantly for list display');

      // 🚀 INSTANT: Update chatData in place to transition from new chat to real chat
      // This prevents screen remount and double navigation
      // Update AFTER message is sent to prevent ChatScreen from sending it again
      setChatData(prevData => ({
        ...prevData!,
        id: chatId, // Update to real chat ID
      }));

      // Refresh unread counts in background
      setTimeout(() => {
        refreshUnreadCounts();
      }, 0);

      // 🚀 FIX: No navigation! Just update the URL silently using setParams
      // This prevents double navigation and screen remount
      router.setParams({ id: chatId });

      console.log('✅ [NEW CHAT] Transitioned to real chat without navigation');

      return chatId;
    } catch (error) {
      console.error('❌ [NEW CHAT] Error creating chat and sending message:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      {chatData ? (
        <ChatScreen 
          chatData={chatData}
          onBack={handleBack}
          onUserProfile={handleUserProfile}
          forceInitialRefresh={isFromNotification || forceRefresh}
          isNewChat={isNewChat}
          onFirstMessage={isNewChat ? handleFirstMessage : undefined}
          onChatDeleted={handleChatDeleted}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load chat</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
});
