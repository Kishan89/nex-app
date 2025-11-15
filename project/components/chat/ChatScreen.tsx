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
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, MoreVertical, Trash2, UserX, Flag, Users, Camera, Edit3 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
// Memory management will be handled by regular setTimeout for now
import { apiService } from '@/lib/api';
import { chatMessageCache } from '@/store/chatMessageCache';
import { chatCache } from '@/store/chatCache';
import { formatMessageTime, getCurrentTimestamp, fixServerTimestamp, compareTimestamps } from '@/lib/timestampUtils';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';
import { fcmService } from '@/lib/fcmService';
import { socketService } from '@/lib/socketService';
import { messagePersistence } from '@/lib/messagePersistence';
import { ultraFastChatCache } from '@/lib/ChatCache';
import { router } from 'expo-router';
interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  username?: string;
  isGroup?: boolean;
}
interface ChatScreenProps {
  chatData: ChatData;
  onBack?: () => void;
  onUserProfile?: (userId: string) => void;
  isNewChat?: boolean;
  onFirstMessage?: (messageContent: string) => Promise<string>;
  forceInitialRefresh?: boolean;
  onChatDeleted?: (chatId: string) => void;
}
const ChatScreen = React.memo(function ChatScreen({ 
  chatData, 
  onBack, 
  onUserProfile,
  isNewChat = false,
  onFirstMessage,
  forceInitialRefresh = false,
  onChatDeleted
}: ChatScreenProps) {
  // Safety check for chatData - if no data, return null (parent will handle)
  if (!chatData || !chatData.id) {
    return null;
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
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupDescription, setGroupDescription] = useState(chatData?.description || '');
  const [groupName, setGroupName] = useState(chatData?.name || '');
  const [groupAvatar, setGroupAvatar] = useState(chatData?.avatar || '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  useEffect(() => {
    if (chatData && chatData.isGroup) {
      console.log('Syncing group data:', { name: chatData.name, description: chatData.description, avatar: chatData.avatar });
      if (chatData.name) setGroupName(chatData.name);
      if (chatData.description) setGroupDescription(chatData.description);
      if (chatData.avatar) setGroupAvatar(chatData.avatar);
    }
  }, [chatData?.name, chatData?.description, chatData?.avatar, chatData?.isGroup]);
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const socketListenersRef = useRef<(() => void)[]>([]);
  
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
    
    console.log('📥 [LOAD MESSAGES] Starting...', { chatId, forceRefresh, currentMessageCount: messages.length });
    
    // If force refresh, clear ALL caches first BUT preserve temp messages
    if (forceRefresh) {
      console.log('🔄 [FORCE REFRESH] Bypassing all caches, fetching from database...');
      
      // IMPORTANT: Save temp messages before clearing cache
      const tempMessages = messages.filter(msg => msg.id.startsWith('temp-'));
      if (tempMessages.length > 0) {
        console.log('💾 [PRESERVE] Saving', tempMessages.length, 'temp messages before cache clear');
      }
      
      console.log('🗑️ [CACHE CLEAR] Clearing all caches for chat:', chatId);
      ultraFastChatCache.clearChatCache(chatId);
      chatMessageCache.clearChatCache(chatId);
      
      // Don't return, continue to fetch from database
      // Temp messages will be merged with fresh messages later
    } else {
      // PRIORITY 1: Ultra-fast cache (instant load)
      const ultraFastCached = ultraFastChatCache.getInstantMessages(chatId);
      if (ultraFastCached && ultraFastCached.length > 0) {
        console.log('⚡ [CACHE HIT] Loaded from ultra-fast cache:', ultraFastCached.length, 'messages');
        // Filter out temp messages to prevent showing duplicates with stuck "sending" status
        const filteredMessages = ultraFastCached.filter(msg => !msg.id.startsWith('temp-'));
        setMessages(filteredMessages);
        setLoading(false);
        // Background refresh
        setTimeout(() => {
          if (!isSending) {
            loadMessages(true);
          }
        }, 300);
        return;
      }
      // PRIORITY 2: Try to get from global state first (instant)
      try {
        const globalMessages = getChatMessages(chatId);
        if (globalMessages && globalMessages.length > 0) {
          // Filter out temp messages to prevent showing duplicates with stuck "sending" status
          const filteredMessages = globalMessages.filter(msg => !msg.id.startsWith('temp-'));
          setMessages(filteredMessages);
          setLoading(false);
          // Cache in ultra-fast cache (without temp messages)
          ultraFastChatCache.cacheMessages(chatId, filteredMessages, chatData);
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
        // Filter out temp messages to prevent showing duplicates with stuck "sending" status
        const filteredMessages = cachedMessages.messages.filter(msg => !msg.id.startsWith('temp-'));
        setMessages(filteredMessages);
        setLoading(false);
        // Upgrade to ultra-fast cache (without temp messages)
        ultraFastChatCache.cacheMessages(chatId, filteredMessages, chatData);
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
      console.log('🌐 [API] Fetching messages from database for chat:', chatId);
      console.log('🔍 [API] Current user ID:', user.id);
      
      const messagesResponse = await apiService.getChatMessages(chatId);
      
      console.log('📦 [API] Raw response received:', {
        isArray: Array.isArray(messagesResponse),
        type: typeof messagesResponse,
        length: Array.isArray(messagesResponse) ? messagesResponse.length : 'N/A'
      });
      
      const chatMessages = Array.isArray(messagesResponse) 
        ? messagesResponse 
        : (messagesResponse as any)?.data || [];
      
      console.log('✅ [API] Received', chatMessages.length, 'messages from database');
      
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
        let finalMessages = mergeServerMessages(chatId, formattedMessages);
        
        // If force refresh, merge with existing temp messages
        if (forceRefresh) {
          const currentTempMessages = messages.filter(msg => msg.id.startsWith('temp-'));
          if (currentTempMessages.length > 0) {
            console.log('🔄 [MERGE] Merging', currentTempMessages.length, 'temp messages with fresh data');
            // Add temp messages that don't have a real message yet
            currentTempMessages.forEach(tempMsg => {
              // Check if this temp message was replaced by a real message
              const hasRealMessage = finalMessages.some(msg => 
                msg.text === tempMsg.text && 
                msg.sender?.id === tempMsg.sender?.id &&
                !msg.id.startsWith('temp-')
              );
              if (!hasRealMessage) {
                finalMessages.push(tempMsg);
              }
            });
            // Re-sort after adding temp messages
            finalMessages.sort((a, b) => {
              if (a.id.startsWith('temp-') && !b.id.startsWith('temp-')) return 1;
              if (!a.id.startsWith('temp-') && b.id.startsWith('temp-')) return -1;
              return a.id.localeCompare(b.id);
            });
          }
        }
        
        console.log('✅ [MESSAGES] Setting', finalMessages.length, 'messages in state');
        setMessages(finalMessages);
        
        // 🚀 ULTRA-FAST: Cache messages for instant future access
        ultraFastChatCache.cacheMessages(chatId, finalMessages, chatData);
        console.log('✅ [CACHE] Messages cached successfully');
        
        // Background: Cache in old system and persist
        setTimeout(() => {
          chatMessageCache.cacheMessages(chatId, formattedMessages, chatData);
          messagePersistence.persistMessages(chatId, formattedMessages, true)
            .catch((error) => console.error('Error persisting messages:', error));
        }, 0);
        // Auto scroll to last message after loading
        setTimeout(() => scrollToBottom(false), 200);
      } else {
        console.log('⚠️ [API] No messages received from database');
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
  const sendMessage = useCallback(async () => {
    if (!message.trim() || !user || !chatData?.id) return;
    const messageText = message.trim();
    let chatId = String(chatData.id);
    const tempId = `temp-${Date.now()}`;
    
    // 🆕 NEW CHAT HANDLING: If this is a new chat, create it first
    // Only treat as new if ID is literally 'new' (not a real chat ID)
    if (isNewChat && onFirstMessage && chatId === 'new') {
      console.log('🆕 [NEW CHAT] Creating chat with first message...');
      try {
        // Clear input immediately for instant feedback
        setMessage('');
        Keyboard.dismiss();
        
        // Show sending indicator
        const tempMessage: Message = {
          id: tempId,
          text: messageText,
          isUser: true,
          timestamp: new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          status: 'sending',
          sender: {
            id: user.id,
            username: user.username || 'You',
            avatar: user.avatar || null,
          },
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Create chat and send message (parent handles it)
        const realChatId = await onFirstMessage(messageText);
        console.log('✅ [NEW CHAT] Chat created with ID:', realChatId);
        
        // 🚀 FIX: Remove temp message since parent already sent it
        // Socket broadcast will add the real message from server
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        console.log('✅ [NEW CHAT] Temp message removed, waiting for socket broadcast');
        
        return;
      } catch (error) {
        console.error('❌ [NEW CHAT] Failed to create chat:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
        // Restore the message in input
        setMessage(messageText);
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        return;
      }
    }
    
    
    console.log('📤 [SEND] Sending message:', {
      tempId,
      text: messageText.substring(0, 20) + '...',
      chatId,
      userId: user.id
    });
    
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
      sender: {
        id: user.id,
        username: user.username || 'You',
        avatar: user.avatar || null,
      },
    };
    
    console.log('✅ [OPTIMISTIC] Adding temp message to UI:', tempId);
    
    // 🚀 INSTANT UI UPDATE - Message appears immediately
    setMessages(prev => {
      return [...prev, tempMessage];
    });
    // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
    ultraFastChatCache.addMessageInstantly(chatId, tempMessage);
    // DON'T add temp message to global state - only add final server message
    // This prevents duplicate messages (temp + server) in global state
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
        console.log('🔌 [SOCKET] Sending via socket...');
        serverResponse = await socketService.sendMessage(chatId, messageText, tempId);
        console.log('✅ [SOCKET] Socket response:', serverResponse);
        
        // Replace temp message with server message (sender doesn't receive broadcast)
        if (serverResponse && serverResponse.success && serverResponse.messageId) {
          // Format timestamp from server (ISO) to local time
          const formattedTimestamp = serverResponse.timestamp 
            ? new Date(serverResponse.timestamp).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            : new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              
          const serverMessage: Message = {
            id: serverResponse.messageId,
            text: messageText,
            isUser: true,
            timestamp: formattedTimestamp,
            status: 'sent',
            sender: {
              id: user.id,
              username: user.username || 'You',
              avatar: user.avatar || null,
            },
          };
          
          // Replace temp message with real message
          console.log('🔄 [REPLACE] Replacing temp message with server message', {
            tempId,
            serverMessageId: serverMessage.id,
            timestamp: serverMessage.timestamp
          });
          
          setMessages(prev => {
            const replaced = prev.map(msg => 
              msg.id === tempId ? serverMessage : msg
            );
            console.log('✅ [REPLACE] Temp message replaced in local state');
            return replaced;
          });
          
          // Update cache
          ultraFastChatCache.replaceMessageInstantly(chatId, tempId, serverMessage);
          console.log('✅ [REPLACE] Temp message replaced in cache');
          
          // Update global state with server message (duplicate check enabled)
          setTimeout(() => {
            addMessageToChat(chatId, serverMessage, false);
            console.log('✅ [GLOBAL] Server message added to global state');
          }, 0);
        }
        
        if (!serverResponse || !serverResponse.success) {
          console.log('🌐 [API] Falling back to HTTP API...');
          serverResponse = await apiService.sendMessage(chatId, { 
            content: messageText, 
            chatId: chatId, 
            senderId: user.id
          });
          console.log('✅ [API] API response:', serverResponse);
          
          
          // HTTP API fallback - also need to replace temp message if successful
          if (serverResponse && (serverResponse.messageId || serverResponse.id)) {
            const realMessageId = serverResponse.messageId || serverResponse.id;
            
            // Format timestamp from server (ISO) to local time
            const formattedTimestamp = serverResponse.timestamp 
              ? new Date(serverResponse.timestamp).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : new Date().toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                
            const serverMessage: Message = {
              id: realMessageId,
              text: messageText,
              isUser: true,
              timestamp: formattedTimestamp,
              status: 'sent',
              sender: {
                id: user.id,
                username: user.username || 'You',
                avatar: user.avatar || null,
              },
            };
            
            // Replace temp message with real message
            console.log('🔄 [REPLACE HTTP] Replacing temp message with server message', {
              tempId,
              serverMessageId: serverMessage.id,
              timestamp: serverMessage.timestamp
            });
            
            setMessages(prev => {
              const replaced = prev.map(msg => 
                msg.id === tempId ? serverMessage : msg
              );
              console.log('✅ [REPLACE HTTP] Temp message replaced in local state');
              return replaced;
            });
            
            // Update cache
            ultraFastChatCache.replaceMessageInstantly(chatId, tempId, serverMessage);
            console.log('✅ [REPLACE HTTP] Temp message replaced in cache');
            
            // Update global state with server message (duplicate check enabled)
            setTimeout(() => {
              addMessageToChat(chatId, serverMessage, false);
              console.log('✅ [GLOBAL HTTP] Server message added to global state');
            }, 0);
          }
        }
        
        // Verify message was sent successfully
        if (!serverResponse || (!serverResponse.messageId && !serverResponse.id)) {
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
  }, [user, chatData, message, addMessageToChat, scrollToBottom, isNewChat, onFirstMessage]);
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
          onPress: () => {
            const chatId = String(chatData.id);
            
            console.log('🗑️ [DELETE] Instant UI deletion started:', chatId);
            
            // 🚀 INSTANT #1: Notify parent to remove from list immediately
            onChatDeleted?.(chatId);
            
            // 🚀 INSTANT #2: Remove from all caches immediately (synchronous)
            chatCache.removeChatFromCache(chatId);
            chatMessageCache.clearChatCache(chatId);
            ultraFastChatCache.clearChatCache(chatId);
            
            // Clear from AsyncStorage
            if (user?.id) {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.removeItem(`user_chats_${user.id}`).catch(() => {});
            }
            
            console.log('✅ [DELETE] UI updated instantly, chat removed from all caches');
            
            // 🚀 INSTANT #3: Go back immediately after cache cleanup
            onBack?.();
            
            // 📡 BACKGROUND SYNC: Delete from backend (non-blocking)
            setTimeout(() => {
              console.log('🌐 [DELETE] Starting backend sync...');
              apiService.deleteChat(chatId)
                .then(() => {
                  console.log('✅ [DELETE] Backend sync successful:', chatId);
                })
                .catch((error) => {
                  console.error('❌ [DELETE] Backend sync failed:', error);
                  // Silently fail - chat already removed from UI
                  // User won't notice since UI is already updated
                });
            }, 100); // Small delay to let UI update complete first
          }
        }
      ]
    );
  }, [chatData.id, chatData.name, onBack, onChatDeleted, user?.id]);
  const handleSetGroupAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to set group avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        try {
          const uploadResult = await apiService.uploadImageFile(imageUri, 'file', 'group-avatars');
          const updateResponse = await apiService.updateGroupAvatar(String(chatData.id), uploadResult.url);
          
          setGroupAvatar(uploadResult.url);
          if (chatData) {
            chatData.avatar = uploadResult.url;
          }
          Alert.alert('Success', 'Group avatar updated successfully!');
        } catch (error) {
          Alert.alert('Error', 'Failed to update group avatar. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const handleEditDescription = () => {
    setGroupDescription(chatData?.description || '');
    setEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!groupDescription.trim()) {
      Alert.alert('Error', 'Description cannot be empty');
      return;
    }
    
    try {
      await apiService.updateGroupDescription(String(chatData.id), groupDescription.trim());
      setEditingDescription(false);
      if (chatData) {
        chatData.description = groupDescription.trim();
      }
      Alert.alert('Success', 'Group description updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update description. Please try again.');
    }
  };

  const handleEditName = () => {
    setGroupName(chatData?.name || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }
    
    try {
      await apiService.updateGroupName(String(chatData.id), groupName.trim());
      setEditingName(false);
      if (chatData) {
        chatData.name = groupName.trim();
      }
      Alert.alert('Success', 'Group name updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update group name. Please try again.');
    }
  };

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
  // ⚡ ULTRA-FAST INITIALIZATION WITH APP STATE HANDLING
  useEffect(() => {
    const initializeChat = async () => {
      const chatId = String(chatData.id);
      
      console.log('🚀 [INIT] Initializing chat:', chatId);
      
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
          console.log('✅ [SOCKET] Socket initialized successfully');
        } else {
          console.log('⚠️ [SOCKET] Socket initialization failed, retrying...');
          // Retry connection after 3 seconds
          setTimeout(async () => {
            await socketService.initialize();
          }, 3000);
        }
      }, 0);
    };
    
    initializeChat();
    
    // 🔄 APP STATE LISTENER: Reconnect socket when app returns from background
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 [APP STATE] Changed from', appState.current, 'to', nextAppState);
      
      // App came back to foreground from background/inactive
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 [RECONNECT] App returned to foreground, reconnecting socket...');
        
        // Force reconnect socket
        if (!socketService.isSocketConnected()) {
          console.log('🔌 [RECONNECT] Socket disconnected, reconnecting...');
          await socketService.connect();
        }
        
        // Reload messages from database to get any missed messages
        console.log('📥 [RELOAD] Fetching fresh messages from database...');
        await loadMessages(true); // Force refresh from server
      }
      
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Monitor socket connection status (background)
    const checkConnection = () => {
      const connected = socketService.isSocketConnected();
      if (!connected) {
        console.log('⚠️ [MONITOR] Socket disconnected, reconnecting...');
        socketService.connect();
      }
    };
    const interval = setInterval(checkConnection, 15000); // Check every 15s
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
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
  // 🔌 SOCKET INTEGRATION - Join chat room and handle real-time updates
  useEffect(() => {
    if (!chatData?.id || !user?.id) return;
    const chatId = String(chatData.id);
    
    console.log('🔌 [SOCKET] Setting up socket listeners for chat:', chatId);
    
    // Clean up any existing listeners first
    socketListenersRef.current.forEach(unsubscribe => unsubscribe());
    socketListenersRef.current = [];
    
    // Join chat room
    socketService.joinChat(chatId);
    
    // Listen for new messages
    const handleNewMessage = (socketMessage: any) => {
      console.log('📨 [SOCKET] Received message:', {
        id: socketMessage.id,
        tempMessageId: socketMessage.tempMessageId,
        senderId: socketMessage.sender?.id,
        currentUserId: user.id,
        isFromCurrentUser: socketMessage.sender?.id === user.id,
        text: socketMessage.text?.substring(0, 20) + '...',
        chatId: socketMessage.chatId
      });
      
      // Only add message if it's for this chat
      if (socketMessage.chatId === chatId) {
        // CRITICAL FIX: Skip messages from current user in socket listener
        // Sender receives their message via callback response only, NOT via broadcast
        if (socketMessage.sender?.id === user.id) {
          console.log('🔕 [SKIP] Message from current user - sender gets message via callback, not broadcast');
          return;
        }
        
        const newMessage: Message = {
          id: socketMessage.id,
          text: socketMessage.text || socketMessage.content,
          isUser: false, // Always false since we skip current user's messages above
          timestamp: fixServerTimestamp(socketMessage.timestamp) || formatMessageTime(new Date()),
          status: 'delivered', // Always delivered for incoming messages
          sender: socketMessage.sender
        };
        
        let shouldUpdateGlobalState = false;
        let finalMessage: Message | null = null;
        
        setMessages(prev => {
          console.log('🔍 [CHECK] Current messages count:', prev.length);
          
          // Check if this exact message ID already exists (prevent duplicates)
          if (prev.some(msg => msg.id === newMessage.id)) {
            console.log('❌ [SKIP] Message ID already exists:', newMessage.id);
            return prev;
          }
          
          // New message from another user - add it
          // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
          ultraFastChatCache.addMessageInstantly(chatId, newMessage);
          // Mark for global state update (outside setState)
          shouldUpdateGlobalState = true;
          finalMessage = newMessage;
          return [...prev, newMessage];
        });
        
        // Update global state AFTER setState completes (avoids React warning)
        // Note: Global ChatContext listener already handles this for incoming messages
        // No need to add here since we skip current user messages in socket listener
        if (shouldUpdateGlobalState && finalMessage) {
          setTimeout(() => {
            addMessageToChat(chatId, finalMessage!, false); // Enable duplicate check
          }, 0);
        }
        // 🚀 IMPROVED: Auto-scroll to bottom with multiple attempts
        setTimeout(() => scrollToBottom(true), 50);
        setTimeout(() => scrollToBottom(true), 150);
      }
    };
    // Use proper socket message listener
    const unsubscribe = socketService.onNewMessage(handleNewMessage);
    socketListenersRef.current.push(unsubscribe);
    
    // No status updates needed - keep only single tick
    const handleMessageStatusUpdate = (data: { messageId: string; status: string; userId?: string }) => {
      // Do nothing - we only want single tick
    };
    
    // Add status update listener using public method
    const unsubscribeStatusUpdates = socketService.onMessageStatusUpdate(handleMessageStatusUpdate);
    socketListenersRef.current.push(unsubscribeStatusUpdates);
    
    console.log('✅ [SOCKET] Socket listeners attached for chat:', chatId);
    
    // Cleanup
    return () => {
      console.log('🧹 [SOCKET] Cleaning up socket listeners for chat:', chatId);
      socketService.leaveChat(chatId);
      socketListenersRef.current.forEach(unsub => unsub());
      socketListenersRef.current = [];
    };
  }, [chatData?.id, user?.id]);
  
  // 🎯 FOCUS EFFECT: Reload messages when screen comes into focus (from notification or navigation)
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 [FOCUS] ChatScreen focused, checking for updates...', { forceInitialRefresh });
      
      // Ensure socket is connected
      if (!socketService.isSocketConnected()) {
        console.log('🔌 [FOCUS] Socket disconnected, reconnecting...');
        socketService.connect();
      }
      
      // Rejoin chat room in case we were disconnected
      if (chatData?.id) {
        socketService.joinChat(String(chatData.id));
      }
      
      // If coming from notification or forceInitialRefresh is true, reload messages
      if (forceInitialRefresh) {
        console.log('🔄 [FOCUS] Force refresh enabled, reloading messages from server...');
        setTimeout(() => {
          loadMessages(true); // Force refresh from server
        }, 100);
      }
      
      return () => {
        console.log('👋 [FOCUS] ChatScreen unfocused');
      };
    }, [forceInitialRefresh, chatData?.id, loadMessages])
  );
  
  // 🔄 WATCH forceInitialRefresh: Reload messages when prop changes
  useEffect(() => {
    if (forceInitialRefresh && chatData?.id) {
      console.log('🔄 [FORCE REFRESH] forceInitialRefresh changed to true, reloading messages...');
      loadMessages(true); // Force refresh from server
    }
  }, [forceInitialRefresh, chatData?.id, loadMessages]);
  
  // Helper function to render text with clickable links
  const renderTextWithLinks = useCallback((text: string, isUserMessage: boolean) => {
    // URL regex pattern - improved to catch more URLs
    const urlPattern = /(https?:\/\/[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[^\s]{2,})/g;
    const matches = [];
    let match;
    
    while ((match = urlPattern.exec(text)) !== null) {
      matches.push({
        url: match[0],
        index: match.index,
        length: match[0].length
      });
    }
    
    if (matches.length === 0) {
      return text;
    }
    
    const parts = [];
    let lastIndex = 0;
    
    matches.forEach((matchInfo, i) => {
      // Add text before the URL
      if (matchInfo.index > lastIndex) {
        parts.push(
          <Text key={`text-${i}-before`}>
            {text.substring(lastIndex, matchInfo.index)}
          </Text>
        );
      }
      
      // Add clickable URL using TouchableOpacity
      const url = matchInfo.url;
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      parts.push(
        <Text key={`link-${i}`}>
          <Text
            style={[styles.linkText, { color: isUserMessage ? '#ffffff' : '#3B8FE8' }]}
            onPress={() => {
              console.log('🔗 Opening URL:', fullUrl);
              Linking.openURL(fullUrl).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open link');
              });
            }}
          >
            {url}
          </Text>
        </Text>
      );
      
      lastIndex = matchInfo.index + matchInfo.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key="text-end">
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    return <>{parts}</>;
  }, []);
  
  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUserMessage = item.isUser;
    const isGroupChat = chatData?.isGroup;

    return (
      <View style={[
        styles.messageContainer,
        isUserMessage ? styles.userMessage : styles.otherMessage
      ]}>
        <View style={styles.messageInnerRow}>
          {/* Avatar only for LEFT (other users') messages in group chats */}
          {isGroupChat && !isUserMessage && item.sender && (
            item.sender.avatar ? (
              <Image
                source={{ uri: item.sender.avatar }}
                style={styles.senderAvatar}
              />
            ) : (
              <Image
                source={require('@/assets/images/default-avatar.png')}
                style={styles.senderAvatar}
              />
            )
          )}

          <View style={[
            styles.messageBubble,
            isUserMessage 
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.otherBubble, { backgroundColor: colors.backgroundSecondary }]
          ]}>
            {/* Sender name only for LEFT messages in group chats, inside bubble */}
            {isGroupChat && !isUserMessage && item.sender && (
              <View style={styles.senderInfoContainer}>
                <Text
                  style={[
                    styles.senderName,
                    // Use app's light blue color for username (same as links)
                    { color: '#3B8FE8' }
                  ]}
                >
                  {item.sender.username || 'Unknown'}
                </Text>
              </View>
            )}

            <Text style={[
              styles.messageText,
              { color: isUserMessage ? '#ffffff' : colors.text }
            ]}>
              {renderTextWithLinks(item.text, isUserMessage)}
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
      </View>
    );
  }, [colors, chatData?.isGroup]);
  // Header component - render directly without useMemo to avoid undefined issues
  const renderHeader = () => {
    // Ensure we always have chatData to prevent disappearing header
    if (!chatData) return null;
    
    // Use stable values - prefer existing state over potentially incomplete chatData
    const displayName = chatData.isGroup 
      ? (groupName || chatData.name || 'Group') 
      : (chatData.username || chatData.name || 'User');
    
    const displayAvatar = chatData.isGroup 
      ? (groupAvatar || chatData.avatar) 
      : chatData.avatar;
    
    const displayUserId = chatData.userId || 'unknown';
    
    return (
      <View style={[styles.header, { backgroundColor: colors?.background || '#000', borderBottomColor: colors?.border || '#333' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors?.text || '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => {
            console.log('Header clicked', { isGroup: chatData.isGroup, userId: displayUserId, name: displayName });
            if (chatData.isGroup) {
              setShowGroupInfo(true);
            } else if (displayUserId && displayUserId !== 'unknown' && displayUserId !== 'loading') {
              console.log('Navigating to profile:', displayUserId);
              router.push(`/profile/${displayUserId}`);
            } else {
              console.log('Cannot navigate - invalid userId:', displayUserId);
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {displayAvatar ? (
            <Image 
              source={{ uri: displayAvatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors?.primary + (colors?.background === '#ffffff' ? '15' : '20') || '#e385ec20' }]}>
              {chatData.isGroup ? (
                <Users size={20} color={colors?.primary || '#e385ec'} />
              ) : (
                <Image 
                  source={require('@/assets/images/default-avatar.png')} 
                  style={styles.avatar}
                />
              )}
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors?.text || '#fff' }]} numberOfLines={1}>
              {displayName}
            </Text>
            {chatData.isGroup && (
              <Text style={[styles.status, { color: colors?.textMuted || '#999' }]} numberOfLines={1}>
                {chatData.memberCount ? `${chatData.memberCount} members` : 'Group'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowOptionsMenu(true)}
          >
            <MoreVertical size={20} color={colors?.text || '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    );
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
      {/* StatusBar is handled globally in main app layout */}
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `msg-${item.id}-${index}`}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent
        ]}
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
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              {loading ? '⏳ Loading messages...' : '👋 Start a conversation!'}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
              {loading ? 'Please wait...' : 'Send a message to begin chatting'}
            </Text>
          </View>
        }
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
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupInfo(false)}
      >
        <View style={styles.groupInfoOverlay}>
          <View style={[styles.groupInfoModal, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.groupInfoHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)} style={styles.groupInfoCloseButton}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.groupInfoTitle, { color: colors.text }]}>Group Info</Text>
              <View style={styles.groupInfoHeaderSpacer} />
            </View>
            
            {/* Group Avatar and Name */}
            <View style={styles.groupInfoContent}>
              <View style={styles.groupAvatarSection}>
                <View style={styles.groupAvatarContainer}>
                  {(groupAvatar || chatData?.avatar) ? (
                    <Image 
                      source={{ uri: groupAvatar || chatData?.avatar }} 
                      style={styles.groupAvatarLarge}
                    />
                  ) : (
                    <View style={[styles.groupAvatarLarge, styles.groupAvatarPlaceholder, { backgroundColor: colors.primary + (colors.background === '#ffffff' ? '15' : '20') }]}>
                      <Users size={40} color={colors.primary} />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[styles.groupAvatarEditButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setShowGroupInfo(false);
                      handleSetGroupAvatar();
                    }}
                  >
                    <Camera size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                {editingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
                      value={groupName}
                      onChangeText={setGroupName}
                      placeholder="Group name"
                      placeholderTextColor={colors.textMuted}
                      maxLength={50}
                      autoFocus
                    />
                    <View style={styles.nameActions}>
                      <TouchableOpacity 
                        style={[styles.nameButton, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setEditingName(false)}
                      >
                        <Text style={[styles.nameButtonText, { color: colors.textMuted }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.nameButton, { backgroundColor: colors.primary }]}
                        onPress={handleSaveName}
                      >
                        <Text style={[styles.nameButtonText, { color: '#ffffff' }]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleEditName}>
                    <Text style={[styles.groupNameLarge, { color: colors.text }]}>
                      {groupName || chatData?.name || 'Group'}
                    </Text>
                  </TouchableOpacity>
                )}
                {editingDescription ? (
                  <View style={styles.descriptionEditContainer}>
                    <TextInput
                      style={[styles.descriptionInput, { color: colors.text, borderColor: colors.border }]}
                      value={groupDescription}
                      onChangeText={setGroupDescription}
                      placeholder="Add group description..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      maxLength={200}
                      autoFocus
                    />
                    <View style={styles.descriptionActions}>
                      <TouchableOpacity 
                        style={[styles.descriptionButton, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setEditingDescription(false)}
                      >
                        <Text style={[styles.descriptionButtonText, { color: colors.textMuted }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.descriptionButton, { backgroundColor: colors.primary }]}
                        onPress={handleSaveDescription}
                      >
                        <Text style={[styles.descriptionButtonText, { color: '#ffffff' }]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleEditDescription}>
                    <Text style={[styles.groupMemberCount, { color: colors.textMuted }]}>
                      {chatData?.description || groupDescription || 'Group • Tap to add description'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Group Options */}
              <View style={styles.groupOptionsSection}>
                <TouchableOpacity 
                  style={[styles.groupOptionItem, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handleEditDescription}
                >
                  <View style={[styles.groupOptionIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Edit3 size={20} color={colors.primary} />
                  </View>
                  <View style={styles.groupOptionContent}>
                    <Text style={[styles.groupOptionTitle, { color: colors.text }]}>Edit Description</Text>
                    <Text style={[styles.groupOptionSubtitle, { color: colors.textMuted }]}>Add group description</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.groupOptionItem, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    setShowGroupInfo(false);
                    const groupId = String(chatData.id);
                    router.push({
                      pathname: `/groups/${groupId}/add-members`,
                      params: {
                        name: chatData.name || 'Group',
                      },
                    });
                  }}
                >
                  <View style={[styles.groupOptionIcon, { backgroundColor: colors.secondary + '20' }]}>
                    <Users size={20} color={colors.secondary} />
                  </View>
                  <View style={styles.groupOptionContent}>
                    <Text style={[styles.groupOptionTitle, { color: colors.text }]}>Add Members</Text>
                    <Text style={[styles.groupOptionSubtitle, { color: colors.textMuted }]}>Invite people to this group</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
    paddingTop: 5, // Minimal top padding for consistent spacing
    paddingBottom: 8, // Minimal bottom padding for consistent spacing
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
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  status: {
    fontSize: FontSizes.xs,
    marginTop: 2,
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
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
  messageContainer: {
    marginVertical: Spacing.xs,
  },
  messageInnerRow: {
    flexDirection: 'row',
    // Align avatar with top of bubble, not bottom
    alignItems: 'flex-start',
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
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: FontWeights.semibold,
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
    // Make menu text (e.g. "Add Members") clearly visible
    color: '#ffffff',
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
  senderInfoContainer: {
    flexDirection: 'row',
    // Keep name row tight to left inside bubble
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingLeft: 0,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.xs,
  },
  senderName: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  // Group Info Modal Styles
  groupInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  groupInfoModal: {
    height: '80%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
  },
  groupInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  groupInfoCloseButton: {
    padding: Spacing.xs,
  },
  groupInfoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
    textAlign: 'center',
    color: '#3B8FE8',
  },
  groupInfoHeaderSpacer: {
    width: 40,
  },
  groupInfoContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  groupAvatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  groupAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  groupAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  groupNameLarge: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  groupMemberCount: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  groupOptionsSection: {
    gap: Spacing.md,
  },
  groupOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  groupOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  groupOptionContent: {
    flex: 1,
  },
  groupOptionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
    color: '#3B8FE8',
  },
  groupOptionSubtitle: {
    fontSize: FontSizes.sm,
  },
  // Description editing styles
  descriptionEditContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  descriptionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  descriptionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  descriptionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  // Name editing styles
  nameEditContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    minWidth: 200,
    marginBottom: Spacing.md,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  nameButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  nameButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
export default ChatScreen;
