import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  Keyboard,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  FlatList,
  Modal,
} from 'react-native';
import { ArrowLeft, Send, MoreVertical, Phone, Video, Trash2, UserX, Flag } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
// Memory management will be handled by regular setTimeout for now
import { apiService } from '@/lib/api';
import { chatMessageCache } from '@/store/chatMessageCache';
import { formatMessageTime, getCurrentTimestamp, fixServerTimestamp, compareTimestamps } from '@/lib/timestampUtils';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { fcmService } from '@/lib/fcmService';
import { socketService } from '@/lib/socketService';
import { messagePersistence } from '@/lib/messagePersistence';
import { ultraFastChatCache } from '@/lib/ChatCache';
interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  username?: string;
}
interface FastChatScreenProps {
  chatData: ChatData;
  onBack?: () => void;
  onUserProfile?: (userId: string) => void;
}
const FastChatScreen = React.memo(function FastChatScreen({ 
  chatData, 
  onBack, 
  onUserProfile 
}: FastChatScreenProps) {
  // Safety check for chatData - inspired by original ChatScreen
  if (!chatData || !chatData.id) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Loading chat...</Text>
      </SafeAreaView>
    );
  }
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { addMessageToChat, getChatMessages, mergeServerMessages } = useChatContext();
  // State
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(chatData.isOnline || false);
  const [lastSeen, setLastSeen] = useState(chatData.lastSeen || 'recently');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // Helper function for memory-safe timeouts
  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      timeoutRefs.current.delete(timeout);
      callback();
    }, delay);
    timeoutRefs.current.add(timeout);
    return timeout;
  }, []);
  // 🚀 UTILITY: Reliable scroll to bottom function
  const scrollToBottom = useCallback((animated: boolean = true) => {
    try {
      flatListRef.current?.scrollToEnd({ animated });
    } catch (error) {
      }
  }, []);
  // 🚀 IMPROVED: Auto-scroll whenever messages change with better timing
  useEffect(() => {
    if (messages.length > 0) {
      // Clear existing timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
      
      // 🚀 INSTANT SCROLL: Multiple attempts for reliability
      // Immediate scroll (no animation for instant effect)
      safeSetTimeout(() => scrollToBottom(false), 0);
      
      // Backup scroll with animation
      safeSetTimeout(() => scrollToBottom(true), 50);
      
      // Final scroll after layout
      safeSetTimeout(() => scrollToBottom(true), 150);
      
      // Extra scroll for reliability
      safeSetTimeout(() => scrollToBottom(true), 300);
    }
  }, [messages, scrollToBottom, safeSetTimeout]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);
  // ⚡ ULTRA-FAST MESSAGE LOADING - INSTANT DISPLAY
  const loadMessages = useCallback(async (forceRefresh = false) => {
    if (!user || !chatData?.id) return;
    const chatId = String(chatData.id);
    // 🚀 INSTANT LOADING: Check ultra-fast cache first (0ms delay)
    if (!forceRefresh) {
      const instantMessages = ultraFastChatCache.getInstantMessages(chatId);
      if (instantMessages.length > 0) {
        setMessages(instantMessages);
        setLoading(false);
        // Auto scroll immediately
        safeSetTimeout(() => scrollToBottom(false), 0);
        // Background sync after 100ms (non-blocking)
        safeSetTimeout(() => {
          if (!isSending) {
            loadMessages(true);
          }
        }, 100);
        return;
      }
    }
    // Initialize persistence for this chat (background)
    messagePersistence.initializeChatPersistence(chatId).catch(console.error);
    // PRIORITY 1: Check ChatContext global messages
    const globalMessages = getChatMessages(chatId);
    if (globalMessages.length > 0 && !forceRefresh) {
      setMessages(globalMessages);
      setLoading(false);
      // Cache for future instant access
      ultraFastChatCache.cacheMessages(chatId, globalMessages, chatData);
      // Background refresh
      setTimeout(() => {
        if (!isSending) {
          loadMessages(true);
        }
      }, 500);
      return;
    }
    // PRIORITY 2: Check persistence (only if not force refresh)
    if (!forceRefresh) {
      try {
        const persistedMessages = await messagePersistence.getPersistedMessages(chatId);
        if (persistedMessages.length > 0) {
          setMessages(persistedMessages);
          setLoading(false);
          // Cache for instant future access
          ultraFastChatCache.cacheMessages(chatId, persistedMessages, chatData);
          // Background refresh
          setTimeout(() => {
            if (!isSending) {
              loadMessages(true);
            }
          }, 300);
          return;
        }
      } catch (error) {
        }
      // PRIORITY 3: Fallback to old cache
      const cachedMessages = chatMessageCache.getCachedMessages(chatId);
      if (cachedMessages && cachedMessages.messages.length > 0) {
        setMessages(cachedMessages.messages);
        setLoading(false);
        // Upgrade to ultra-fast cache
        ultraFastChatCache.cacheMessages(chatId, cachedMessages.messages, chatData);
        // Background refresh
        setTimeout(() => {
          if (!isSending) {
            loadMessages(true);
          }
        }, 300);
        return;
      }
    }
    // Only show loading if no cached messages
    if (messages.length === 0 && !forceRefresh) {
      setLoading(true);
    }
    try {
      // Fetch messages from database
      const messagesResponse = await apiService.getChatMessages(chatId);
      const chatMessages = Array.isArray(messagesResponse) 
        ? messagesResponse 
        : (messagesResponse as any)?.data || [];
      if (chatMessages.length > 0) {
        const formattedMessages: Message[] = chatMessages.map((msg: any) => {
          // Use the original timestamp from server or create a unique timestamp based on message ID
          let processedTimestamp: string;
          if (msg.timestamp) {
            // If server provides timestamp, use fixServerTimestamp to convert UTC to IST
            processedTimestamp = fixServerTimestamp(msg.timestamp);
          } else {
            // If no timestamp, create a unique one based on message ID to avoid all showing same time
            const baseTime = new Date();
            // Add a small offset based on message ID to make timestamps unique
            const offset = parseInt(msg.id.toString().slice(-2) || '0') * 1000; // Use last 2 digits of ID
            baseTime.setTime(baseTime.getTime() - offset);
            processedTimestamp = formatMessageTime(baseTime);
          }
          return {
            id: msg.id,
            text: msg.text || msg.content,
            isUser: msg.isUser || msg.senderId === user.id,
            timestamp: processedTimestamp,
            status: (msg.status || 'read').toLowerCase() as 'sending' | 'sent' | 'delivered' | 'read',
            sender: msg.sender
          };
        });
        // Sort messages by timestamp (chronological order)
        formattedMessages.sort((a, b) => {
          // Keep temp messages at the end
          if (a.id.startsWith('temp_') && !b.id.startsWith('temp_')) return 1;
          if (!a.id.startsWith('temp_') && b.id.startsWith('temp_')) return -1;
          // For non-temp messages, sort by actual timestamp
          if (!a.id.startsWith('temp_') && !b.id.startsWith('temp_')) {
            return compareTimestamps(a.timestamp, b.timestamp);
          }
          // For temp messages, sort by ID (which includes timestamp)
          return a.id.localeCompare(b.id);
        });
        // IMPROVED: Merge server messages with global state and local messages
        const finalMessages = mergeServerMessages(chatId, formattedMessages);
        setMessages(finalMessages);
        // 🚀 ULTRA-FAST: Cache messages for instant future access
        ultraFastChatCache.cacheMessages(chatId, finalMessages, chatData);
        // Background: Cache in old system and persist
        setTimeout(() => {
          chatMessageCache.cacheMessages(chatId, formattedMessages, chatData);
          messagePersistence.persistMessages(chatId, formattedMessages, true)
            .catch((error) => console.error('Error persisting messages:', error));
        }, 0);
        // Auto scroll to last message after loading
        setTimeout(() => scrollToBottom(false), 200);
      } else {
        // Don't clear messages if we have temp messages
        setMessages(prev => {
          const tempMessages = prev.filter(msg => msg.id.startsWith('temp_'));
          if (tempMessages.length > 0) {
            return prev;
          }
          return [];
        });
      }
    } catch (error) {
      // Don't clear messages on error if we have temp messages
      setMessages(prev => {
        const tempMessages = prev.filter(msg => msg.id.startsWith('temp_'));
        if (tempMessages.length > 0) {
          return prev;
        }
        return [];
      });
    } finally {
      setLoading(false);
    }
  }, [user, chatData, isSending, scrollToBottom]);
  // OPTIMISTIC UI MESSAGE SENDING - INSTANT DISPLAY
  const sendMessage = useCallback(() => {
    if (!message.trim() || !user || !chatData?.id) return;
    const messageText = message.trim();
    const chatId = String(chatData.id);
    const tempId = `temp-${Date.now()}`;
    // Create temporary message for INSTANT UI display
    const tempMessage: Message = {
      id: tempId,
      text: messageText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      status: 'sending', // Gray clock icon 🕓
      sender: { id: user.id, username: user.username || 'You' }
    };
    // 🚀 INSTANT UI UPDATE - Message appears immediately
    setMessages(prev => {
      return [...prev, tempMessage];
    });
    // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
    ultraFastChatCache.addMessageInstantly(chatId, tempMessage);
    // Also add to global state for persistence across screen changes
    addMessageToChat(chatId, tempMessage, true);
    // Tell FCM service that user is sending a message (to suppress notifications)
    fcmService.setUserIsSendingMessage(chatId);
    // Clear input immediately after message appears in UI
    setMessage('');
    Keyboard.dismiss();
    // 🚀 IMPROVED: Multiple auto-scroll attempts for reliability
    // Immediate scroll
    setTimeout(() => scrollToBottom(true), 0);
    // Backup scroll after short delay
    setTimeout(() => scrollToBottom(true), 100);
    // Final scroll after keyboard dismiss
    setTimeout(() => scrollToBottom(true), 300);
    // 📡 ASYNC BACKEND WORK - Runs in background
    const sendToBackend = async () => {
      try {
        let serverResponse = null;
        // Try Socket.io first (real-time)
        if (socketService.isSocketConnected()) {
          try {
            serverResponse = await socketService.sendMessage(chatId, messageText, tempId);
            } catch (socketError) {
            }
        }
        // Fallback to API if socket failed or not connected
        if (!serverResponse || !serverResponse.success) {
          serverResponse = await apiService.sendMessage(chatId, { 
            content: messageText, 
            chatId: chatId, 
            senderId: user.id
          });
          }
        // Replace temp message with real server message
        if (serverResponse && (serverResponse.messageId || serverResponse.id)) {
          const realMessageId = serverResponse.messageId || serverResponse.id;
          const serverTimestamp = serverResponse.timestamp ? 
            fixServerTimestamp(serverResponse.timestamp) : tempMessage.timestamp;
          const finalMessage = {
            ...tempMessage,
            id: realMessageId,
            status: 'sent' as const,
            timestamp: serverTimestamp
          };
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? finalMessage : msg
          ));
          // 🚀 AUTO-SCROLL: Ensure scroll after message replacement
          setTimeout(() => scrollToBottom(true), 50);
          // ⚡ ULTRA-FAST: Replace in ultra-fast cache instantly
          ultraFastChatCache.replaceMessageInstantly(chatId, tempId, finalMessage);
          // Update global state immediately
          addMessageToChat(chatId, finalMessage, true);
          // Background cache/persistence (non-blocking)
          setTimeout(() => {
            chatMessageCache.addMessageToCache(chatId, finalMessage);
            messagePersistence.addMessage(chatId, finalMessage, true)
              .catch((error) => console.error('Error adding message:', error));
          }, 0);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (error) {
        // Mark message as failed - keep it visible with retry option
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...msg,
            status: 'failed' // ❌ Red X icon
          } : msg
        ));
      }
    };
    // Start backend work immediately but don't block UI
    sendToBackend();
  }, [user, chatData, message, addMessageToChat, scrollToBottom]);
  // Retry failed message
  const retryMessage = useCallback((failedMessage: Message) => {
    if (!user || !chatData?.id) return;
    const chatId = String(chatData.id);
    const messageText = failedMessage.text;
    // Update message status to sending
    setMessages(prev => prev.map(msg => 
      msg.id === failedMessage.id ? {
        ...msg,
        status: 'sending'
      } : msg
    ));
    // Retry backend sending
    const retryBackend = async () => {
      try {
        let serverResponse = null;
        // Try Socket.io first
        if (socketService.isSocketConnected()) {
          try {
            serverResponse = await socketService.sendMessage(chatId, messageText, failedMessage.id);
          } catch (socketError) {
            }
        }
        // Fallback to API
        if (!serverResponse || !serverResponse.success) {
          serverResponse = await apiService.sendMessage(chatId, { 
            content: messageText, 
            chatId: chatId, 
            senderId: user.id
          });
        }
        // Update with success
        if (serverResponse && (serverResponse.messageId || serverResponse.id)) {
          const realMessageId = serverResponse.messageId || serverResponse.id;
          setMessages(prev => prev.map(msg => 
            msg.id === failedMessage.id ? {
              ...msg,
              id: realMessageId,
              status: 'sent'
            } : msg
          ));
          } else {
          throw new Error('Retry failed');
        }
      } catch (error) {
        // Mark as failed again
        setMessages(prev => prev.map(msg => 
          msg.id === failedMessage.id ? {
            ...msg,
            status: 'failed'
          } : msg
        ));
      }
    };
    retryBackend();
  }, [user, chatData]);
  // Handle delete chat
  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete this chat with ${chatData.name || 'this user'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteChat(String(chatData.id));
              Alert.alert('Success', 'Chat deleted successfully');
              onBack?.();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
            }
          }
        }
      ]
    );
  }, [chatData.id, chatData.name, onBack]);
  const handleComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} feature will be available in the next update!`);
  };
  const toggleOptionsMenu = useCallback(() => {
    setShowOptionsMenu(!showOptionsMenu);
  }, [showOptionsMenu]);
  // INSTANT PROFILE LOADING
  const loadProfile = useCallback(() => {
    if (!chatData?.id) return;
    // Check cache first
    const cachedProfile = chatMessageCache.getCachedProfile(String(chatData.id));
    if (cachedProfile) {
      setIsOnline(cachedProfile.isOnline || false);
      setLastSeen(cachedProfile.lastSeen || 'recently');
      return;
    }
    // Use provided chat data as fallback
    setIsOnline(chatData.isOnline || false);
    setLastSeen(chatData.lastSeen || 'recently');
  }, [chatData]);
  // ⚡ ULTRA-FAST INITIALIZATION
  useEffect(() => {
    const initializeChat = async () => {
      const chatId = String(chatData.id);
      // 🚀 INSTANT: Initialize ultra-fast cache (if not already done)
      if (!ultraFastChatCache.getCacheStats().initialized) {
        ultraFastChatCache.initialize().catch(console.error);
      }
      // 🚀 INSTANT: Load profile and messages (0ms delay)
      loadProfile();
      loadMessages(false); // Instant from ultra-fast cache
      // 🚀 INSTANT: Auto scroll (immediate) - Multiple attempts for reliability
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 0);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
      // 📡 BACKGROUND: Initialize socket connection (non-blocking)
      setTimeout(async () => {
        const socketInitialized = await socketService.initialize();
        if (socketInitialized) {
          } else {
          // Retry connection after 3 seconds
          setTimeout(async () => {
            await socketService.initialize();
          }, 3000);
        }
      }, 0);
    };
    initializeChat();
    // Monitor socket connection status (background)
    const checkConnection = () => {
      const connected = socketService.isSocketConnected();
      if (!connected) {
        socketService.connect();
      }
    };
    const interval = setInterval(checkConnection, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [loadProfile, loadMessages]);
  // FCM Integration - Set current chat for notification suppression
  useEffect(() => {
    if (chatData?.id) {
      const chatId = String(chatData.id);
      fcmService.setCurrentChatId(chatId);
      socketService.setCurrentChatId(chatId); // Add socket service tracking
      // Mark messages as read when entering chat
      if (user?.id) {
        apiService.markMessagesAsRead(chatId).then(() => {
          // Notify other participants via socket that messages were read
          if (socketService.isSocketConnected()) {
            socketService.updateMessageStatus('', 'read', chatId);
          }
        }).catch(error => {
          });
      }
    }
    // Cleanup when leaving chat
    return () => {
      fcmService.setCurrentChatId(null);
      socketService.setCurrentChatId(null); // Add socket service cleanup
    };
  }, [chatData?.id, user?.id]);
  // Socket Integration - Join chat room and handle real-time updates
  useEffect(() => {
    if (!chatData?.id || !user?.id) return;
    const chatId = String(chatData.id);
    // Join chat room
    socketService.joinChat(chatId);
    // Listen for new messages
    const handleNewMessage = (socketMessage: any) => {
      // Only add message if it's for this chat
      if (socketMessage.chatId === chatId) {
        const newMessage: Message = {
          id: socketMessage.id,
          text: socketMessage.text || socketMessage.content,
          isUser: socketMessage.sender?.id === user.id,
          timestamp: fixServerTimestamp(socketMessage.timestamp) || formatMessageTime(new Date()),
          status: socketMessage.sender?.id === user.id ? 'sent' : 'delivered', // Only delivered for incoming messages
          sender: socketMessage.sender
        };
        // IMPROVED: Better duplicate check with temp message replacement
        setMessages(prev => {
          // Check if this exact message ID already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          // Check if a temp message exists with same tempMessageId (replace it)
          if (socketMessage.tempMessageId) {
            const tempMsgIndex = prev.findIndex(msg => msg.id === socketMessage.tempMessageId);
            if (tempMsgIndex !== -1) {
              const updated = [...prev];
              updated[tempMsgIndex] = newMessage;
              // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
              ultraFastChatCache.addMessageInstantly(chatId, newMessage);
              // Also update global state
              addMessageToChat(chatId, newMessage, true);
              return updated;
            }
          }
          // Check if a temp message exists with same content (fallback replacement)
          const tempMsgIndex = prev.findIndex(msg => 
            msg.id.startsWith('temp_') &&
            msg.text === newMessage.text && 
            msg.sender?.id === newMessage.sender?.id
          );
          if (tempMsgIndex !== -1) {
            const updated = [...prev];
            updated[tempMsgIndex] = newMessage;
            // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
            ultraFastChatCache.addMessageInstantly(chatId, newMessage);
            // Also update global state
            addMessageToChat(chatId, newMessage, true);
            return updated;
          }
          // New message - add it
          // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
          ultraFastChatCache.addMessageInstantly(chatId, newMessage);
          // Also add to global state
          addMessageToChat(chatId, newMessage, true);
          return [...prev, newMessage];
        });
        // 🚀 IMPROVED: Auto-scroll to bottom with multiple attempts
        setTimeout(() => scrollToBottom(true), 50);
        setTimeout(() => scrollToBottom(true), 150);
      }
    };
    // Use proper socket message listener
    const unsubscribe = socketService.onNewMessage(handleNewMessage);
    // No status updates needed - keep only single tick
    const handleMessageStatusUpdate = (data: { messageId: string; status: string; userId?: string }) => {
      // Do nothing - we only want single tick
      };
    // Add status update listener using public method
    const unsubscribeStatusUpdates = socketService.onMessageStatusUpdate(handleMessageStatusUpdate);
    // Cleanup
    return () => {
      socketService.leaveChat(chatId);
      unsubscribe();
      unsubscribeStatusUpdates();
    };
  }, [chatData?.id, user?.id]);
  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUserMessage = item.isUser;
    return (
      <View style={[
        styles.messageContainer,
        isUserMessage ? styles.userMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isUserMessage 
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.otherBubble, { backgroundColor: colors.backgroundSecondary }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isUserMessage ? '#ffffff' : colors.text }
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              { color: isUserMessage ? 'rgba(255,255,255,0.7)' : colors.textMuted }
            ]}>
              {typeof item.timestamp === 'string' ? item.timestamp : formatMessageTime(item.timestamp)}
            </Text>
            {isUserMessage && (
              <View style={styles.messageStatusContainer}>
                <Text style={[
                  styles.messageTicks,
                  { color: item.status === 'sending' ? '#9e9e9e' : 
                           item.status === 'failed' ? '#f44336' : 
                           '#000000' }
                ]}>
                  {item.status === 'sending' ? '🕓' : 
                   item.status === 'sent' ? '✓' : 
                   item.status === 'failed' ? '❌' : '✓'}
                </Text>
                {item.status === 'failed' && (
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => retryMessage(item)}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [colors]);
  // Header component - render directly without useMemo to avoid undefined issues
  const renderHeader = () => {
    try {
      return (
        <View style={[styles.header, { backgroundColor: colors?.background || '#000', borderBottomColor: colors?.border || '#333' }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors?.text || '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => chatData?.userId && onUserProfile?.(chatData.userId)}
          >
            <Image 
              source={{ uri: chatData?.avatar || 'https://via.placeholder.com/40' }} 
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors?.text || '#fff' }]} numberOfLines={1}>
                {chatData?.name || 'Chat'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleComingSoon('Voice Call')}
            >
              <Phone size={20} color={colors?.text || '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleComingSoon('Video Call')}
            >
              <Video size={20} color={colors?.text || '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowOptionsMenu(true)}
            >
              <MoreVertical size={20} color={colors?.text || '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      );
    } catch (error) {
      return (
        <View style={{ height: 60, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>Chat Header</Text>
        </View>
      );
    }
  };
  // Input component - render directly to avoid undefined issues
  const renderMessageInput = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.inputContainer}
    >
      <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          onPress={sendMessage}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          disabled={!message.trim() || isSending}
          activeOpacity={0.7}
        >
          <Send size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `msg-${item.id}-${index}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // 🚀 IMPROVED: Scroll to last message with slight delay for better reliability
          setTimeout(() => scrollToBottom(true), 50);
        }}
        removeClippedSubviews={false}
        maxToRenderPerBatch={50}
        windowSize={20}
        initialNumToRender={50}
        updateCellsBatchingPeriod={0}
        getItemLayout={undefined}
        extraData={messages}
        onLayout={() => {
          // Auto scroll to last message when chat opens - Multiple attempts
          setTimeout(() => scrollToBottom(false), 0);
          setTimeout(() => scrollToBottom(false), 50);
          setTimeout(() => scrollToBottom(false), 100);
        }}
      />
      {renderMessageInput()}
      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[styles.optionsMenu, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleDeleteChat();
              }}
            >
              <Trash2 size={20} color="#ff4444" />
              <Text style={[styles.optionText, styles.destructiveText]}>Delete Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleComingSoon('Block User');
              }}
            >
              <UserX size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Block User</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleComingSoon('Report User');
              }}
            >
              <Flag size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Report User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
});
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageContainer: {
    marginVertical: Spacing.xs,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.sm,
  },
  otherBubble: {
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  messageTicks: {
    fontSize: FontSizes.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.md,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  optionsMenu: {
    borderRadius: BorderRadius.md,
    marginTop: Platform.OS === 'ios' ? 60 : 20,
    marginRight: Spacing.lg,
    paddingVertical: Spacing.sm,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionText: {
    fontSize: FontSizes.md,
    marginLeft: Spacing.md,
    fontWeight: FontWeights.medium,
  },
  destructiveText: {
    color: '#ff4444',
    fontWeight: FontWeights.semibold,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    backgroundColor: '#f44336',
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: '#ffffff',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
});
export default FastChatScreen;
