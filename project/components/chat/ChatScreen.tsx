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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, MoreVertical, Trash2, UserX, Flag, Users, Camera, Edit3, Image as ImageIcon, Smile, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChatContext } from '@/context/ChatContext';
import ImageViewer from '@/components/ImageViewer';
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
import ImageCompressionService, { CompressionResult } from '@/lib/imageCompression';
import { ImageMessageFixer } from '@/lib/imageMessageFix';
import { chatMessageSync } from '@/lib/chatMessageSync';
interface ChatData {
  id: string | number;
  name: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
  userId?: string;
  username?: string;
  isGroup?: boolean;
  description?: string;
  memberCount?: number;
  participants?: any[];
  createdById?: string;
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
  const [isSending, setIsSending] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditDescModal, setShowEditDescModal] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editDescInput, setEditDescInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [filteredMentionMembers, setFilteredMentionMembers] = useState<any[]>([]);
  const [showMentionModal, setShowMentionModal] = useState(false);
  // Image & emoji state for sending media and reactions
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageCompression, setPendingImageCompression] = useState<CompressionResult | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const lastSentMessageRef = useRef<{ text: string; timestamp: number } | null>(null);


  
  useEffect(() => {
    if (chatData && chatData.isGroup) {
      console.log('🔍 Syncing group data:', { 
        name: chatData.name, 
        description: chatData.description, 
        avatar: chatData.avatar, 
        createdById: chatData.createdById,
        participants: chatData.participants?.length,
        hasUserId: !!user?.id
      });
      
      // Always set from chatData first
      setGroupName(chatData.name || '');
      setGroupDescription(chatData.description || '');
      setGroupAvatar(chatData.avatar || '');
      
      // Check admin status from participants OR createdById
      if (user?.id) {
        if (chatData.participants && Array.isArray(chatData.participants) && chatData.participants.length > 0) {
          const currentUserParticipant = chatData.participants.find((p: any) => p.userId === user.id);
          // User is admin if they have isAdmin=true OR they are the creator
          const isUserAdmin = currentUserParticipant?.isAdmin === true || chatData.createdById === user.id;
          setIsAdmin(isUserAdmin);
          console.log('👑 Admin check:', { 
            userId: user.id, 
            participantFound: !!currentUserParticipant,
            isAdmin: currentUserParticipant?.isAdmin,
            createdById: chatData.createdById,
            finalIsAdmin: isUserAdmin 
          });
        } else {
          // Fallback: If no participants data, fetch from API
          console.log('⚠️ No participants data, fetching from API...');
          apiService.getChatById(String(chatData.id)).then((fullChatData: any) => {
            console.log('✅ Fetched full chat data:', fullChatData);
            if (fullChatData.participants && Array.isArray(fullChatData.participants)) {
              const currentUserParticipant = fullChatData.participants.find((p: any) => p.userId === user.id);
              const isUserAdmin = currentUserParticipant?.isAdmin === true || fullChatData.createdById === user.id;
              setIsAdmin(isUserAdmin);
              setGroupMembers(fullChatData.participants.filter((p: any) => p.userId !== user.id));
              console.log('👑 Admin check (from API):', { isUserAdmin });
            }
          }).catch(err => {
            console.error('❌ Failed to fetch chat data:', err);
            // Fallback: Check if user is creator
            setIsAdmin(chatData.createdById === user.id);
          });
        }
      } else {
        setIsAdmin(false);
        console.log('⚠️ Not admin - no user ID');
      }
      
      // Load group members for mentions
      if (chatData.participants && Array.isArray(chatData.participants)) {
        const members = chatData.participants.filter((p: any) => p.userId !== user?.id);
        console.log('📋 Group members loaded:', members.length);
        setGroupMembers(members);
      }
    }
    
    // Reset refresh scheduled ref when chat changes
    refreshScheduledRef.current = false;
  }, [chatData?.name, chatData?.description, chatData?.avatar, chatData?.isGroup, chatData?.createdById, chatData?.participants, user?.id]);
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const socketListenersRef = useRef<(() => void)[]>([]);
  const refreshScheduledRef = useRef(false);
  
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

  // 🚀 REAL-TIME: Enhanced message synchronization
  useEffect(() => {
    if (!chatData?.id || !user?.id) return;

    const chatId = String(chatData.id);
    
    // Start real-time sync
    chatMessageSync.startSync({
      chatId,
      userId: user.id,
      onMessageReceived: (newMessage) => {
        console.log('📨 [SYNC] New message received:', newMessage.id);
        
        setMessages(prev => {
          // Deduplicate
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          
          // Add new message
          const updated = [...prev, newMessage];
          
          // Sort messages
          return updated.sort((a, b) => {
            if (a.id.startsWith('temp_')) return 1;
            if (b.id.startsWith('temp_')) return -1;
            return compareTimestamps(a.timestamp, b.timestamp);
          });
        });
        
        // Scroll to bottom
        setTimeout(() => scrollToBottom(true), 100);
      },
      onMessageUpdated: (updatedMessages) => {
        console.log('🔄 [SYNC] Messages updated from sync:', updatedMessages.length);
        setMessages(updatedMessages);
        setTimeout(() => scrollToBottom(true), 100);
      }
    });
    
    return () => {
      chatMessageSync.stopSync(chatId);
    };
  }, [chatData?.id, user?.id, scrollToBottom]);
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
      // Reset refresh scheduled ref
      refreshScheduledRef.current = false;
    };
  }, []);
  // ⚡ ULTRA-FAST MESSAGE LOADING - INSTANT DISPLAY
  const loadMessages = useCallback(async (forceRefresh = false) => {
    if (!user || !chatData?.id) return;
    const chatId = String(chatData.id);
    
    console.log('📥 [LOAD MESSAGES] Starting...', { chatId, forceRefresh, currentMessageCount: messages.length });
    
    // If force refresh, clear caches strategically to improve performance
    if (forceRefresh) {
      console.log('🔄 [FORCE REFRESH] Strategic cache refresh for better performance...');
      
      // PERFORMANCE: Don't clear ultra-fast cache to prevent UI flicker
      // Only clear old cache to force database refresh
      chatMessageCache.clearChatCache(chatId);
      console.log('🗑️ [CACHE CLEAR] Cleared old cache, keeping ultra-fast cache for instant display');
      
      // Continue to fetch from database in background
      // Temp messages will be merged with fresh messages later
    } else {
      // PRIORITY 1: Ultra-fast cache (instant load)
      const ultraFastCached = ultraFastChatCache.getInstantMessages(chatId);
      if (ultraFastCached && ultraFastCached.length > 0) {
        console.log('⚡ [CACHE HIT] Loaded from ultra-fast cache:', ultraFastCached.length, 'messages');
        // 🔒 CRITICAL: Keep temp messages visible until replaced by server message
        // Don't filter them out or messages will disappear after sending
        setMessages(ultraFastCached);
        setLoading(false);
        // ? FIX: Auto-refresh disabled - was causing messages to disappear
        // if (!isSending) {
        //   if (!refreshScheduledRef.current) {
        //     refreshScheduledRef.current = true;
        //     setTimeout(() => {
        //       refreshScheduledRef.current = false;
        //       loadMessages(true);
        //     }, 300);
        //   }
        // }
        return;
      }
      // PRIORITY 2: Try to get from global state first (instant)
      try {
        const globalMessages = getChatMessages(chatId);
        if (globalMessages && globalMessages.length > 0) {
          // 🔒 CRITICAL: Keep temp messages visible until replaced by server message
          // Don't filter them out or messages will disappear after sending
          setMessages(globalMessages);
          setLoading(false);
          // Cache in ultra-fast cache (including temp messages for now)
          ultraFastChatCache.cacheMessages(chatId, globalMessages, chatData);
          // Background refresh with debounce to prevent multiple rapid calls
          // ✅ FIX: Disabled auto-refresh to prevent lag
          // if (!isSending) {
          //   if (!refreshScheduledRef.current) {
          //     refreshScheduledRef.current = true;
          //     setTimeout(() => {
          //       refreshScheduledRef.current = false;
          //       loadMessages(true);
          //     }, 300);
          //   }
          // }
          return;
        }
      } catch (error) {
        }
      // PRIORITY 3: Fallback to old cache
      const cachedMessages = chatMessageCache.getCachedMessages(chatId);
      if (cachedMessages && cachedMessages.messages.length > 0) {
        // 🔒 CRITICAL: Keep temp messages visible until replaced by server message
        // Don't filter them out or messages will disappear after sending
        setMessages(cachedMessages.messages);
        setLoading(false);
        // Upgrade to ultra-fast cache (including temp messages for now)
        ultraFastChatCache.cacheMessages(chatId, cachedMessages.messages, chatData);
        // ? FIX: Auto-refresh disabled - was causing messages to disappear
        // if (!isSending) {
        //   if (!refreshScheduledRef.current) {
        //     refreshScheduledRef.current = true;
        //     setTimeout(() => {
        //       refreshScheduledRef.current = false;
        //       loadMessages(true);
        //     }, 300);
        //   }
        // }
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
          let processedTimestamp: string;
          let rawTimestamp: Date;
          
          if (msg.timestamp) {
            rawTimestamp = new Date(msg.timestamp);
            processedTimestamp = fixServerTimestamp(msg.timestamp);
          } else {
            rawTimestamp = new Date();
            processedTimestamp = formatMessageTime(rawTimestamp);
          }
          
          return {
            id: msg.id,
            text: msg.text || msg.content,
            isUser: msg.isUser || msg.senderId === user.id,
            timestamp: processedTimestamp,
            rawTimestamp: rawTimestamp.getTime(),
            status: (msg.status || 'read').toLowerCase() as 'sending' | 'sent' | 'delivered' | 'read',
            sender: msg.sender,
            ...(msg.imageUrl ? { imageUrl: msg.imageUrl } : {})
          };
        });
        formattedMessages.sort((a, b) => {
          if (a.id.startsWith('temp_') && !b.id.startsWith('temp_')) return 1;
          if (!a.id.startsWith('temp_') && b.id.startsWith('temp_')) return -1;
          if (!a.id.startsWith('temp_') && !b.id.startsWith('temp_')) {
            return (a.rawTimestamp || 0) - (b.rawTimestamp || 0);
          }
          return a.id.localeCompare(b.id);
        });
        // IMPROVED: Merge server messages with global state and local messages
        let finalMessages = mergeServerMessages(chatId, formattedMessages);
        
        // Don't merge temp messages on force refresh - they should be replaced by real messages
        
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
    const trimmed = message.trim();
    if (!trimmed && !pendingImageUri) return;
    if (!user || !chatData?.id) return;
    
    // 🔒 CRITICAL: Prevent duplicate sends (debounce check)
    const nowTimestamp = Date.now();
    if (lastSentMessageRef.current) {
      const { text: lastText, timestamp: lastTimestamp } = lastSentMessageRef.current;
      // Prevent sending same message within 1 second (duplicate prevention)
      if (lastText === trimmed && nowTimestamp - lastTimestamp < 1000) {
        console.log('⚠️ [DUPLICATE PREVENTION] Same message sent within 1 second, skipping');
        return;
      }
    }
    
    // Remove isSending check - allow multiple messages to be sent simultaneously
    // Each message will be queued and sent in background
    
    // Record this message send
    lastSentMessageRef.current = { text: trimmed, timestamp: nowTimestamp };
    
    const messageText = trimmed;
    let chatId = String(chatData.id);
    const tempId = `temp_${Date.now()}`;
    
    // 🔒 CRITICAL: Capture image state before clearing (closure issue fix)
    const capturedImageUri = pendingImageUri;
    const capturedImageCompression = pendingImageCompression;
    
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
        
        // 🚀 PERFORMANCE FIX: Keep temp message visible until socket broadcast arrives
        // This prevents the message from disappearing and ensures instant feedback
        // The socket listener will replace it with the real message when it arrives
        console.log('✅ [NEW CHAT] Keeping temp message visible until broadcast arrives');
        
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
      userId: user.id,
      hasImage: !!pendingImageUri,
    });
    
    // Create temporary message for INSTANT UI display
    const currentTime = new Date();
    const tempMessage: Message = {
      id: tempId,
      text: messageText || '', // Empty string for image-only messages
      isUser: true,
      timestamp: currentTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      rawTimestamp: currentTime.getTime(),
      status: 'sending', // Gray clock icon 🕓
      sender: {
        id: user.id,
        username: user.username || 'You',
        avatar: user.avatar || null,
      },
      // Store local URI with validation
      ...(ImageMessageFixer.validateImageUrl(capturedImageUri).isValid ? { imageUrl: capturedImageUri } : {} as any),
    } as any;
    
    console.log('✅ [OPTIMISTIC] Adding temp message to UI:', tempId);
    
    // 🚀 INSTANT UI UPDATE - Message appears immediately
    setMessages(prev => {
      // Check if temp ID exists
      if (prev.some(msg => msg.id === tempId)) {
        console.log('⚠️ [SKIP] Temp exists - preventing duplicate add', { tempId, currentCount: prev.length });
        return prev;
      }
      
      // 🔒 CRITICAL: For images, be more lenient to prevent disappearing
      // Only skip if exact same temp ID exists, not just same image URI
      if (capturedImageUri) {
        const exactDuplicate = prev.some(msg => 
          msg.id === tempId // Only check for exact same temp ID
        );
        if (exactDuplicate) {
          console.log('⚠️ [SKIP] Exact duplicate temp ID - preventing duplicate add', { tempId });
          return prev;
        }
      }
      
      console.log('✅ [ADD TEMP] Adding temp message to state', { 
        tempId, 
        previousCount: prev.length, 
        newCount: prev.length + 1,
        messageText: messageText.substring(0, 30) + '...',
        hasImage: !!capturedImageUri
      });
      return [...prev, tempMessage];
    });
    // ⚡ ULTRA-FAST: Add to ultra-fast cache instantly
    ultraFastChatCache.addMessageInstantly(chatId, tempMessage);
    // DON'T add temp message to global state - only add final server message
    // This prevents duplicate messages (temp + server) in global state
    // Tell FCM service that user is sending a message (to suppress notifications)
    fcmService.setUserIsSendingMessage(chatId);
    // Clear input and pending image immediately after message appears in UI
    setMessage('');
    setPendingImageUri(null);
    setPendingImageCompression(null);
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
        // Ensure socket is connected before sending
        if (!socketService.isSocketConnected()) {
          console.log('🔌 [SOCKET] Not connected, connecting...');
          await socketService.connect();
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        let serverResponse = null;
        let uploadedImageUrl: string | undefined;
        // If we have an image, upload it first
        if (capturedImageCompression) {
          // Check if we have a valid URI in the compression result
          if (capturedImageCompression.uri && capturedImageCompression.uri.trim() !== '') {
            try {
              console.log('📤 [IMAGE] Uploading image from compression result:', {
                hasUri: !!capturedImageCompression.uri,
                uriPreview: capturedImageCompression.uri?.substring(0, 50) + '...'
              });
              
              // Add timeout to prevent hanging
              const uploadPromise = apiService.uploadImageFile(capturedImageCompression.uri, 'file', 'chat-images');
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000)
              );
              
              const uploadResp = await Promise.race([uploadPromise, timeoutPromise]) as any;
              
              if (uploadResp?.url && uploadResp.url.trim() !== '') {
                uploadedImageUrl = uploadResp.url;
                console.log('✅ [IMAGE] Upload successful:', uploadedImageUrl.substring(0, 50) + '...');
              } else {
                throw new Error('Upload response missing URL or empty URL');
              }
            } catch (e: any) {
              console.error('❌ [IMAGE] Failed to upload chat image:', e);
              const errorMessage = e.message || 'Failed to upload image. Please try again.';
              Alert.alert('Error', errorMessage);
              // Mark temp message as failed instead of throwing
              setMessages(prev => prev.map(msg => 
                msg.id === tempId ? { ...msg, status: 'failed' } : msg
              ));
              return; // Exit early instead of throwing
            }
          } else {
            console.warn('⚠️ [IMAGE] Compression result missing URI:', capturedImageCompression);
            // Mark temp message as failed
            setMessages(prev => prev.map(msg => 
              msg.id === tempId ? { ...msg, status: 'failed' } : msg
            ));
            Alert.alert('Error', 'Image compression failed - please try again');
            return; // Exit early
          }
        }

        console.log('🔌 [SOCKET] Sending via socket...');
        // Socket doesn't support image URL yet, use API for image messages
        if (uploadedImageUrl && uploadedImageUrl.trim() !== '') {
          console.log('🌐 [API] Using HTTP API for image message...');
          const httpResponse: any = await apiService.sendMessage(chatId, { 
            content: messageText || '', // Empty string for image-only
            chatId: chatId, 
            senderId: user.id,
            tempMessageId: tempId,
            imageUrl: uploadedImageUrl,
          });
          console.log('✅ [API] Image message response:', {
            id: httpResponse?.id,
            timestamp: httpResponse?.timestamp,
            hasImage: !!httpResponse?.imageUrl,
            imageUrl: httpResponse?.imageUrl?.substring(0, 50) + '...'
          });

          // Normalize HTTP response to match socket ack shape so shared logic below can be reused
          serverResponse = {
            success: true,
            messageId: httpResponse?.messageId || httpResponse?.id,
            timestamp: httpResponse?.timestamp,
          };
        } else {
          serverResponse = await socketService.sendMessage(chatId, messageText, tempId);
        }
        console.log('✅ [SOCKET] Socket/HTTP response:', serverResponse);
        
        // Replace temp message with server message (sender doesn't receive broadcast)
        if (serverResponse && serverResponse.success && serverResponse.messageId) {
          // Format timestamp from server (ISO) to local time
          const rawTime = serverResponse.timestamp ? new Date(serverResponse.timestamp) : new Date();
          const formattedTimestamp = rawTime.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
              
          const serverMessage: Message = {
            id: serverResponse.messageId,
            text: messageText || '', // Empty string for image-only
            isUser: true,
            timestamp: formattedTimestamp,
            rawTimestamp: rawTime.getTime(),
            status: 'sent',
            sender: {
              id: user.id,
              username: user.username || 'You',
              avatar: user.avatar || null,
            },
            ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {} as any),
          } as any;
          
          // Replace temp message with real message
          console.log('🔄 [REPLACE] Replacing temp message with server message', {
            tempId,
            serverMessageId: serverMessage.id,
            timestamp: serverMessage.timestamp,
            hasImage: !!serverMessage.imageUrl,
            tempImageUrl: capturedImageUri ? capturedImageUri.substring(0, 50) + '...' : 'none',
            serverImageUrl: serverMessage.imageUrl ? serverMessage.imageUrl.substring(0, 50) + '...' : 'none'
          });
          
          setMessages(prev => {
            // First, check if server message already exists
            const messageExists = prev.some(msg => msg.id === serverMessage.id);
            if (messageExists) {
              console.log('⚠️ [SKIP] Server message already exists', { serverMessageId: serverMessage.id });
              // Clean up any temp messages that might be duplicates
              return prev.filter(msg => {
                if (msg.id === tempId) {
                  console.log('🧹 [CLEAN] Removing temp message since server exists', { tempId });
                  return false;
                }
                return true;
              });
            }

            // 🔧 IMPROVED: Better temp message replacement for images
            let found = false;
            const updated = prev.map(msg => {
              // Direct ID match (preferred)
              if (msg.id === tempId) {
                found = true;
                console.log('✅ [REPLACE DIRECT] Found temp message by ID, replacing with server message', {
                  tempId,
                  serverMessageId: serverMessage.id,
                  hadTempImage: !!msg.imageUrl,
                  hasServerImage: !!serverMessage.imageUrl
                });
                return serverMessage;
              }
              
              // 🔧 IMPROVED: For image messages, match by sender, timestamp proximity, and image presence
              if (!found && uploadedImageUrl && msg.id.startsWith('temp_') && 
                  msg.sender?.id === user.id && msg.imageUrl) {
                // Check if this temp message was created recently (within last 30 seconds)
                const tempTime = msg.rawTimestamp || 0;
                const serverTime = serverMessage.rawTimestamp || Date.now();
                const timeDiff = Math.abs(serverTime - tempTime);
                
                if (timeDiff < 30000) { // 30 seconds tolerance
                  found = true;
                  console.log('✅ [REPLACE IMAGE] Found temp image message by sender and time, replacing with server message', {
                    tempId: msg.id,
                    serverMessageId: serverMessage.id,
                    tempImageUrl: msg.imageUrl?.substring(0, 30) + '...',
                    serverImageUrl: serverMessage.imageUrl?.substring(0, 30) + '...',
                    timeDiff
                  });
                  return serverMessage;
                }
              }
              
              return msg;
            });

            if (!found) {
              console.log('⚠️ [NOT FOUND] Temp message not found, appending server message', {
                tempId,
                serverMessageId: serverMessage.id,
                currentMessageIds: prev.map(m => m.id).slice(-3)
              });
              return [...prev, serverMessage];
            }

            console.log('✅ [SUCCESS] Temp message replaced successfully', {
              tempId,
              serverMessageId: serverMessage.id,
              messageCount: updated.length
            });
            return updated;
          });
          
          // 🔧 IMPROVED: Better cache replacement for images
          ultraFastChatCache.replaceMessageInstantly(chatId, tempId, serverMessage);
          if (serverMessage.imageUrl) {
            // Also try sender-based replacement for image messages
            ultraFastChatCache.replaceAnyTempImageBySender(chatId, user.id, serverMessage);
            // Additional fallback: replace any temp with local image URI
            if (capturedImageUri) {
              ultraFastChatCache.replaceAnyTempWithImage(chatId, capturedImageUri, serverMessage);
            }
            // Extra safety: replace by timestamp proximity for images
            ultraFastChatCache.replaceAnyTempImageByTime(chatId, user.id, serverMessage, 30000);
          }
          console.log('✅ [CACHE] Temp message replaced in cache');
          
          return; // Exit early on socket success
        }
        
        if (!serverResponse || !serverResponse.success) {
          console.log('🌐 [API] Falling back to HTTP API...');
          serverResponse = await apiService.sendMessage(chatId, { 
            content: messageText || '', // Empty string for image-only
            chatId: chatId, 
            senderId: user.id,
            tempMessageId: tempId,
            ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
          });
          console.log('✅ [API] API response:', serverResponse);
          
          
          // HTTP API fallback - also need to replace temp message if successful
          if (serverResponse && (serverResponse.messageId || serverResponse.id)) {
            const realMessageId = serverResponse.messageId || serverResponse.id;
            
            // Format timestamp from server (ISO) to local time
            const rawTime = serverResponse.timestamp ? new Date(serverResponse.timestamp) : new Date();
            const formattedTimestamp = rawTime.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
                
            const serverMessage: Message = {
              id: realMessageId,
              text: messageText || '', // Empty string for image-only
              isUser: true,
              timestamp: formattedTimestamp,
              rawTimestamp: rawTime.getTime(),
              status: 'sent',
              sender: {
                id: user.id,
                username: user.username || 'You',
                avatar: user.avatar || null,
              },
              ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {} as any),
            } as any;
            
            // Replace temp message with real message
            console.log('🔄 [REPLACE HTTP] Replacing temp message with server message', {
              tempId,
              serverMessageId: serverMessage.id,
              timestamp: serverMessage.timestamp
            });
            
            setMessages(prev => {
              const messageExists = prev.some(msg => msg.id === serverMessage.id);
              if (messageExists) {
                // Server message is already present - clean up any matching temp messages
                const cleaned = prev.filter(msg => {
                  if (!msg.id.startsWith('temp_')) return true;
                  // Remove temp messages from current user with same text
                  if (msg.sender?.id === user.id && msg.text === serverMessage.text) {
                    console.log('🧹 [CLEAN TEMP HTTP] Removing temp message since server message already exists', {
                      tempIdCandidate: msg.id,
                      serverMessageId: serverMessage.id,
                      textPreview: (serverMessage.text || '').substring(0, 30) + '...'
                    });
                    return false;
                  }
                  return true;
                });
                if (cleaned.length !== prev.length) {
                  console.log('✅ [CLEAN TEMP HTTP] Temp duplicates removed while keeping server message', {
                    serverMessageId: serverMessage.id,
                    beforeCount: prev.length,
                    afterCount: cleaned.length
                  });
                  return cleaned;
                }
                console.log('⚠️ [SKIP HTTP] Server message exists - preventing duplicate', { 
                  serverMessageId: serverMessage.id,
                  currentCount: prev.length 
                });
                return prev;
              }

              // Check if temp exists
              const hadTemp = prev.some(msg => msg.id === tempId);
              console.log('🔍 [REPLACE HTTP CHECK]', { 
                hadTemp, 
                tempId, 
                currentCount: prev.length,
                messageIds: prev.map(m => m.id).slice(-3)
              });

              // 🔧 IMPROVED: Better temp message replacement for HTTP responses
              let found = false;
              const updated = prev.map(msg => {
                // Direct ID match (preferred)
                if (msg.id === tempId) {
                  found = true;
                  console.log('✅ [REPLACE HTTP DIRECT] Found temp by ID, replacing', {
                    tempId,
                    serverMessageId: serverMessage.id
                  });
                  return serverMessage;
                }
                
                // 🔧 FALLBACK: For image messages, match by sender and image presence
                if (!found && serverMessage.imageUrl && msg.id.startsWith('temp_') && 
                    msg.sender?.id === user.id && msg.imageUrl) {
                  found = true;
                  console.log('✅ [REPLACE HTTP IMAGE] Found temp image by sender, replacing', {
                    tempId: msg.id,
                    serverMessageId: serverMessage.id
                  });
                  return serverMessage;
                }
                
                return msg;
              });

              if (!found) {
                console.log('✅ [APPEND HTTP] Temp not found, appending server message', { 
                  serverMessageId: serverMessage.id,
                  newCount: updated.length + 1
                });
                return [...updated, serverMessage];
              }

              console.log('✅ [REPLACE HTTP] Temp replaced successfully', { 
                tempId, 
                serverMessageId: serverMessage.id,
                newCount: updated.length
              });
              return updated;
            });
            
            // 🔧 IMPROVED: Better cache replacement for HTTP responses
            ultraFastChatCache.replaceMessageInstantly(chatId, tempId, serverMessage);
            if (serverMessage.imageUrl) {
              // Also try sender-based replacement for image messages
              ultraFastChatCache.replaceAnyTempImageBySender(chatId, user.id, serverMessage);
              // Additional fallback: replace any temp with local image URI
              if (capturedImageUri) {
                ultraFastChatCache.replaceAnyTempWithImage(chatId, capturedImageUri, serverMessage);
              }
            }
            console.log('✅ [REPLACE HTTP] Temp message replaced in cache');
            
            // 🔒 DON'T add to global state here - it will be added via socket broadcast or loadMessages
            // This prevents duplicate messages in global state
            console.log('⏭️ [SKIP GLOBAL HTTP] Skipping global state update to prevent duplicates');
            
          } else {
            throw new Error('Invalid server response');
          }
        }
      } catch (error) {
        console.error('❌ [SEND ERROR] Message send failed:', error);
        // Mark message as failed - keep it visible with retry option
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...msg,
            status: 'failed', // ❌ Red X icon
            // Preserve image URL for retry
            ...(capturedImageUri && capturedImageUri.trim() !== '' ? { imageUrl: capturedImageUri } : {})
          } : msg
        ));
      }
    };
    // Start backend work immediately but don't block UI
    sendToBackend();
  }, [user, chatData, message, pendingImageUri, pendingImageCompression, addMessageToChat, scrollToBottom, isNewChat, onFirstMessage]);
  // Retry failed message
  const retryMessage = useCallback((failedMessage: Message) => {
    if (!user || !chatData?.id) return;
    const chatId = String(chatData.id);
    const messageText = failedMessage.text;
    const imageUrl = failedMessage.imageUrl;
    
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
        
        // For image messages, always use API (socket doesn't support images yet)
        if (imageUrl) {
          try {
            // Add timeout to prevent hanging
            const sendMessagePromise = apiService.sendMessage(chatId, { 
              content: messageText || '',
              chatId: chatId, 
              senderId: user.id,
              imageUrl: imageUrl
            });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Message send timeout - please try again')), 30000)
            );
            
            serverResponse = await Promise.race([sendMessagePromise, timeoutPromise]);
          } catch (imageError: any) {
            console.error('❌ [RETRY IMAGE] Failed to send image message:', imageError);
            throw new Error(`Failed to send image: ${imageError.message || 'Please try again'}`);
          }
        } else {
          // Try Socket.io first for text-only messages
          if (socketService.isSocketConnected()) {
            try {
              serverResponse = await socketService.sendMessage(chatId, messageText, failedMessage.id);
            } catch (socketError) {
              console.warn('⚠️ [RETRY] Socket send failed, falling back to API:', socketError);
            }
          }
          
          // Fallback to API
          if (!serverResponse || !serverResponse.success) {
            serverResponse = await apiService.sendMessage(chatId, { 
              content: messageText || '',
              chatId: chatId, 
              senderId: user.id
              , tempMessageId: failedMessage.id
            });
          }
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
          throw new Error('Retry failed - invalid server response');
        }
      } catch (error: any) {
        console.error('❌ [RETRY] Message retry failed:', error);
        // Mark as failed again
        setMessages(prev => prev.map(msg => 
          msg.id === failedMessage.id ? {
            ...msg,
            status: 'failed'
          } : msg
        ));
        
        // Show error to user
        const errorMessage = error.message || 'Failed to send message. Please try again.';
        Alert.alert('Error', errorMessage);
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

  // Handle leaving a group (member exits without deleting the group)
  const handleLeaveGroup = useCallback(() => {
    if (!chatData?.isGroup) {
      return;
    }

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${chatData.name || 'this group'}? You will no longer receive messages from this group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            const chatId = String(chatData.id);

            console.log('🚪 [LEAVE GROUP] Starting leave flow for chat:', chatId);

            // Instantly remove from local caches so chat disappears from lists
            onChatDeleted?.(chatId);
            chatCache.removeChatFromCache(chatId);
            chatMessageCache.clearChatCache(chatId);
            ultraFastChatCache.clearChatCache(chatId);

            if (user?.id) {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.removeItem(`user_chats_${user.id}`).catch(() => {});
            }

            // Navigate back immediately
            onBack?.();

            // Background API call to leave the group on the server
            setTimeout(() => {
              console.log('🌐 [LEAVE GROUP] Syncing with backend...');
              apiService.leaveGroup(chatId)
                .then(() => {
                  console.log('✅ [LEAVE GROUP] Backend leave successful:', chatId);
                })
                .catch((error) => {
                  console.error('❌ [LEAVE GROUP] Backend leave failed:', error);
                });
            }, 100);
          }
        }
      ]
    );
  }, [chatData?.id, chatData?.isGroup, chatData?.name, onBack, onChatDeleted, user?.id]);
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
          console.log('Uploading group avatar...');
          const uploadResult = await apiService.uploadImageFile(imageUri, 'file', 'group-avatars');
          console.log('Upload result:', uploadResult.url);
          
          console.log('Updating group avatar in database...');
          await apiService.updateGroupAvatar(String(chatData.id), uploadResult.url);
          
          console.log('Avatar updated successfully, updating local state');
          setGroupAvatar(uploadResult.url);
          
          Alert.alert('Success', 'Group avatar updated successfully!');
        } catch (error) {
          console.error('Error updating group avatar:', error);
          Alert.alert('Error', 'Failed to update group avatar. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };



  const handleComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} feature will be available in the next update!`);
  };

  // Handle image picking
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setIsCompressingImage(true);
        try {
          // Compress the image
          const compressed = await ImageCompressionService.compressImage(imageUri);
          setPendingImageUri(imageUri);
          setPendingImageCompression(compressed);
        } catch (error) {
          console.error('Image compression failed:', error);
          Alert.alert('Error', 'Failed to compress image');
        } finally {
          setIsCompressingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  // Handle emoji insertion
  const handleAddEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    // Don't close emoji picker - user can select multiple emojis
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
        chatId: socketMessage.chatId,
        senderIdType: typeof socketMessage.sender?.id,
        currentUserIdType: typeof user.id,
        senderIdString: String(socketMessage.sender?.id),
        currentUserIdString: String(user.id)
      });

      const isSender = socketMessage.sender?.id === user.id || String(socketMessage.sender?.id) === String(user.id);

      // If the incoming message is from the current user, we should attempt to
      // match & replace any optimistic temp message so the UI doesn't show a
      // duplicate. If we cannot match, it's safe to skip adding it because
      // the server will be reflected by the API response path or force refresh.
      if (isSender && socketMessage.chatId === chatId) {
        console.log('🔍 [SELF] Incoming server message for current user - attempting to match temp');

        const rawTime = socketMessage.timestamp ? new Date(socketMessage.timestamp) : new Date();
        const serverMsg: Message = {
          id: socketMessage.id,
          text: socketMessage.text || socketMessage.content || '',
          isUser: true,
          timestamp: fixServerTimestamp(socketMessage.timestamp) || formatMessageTime(new Date()),
          rawTimestamp: rawTime.getTime(),
          status: 'sent',
          sender: socketMessage.sender,
          ...(socketMessage.imageUrl ? { imageUrl: socketMessage.imageUrl } : {}),
        } as any;

        // 1) If server includes tempMessageId, prefer direct replacement
        if (socketMessage.tempMessageId) {
          const temp = socketMessage.tempMessageId;
          setMessages(prev => {
            // If server message already exists, skip
            if (prev.some(msg => msg.id === serverMsg.id)) return prev;
            // Replace temp with server message
            const replaced = prev.map(msg => msg.id === temp ? serverMsg : msg);
            // Remove any other temps with same image
            if (serverMsg.imageUrl) {
              return replaced.filter(msg => !(msg.id.startsWith('temp_') && msg.imageUrl === serverMsg.imageUrl && msg.sender?.id === user.id));
            }
            return replaced;
          });
          ultraFastChatCache.replaceMessageInstantly(chatId, socketMessage.tempMessageId, serverMsg);
          console.log('✅ [REPLACE SOCKET] Replaced temp from socket tempMessageId:', socketMessage.tempMessageId);
          // Add to global state to update chat previews and ensure global caches are synced.
          setTimeout(() => addMessageToChat(chatId, serverMsg, false), 0);
          return; // Don't append / global add
        }

        // 2) If no tempMessageId, try to match by imageUrl for image messages
        if (socketMessage.imageUrl) {
          let matched = false;
          setMessages(prev => {
            const updated = prev.map(msg => {
              if (!matched && msg.id.startsWith('temp_') && msg.imageUrl && msg.sender?.id === user.id) {
                // For image messages, match by sender since temp has local URI and server has remote URL
                matched = true;
                console.log('✅ [SOCKET] Matched temp image message by sender', { tempId: msg.id, serverId: serverMsg.id });
                return serverMsg;
              }
              return msg;
            });
            return updated;
          });
          if (matched) {
            console.log('✅ [REPLACE SOCKET] Replaced temp image message via socket');
            setTimeout(() => addMessageToChat(chatId, serverMsg, false), 0);
            return;
          }
          
          // Fallback: Try to replace by sender for image messages in state
          let fallbackMatched = false;
          setMessages(prev => {
            const updated = prev.map(msg => {
              if (!fallbackMatched && msg.id.startsWith('temp_') && msg.imageUrl && msg.sender?.id === user.id) {
                fallbackMatched = true;
                console.log('✅ [SOCKET FALLBACK] Matched temp image by sender', { tempId: msg.id, serverId: serverMsg.id });
                return serverMsg;
              }
              return msg;
            });
            return updated;
          });
          
          if (fallbackMatched) {
            ultraFastChatCache.replaceAnyTempImageBySender(chatId, user.id, serverMsg);
            console.log('✅ [REPLACE SOCKET] Replaced temp image by sender via socket');
            setTimeout(() => addMessageToChat(chatId, serverMsg, false), 0);
            return;
          }
        }

        // 3) Try text match heuristic for text messages
        if (socketMessage.text && socketMessage.text.trim() !== '') {
          let matched = false;
          setMessages(prev => prev.map(msg => {
            if (!matched && msg.id.startsWith('temp_') && msg.text === socketMessage.text && msg.sender?.id === user.id) {
              matched = true;
              console.log('✅ [SOCKET] Matched temp text message', { tempId: msg.id, serverId: serverMsg.id });
              return serverMsg;
            }
            return msg;
          }));
          if (matched) {
            console.log('✅ [REPLACE SOCKET] Replaced temp text message via socket');
            setTimeout(() => addMessageToChat(chatId, serverMsg, false), 0);
            return;
          }
        }

        // If nothing matched, skip adding new message - server will be added via other flows
        console.log('🔕 [SOCKET] No matching temp found for sender message - skipping append');
        return;
      }
      
      // Only add message if it's for this chat AND it's from another user
      if (socketMessage.chatId === chatId) {
        // Prepare server message object
        const rawTime = socketMessage.timestamp ? new Date(socketMessage.timestamp) : new Date();
        const newMessage: Message = {
          id: socketMessage.id,
          text: socketMessage.text || socketMessage.content || '',
          isUser: false, // This is from another user
          timestamp: fixServerTimestamp(socketMessage.timestamp) || formatMessageTime(new Date()),
          rawTimestamp: rawTime.getTime(),
          status: 'delivered',
          sender: socketMessage.sender,
          imageUrl: socketMessage.imageUrl || undefined,
        } as any;

        // Add message from other users
        setMessages(prev => {
          // Skip if message ID already exists
          if (prev.some(msg => msg.id === newMessage.id)) {
            console.log('❌ [SKIP] Message ID already exists - preventing duplicate', { 
              messageId: newMessage.id,
              currentCount: prev.length
            });
            return prev;
          }
          
          console.log('✅ [ADD OTHER USER] Adding message from other user', { 
            messageId: newMessage.id,
            senderId: newMessage.sender?.id,
            previousCount: prev.length,
            newCount: prev.length + 1,
            text: newMessage.text.substring(0, 30) + '...'
          });
          return [...prev, newMessage];
        });
        
        // Update caches
        ultraFastChatCache.addMessageInstantly(chatId, newMessage);
        
        // Update global state
        setTimeout(() => {
          addMessageToChat(chatId, newMessage, false);
        }, 0);
        
        // Auto-scroll to bottom
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
      
      // Always reload messages when focusing to catch missed messages
      console.log('🔄 [FOCUS] Reloading messages to catch any missed updates...');
      setTimeout(() => {
        loadMessages(true); // Force refresh from server
      }, 100);
      
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

// Helper function to render text with clickable links and @mentions
const renderTextWithLinks = useCallback((text: string, isUserMessage: boolean) => {
// Combined regex for URLs and mentions - captures @username separately
const urlPattern = /(https?:\/\/[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[^\s]{2,})|(@[a-zA-Z0-9_]+)/g;
const matches: { match: string; index: number; length: number }[] = [];
let match;
while ((match = urlPattern.exec(text)) !== null) {
  matches.push({ match: match[0], index: match.index, length: match[0].length });
}

if (matches.length === 0) {
  return <Text>{text}</Text>;
}

const parts: React.ReactNode[] = [];
let lastIndex = 0;

matches.forEach((matchInfo, index) => {
  const { match: token, index: tokenIndex } = matchInfo;

  if (tokenIndex > lastIndex) {
    parts.push(
      <Text key={`text-${index}`}>
        {text.substring(lastIndex, tokenIndex)}
      </Text>
    );
  }

  const isMention = token.startsWith('@');
  const isUrl = !isMention;

  if (isMention) {
    const username = token.substring(1);
    
    const handleMentionPress = async () => {
      try {
        console.log('🔍 [MENTION] Searching for username:', username);
        
        // First try to find in group members if it's a group chat
        if (chatData?.isGroup && groupMembers.length > 0) {
          console.log('👥 [GROUP] Searching in group members:', groupMembers.length);
          const mentionedMember = groupMembers.find((m: any) => m?.user?.username === username);
          if (mentionedMember?.userId) {
            console.log('✅ [GROUP] Found in group:', mentionedMember.userId);
            router.push(`/profile/${mentionedMember.userId}`);
            return;
          }
        }
        
        // If not found in group or not a group chat, search all users
        console.log('🌐 [API] Searching all users for:', username);
        const searchResult = await apiService.searchUsers(username);
        console.log('📦 [API] Search result:', searchResult);
        
        if (searchResult?.users && searchResult.users.length > 0) {
          console.log('👤 [USERS] Found users:', searchResult.users.map((u: any) => u.username));
          // Find case-insensitive match
          const match = searchResult.users.find((u: any) => 
            u.username.toLowerCase() === username.toLowerCase()
          );
          if (match) {
            console.log('✅ [MATCH] Found user:', match.id, match.username);
            router.push(`/profile/${match.id}`);
            return;
          }
          console.log('❌ [NO MATCH] No exact match found');
        } else {
          console.log('❌ [EMPTY] No users returned from search');
        }
        
        // If no exact match found, show alert
        Alert.alert('User not found', `Could not find user ${username}`);
      } catch (error) {
        console.error('❌ [ERROR] Search failed:', error);
        Alert.alert('Error', 'Could not search for user');
      }
    };

    parts.push(
      <Text
        key={`mention-${index}`}
        style={[styles.linkText, { color: isUserMessage ? '#FFD70' : '#3B8FE8' }]}
        onPress={handleMentionPress}
      >
        {token}
      </Text>
    );
  } else if (isUrl) {
    const url = token.startsWith('http') ? token : `https://${token}`;
    const fullUrl = url;

    parts.push(
      <Text key={`url-${index}`}>
        <Text
          style={[styles.linkText, { color: isUserMessage ? '#ffffff' : '#3B8FE8' }]}
          onPress={() => {
            Linking.openURL(fullUrl).catch(() => {
              Alert.alert('Error', 'Could not open link');
            });
          }}
        >
          {url}
        </Text>
      </Text>
    );
  }

  lastIndex = tokenIndex + matchInfo.length;
});

if (lastIndex < text.length) {
  parts.push(
    <Text key={`text-final`}>
      {text.substring(lastIndex)}
    </Text>
  );
}

return <Text>{parts}</Text>;
}, [groupMembers, chatData?.isGroup]);

// Message component - render directly to avoid undefined issues
const renderMessage = useCallback(({ item }: { item: Message }) => {
  const isUserMessage = item.isUser;
  const isGroupChat = chatData?.isGroup;
  
  // Validate and fix image URL
  const shouldShowImage = ImageMessageFixer.shouldShowImage(item);
  const safeImageUrl = ImageMessageFixer.getSafeImageUrl(item);
  
  // Log any image issues for debugging
  if (item.imageUrl && !shouldShowImage) {
    ImageMessageFixer.logImageIssue(item, 'renderMessage');
  }

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

          {/* Display image if valid */}
          {shouldShowImage && safeImageUrl && (
            <TouchableOpacity 
              onPress={() => {
                setFullScreenImage(safeImageUrl);
                setShowImageViewer(true);
              }} 
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: safeImageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ [IMAGE ERROR] Failed to load message image:', {
                    messageId: item.id,
                    imageUrl: safeImageUrl?.substring(0, 50) + '...',
                    originalUrl: item.imageUrl,
                    error: error.nativeEvent.error
                  });
                }}
                onLoad={() => {
                  console.log('✅ [IMAGE LOADED] Message image loaded successfully:', {
                    messageId: item.id,
                    imageUrl: safeImageUrl?.substring(0, 50) + '...'
                  });
                }}
              />
            </TouchableOpacity>
          )}

          {/* Show text if present, or handle image-only messages */}
          {item.text && item.text.trim() !== '' ? (
            <Text style={[
              styles.messageText,
              { color: isUserMessage ? '#ffffff' : colors.text }
            ]}>
              {renderTextWithLinks(item.text, isUserMessage)}
            </Text>
          ) : shouldShowImage ? (
            // Image-only message - no text needed
            null
          ) : (
            // Fallback for messages with no valid content
            <Text style={[
              styles.messageText,
              { color: isUserMessage ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontStyle: 'italic' }
            ]}>
              {item.status === 'sending' ? 'Sending...' : 
               item.status === 'failed' ? 'Failed to send' : 
               'Message content unavailable'}
            </Text>
          )}
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
}, [colors, chatData?.isGroup, renderTextWithLinks, retryMessage]);
  // Header component - render directly without useMemo to avoid undefined issues
  const renderHeader = () => {
    // Ensure we always have chatData to prevent disappearing header
    if (!chatData) return null;
    
    // Use stable values - prefer existing state over potentially incomplete chatData
    const displayName = chatData.isGroup 
      ? (groupName || chatData.name || 'Group') 
      : (chatData.username || chatData.name || 'User');
    
    // For groups, prioritize groupAvatar state, then chatData.avatar
    // For 1-on-1, use chatData.avatar
    const displayAvatar = chatData.isGroup 
      ? (groupAvatar || chatData.avatar || '') 
      : (chatData.avatar || '');
    
    const displayUserId = chatData.userId || 'unknown';
    
    console.log('Header render:', { displayName, displayAvatar, isGroup: chatData.isGroup, groupAvatar, chatDataAvatar: chatData.avatar });
    
    return (
      <View style={[styles.header, { backgroundColor: colors?.background || '#000', borderBottomColor: colors?.border || '#333' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors?.text || '#fff'} />
        </TouchableOpacity>
        
        {/* Avatar - Click to go to user profile */}
        <TouchableOpacity 
          style={styles.avatarButton}
          onPress={() => {
            console.log('Avatar clicked', { isGroup: chatData.isGroup, userId: displayUserId });
            if (!chatData.isGroup && displayUserId && displayUserId !== 'unknown' && displayUserId !== 'loading') {
              console.log('Navigating to profile:', displayUserId);
              router.push(`/profile/${displayUserId}`);
            } else if (chatData.isGroup) {
              console.log('Group chat - opening group info');
              setShowGroupInfo(true);
            }
          }}
        >
          {displayAvatar && displayAvatar.trim() !== '' ? (
            <Image 
              source={{ uri: displayAvatar }} 
              style={styles.avatar}
              onError={() => console.log('Avatar failed to load:', displayAvatar)}
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
        </TouchableOpacity>

        {/* Profile Info - Click to open group info or profile */}
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
  // Auto-mention functionality
  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
    
    // Auto-mention detection for group chats
    if (chatData?.isGroup && groupMembers.length > 0) {
      const words = text.split(/\s/);
      const lastWord = words[words.length - 1];
      
      if (lastWord?.startsWith('@')) {
        if (lastWord.length === 1) {
          // Just typed @, show all members
          setFilteredMentionMembers(groupMembers);
          setShowMentionModal(groupMembers.length > 0);
        } else if (lastWord.length > 1) {
          // Typing username after @
          const query = lastWord.substring(1).toLowerCase();
          const filteredMembers = groupMembers.filter((m) => {
            const username = m?.user?.username;
            if (!username || typeof username !== 'string') return false;
            return username.toLowerCase().includes(query);
          });
          setFilteredMentionMembers(filteredMembers);
          setShowMentionModal(filteredMembers.length > 0);
        }
      } else {
        setShowMentionModal(false);
        setFilteredMentionMembers([]);
      }
    } else {
      // Not a group or no members
      setShowMentionModal(false);
      setFilteredMentionMembers([]);
    }
  }, [chatData?.isGroup, groupMembers]);

  // Input component - render directly to avoid undefined issues
  const renderMessageInput = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.inputContainer}
    >
      {/* Show pending image preview */}
      {pendingImageUri && (
        <View style={[styles.imagePreviewContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Image
            source={{ uri: pendingImageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => {
              setPendingImageUri(null);
              setPendingImageCompression(null);
            }}
          >
            <X size={16} color="#ffffff" />
          </TouchableOpacity>
          {isCompressingImage && (
            <View style={styles.imagePreviewLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      )}

      <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        {/* Emoji picker button - Left */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(prev => !prev)}
          style={styles.inputIconButton}
          activeOpacity={0.7}
        >
          <Smile size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={message}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          multiline={false}
          maxLength={1000}
        />

        {/* Image picker button - Center */}
        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.inputIconButton}
          disabled={isCompressingImage}
          activeOpacity={0.7}
        >
          <ImageIcon size={24} color={isCompressingImage ? colors.textMuted + '50' : colors.textMuted} />
        </TouchableOpacity>

        {/* Send button - Right */}
        <TouchableOpacity 
          onPress={sendMessage}
          style={[styles.sendButton, { 
            backgroundColor: (!message.trim() && !pendingImageUri) || isSending || isCompressingImage 
              ? colors.textMuted + '40' 
              : colors.primary 
          }]}
          disabled={(!message.trim() && !pendingImageUri) || isSending || isCompressingImage}
          activeOpacity={0.8}
        >
          <Send size={18} color="#ffffff" />
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
        initialNumToRender={200}
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
            {chatData.isGroup ? (
              <>
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      setShowOptionsMenu(false);
                      handleDeleteChat();
                    }}
                  >
                    <Trash2 size={20} color="#ff4444" />
                    <Text style={[styles.optionText, styles.destructiveText]}>Delete Group</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    handleLeaveGroup();
                  }}
                >
                  <UserX size={20} color="#ff4444" />
                  <Text style={[styles.optionText, styles.destructiveText]}>Leave Group</Text>
                </TouchableOpacity>
              </>
            ) : (
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
            )}
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
            {/* Header with Gradient */}
            <LinearGradient
              colors={['#3B8FE8', '#e385ec']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.groupInfoHeaderGradient}
            >
              <View style={[styles.groupInfoHeader, { borderBottomWidth: 0 }]}>
                <TouchableOpacity onPress={() => setShowGroupInfo(false)} style={styles.groupInfoCloseButton}>
                  <ArrowLeft size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.groupInfoTitle}>Group Info</Text>
                <View style={styles.groupInfoHeaderSpacer} />
              </View>
            </LinearGradient>
            
            {/* Group Avatar and Name */}
            <ScrollView 
              style={styles.groupInfoContent} 
              contentContainerStyle={styles.groupInfoContentContainer}
              showsVerticalScrollIndicator={false}
            >
                <View style={styles.groupAvatarSection}>
                  <View style={styles.groupAvatarContainer}>
                    {(groupAvatar || chatData?.avatar) ? (
                      <Image 
                        source={{ uri: groupAvatar || chatData?.avatar }} 
                        style={styles.groupAvatarLarge}
                        onError={() => {
                          console.log('Group avatar failed to load, using placeholder');
                          setGroupAvatar('');
                        }}
                      />
                    ) : (
                      <View style={[styles.groupAvatarLarge, styles.groupAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                        <Users size={50} color={colors.primary} />
                      </View>
                    )}
                    {isAdmin && (
                      <LinearGradient
                        colors={['#3B8FE8', '#e385ec']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.groupAvatarEditButton}
                      >
                        <TouchableOpacity 
                          onPress={handleSetGroupAvatar}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Camera size={18} color="#ffffff" />
                        </TouchableOpacity>
                      </LinearGradient>
                    )}
                  </View>
                  
                  {/* Group Name Card */}
                  <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>NAME</Text>
                    <View style={styles.infoCardRow}>
                      <Text style={[styles.infoCardValue, { color: colors.text, flex: 1 }]}>
                        {groupName || chatData?.name || 'Group'}
                      </Text>
                      {isAdmin && (
                        <TouchableOpacity 
                          onPress={() => {
                            setEditNameInput(groupName);
                            setShowEditNameModal(true);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Edit3 size={18} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {/* Group Description Card */}
                  <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
                    <View style={styles.infoCardRow}>
                      <Text style={[styles.infoCardValue, { color: colors.text, flex: 1 }]}>
                        {groupDescription || 'No description'}
                      </Text>
                      {isAdmin && (
                        <TouchableOpacity 
                          onPress={() => {
                            setEditDescInput(groupDescription);
                            setShowEditDescModal(true);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Edit3 size={18} color={colors.secondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                </View>
                
                {/* Group Actions */}
                <View style={styles.groupActionsSection}>
                  {/* Add Members - Only for admin */}
                  {isAdmin && (
                    <TouchableOpacity 
                      style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary, marginBottom: Spacing.md }]}
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
                      <LinearGradient
                        colors={['#3B8FE8', '#e385ec']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.actionCardIcon}
                      >
                        <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
                      </LinearGradient>
                      <View style={styles.actionCardContent}>
                        <Text style={[styles.actionCardTitle, { color: colors.text }]}>Add Members</Text>
                        <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>Invite people to this group</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* View Members - Always visible */}
                  <View style={[styles.actionCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <LinearGradient
                      colors={['#3B8FE8', '#e385ec']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionCardIcon}
                    >
                      <Users size={22} color="#ffffff" />
                    </LinearGradient>
                    <View style={styles.actionCardContent}>
                      <Text style={[styles.actionCardTitle, { color: colors.text }]}>Members</Text>
                      <Text style={[styles.actionCardSubtitle, { color: colors.textMuted }]}>{chatData.memberCount || 0} members in this group</Text>
                    </View>
                  </View>
                  
                  {/* Members List */}
                  <View style={styles.membersList}>
                    {chatData.participants?.map((participant: any) => (
                      <TouchableOpacity
                        key={participant.userId}
                        style={[styles.memberItem, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => {
                          if (participant.userId !== user?.id) {
                            setShowGroupInfo(false);
                            router.push(`/profile/${participant.userId}`);
                          }
                        }}
                      >
                        {participant.user?.avatar ? (
                          <Image source={{ uri: participant.user.avatar }} style={styles.memberAvatar} />
                        ) : (
                          <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={{ fontSize: 16 }}>👤</Text>
                          </View>
                        )}
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.text }]}>
                            {participant.user?.username || 'User'}
                            {participant.userId === user?.id && ' (You)'}
                            {participant.userId === chatData.createdById && ' 👑'}
                          </Text>
                          {participant.userId === chatData.createdById && (
                            <Text style={[styles.memberRole, { color: colors.primary }]}>Admin</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Group Name</Text>
            <TextInput
              style={[styles.editModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
              value={editNameInput}
              onChangeText={setEditNameInput}
              placeholder="Enter group name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text style={[styles.editModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.primary, opacity: isSavingName ? 0.7 : 1 }]}
                onPress={async () => {
                  if (editNameInput && editNameInput.trim() && !isSavingName) {
                    setIsSavingName(true);
                    try {
                      await apiService.updateGroupName(String(chatData.id), editNameInput.trim());
                      setGroupName(editNameInput.trim());
                      setShowEditNameModal(false);
                      Alert.alert('Success', 'Group name updated!');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update name');
                    } finally {
                      setIsSavingName(false);
                    }
                  }
                }}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.editModalButtonText, { color: '#ffffff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Description Modal */}
      <Modal
        visible={showEditDescModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditDescModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Description</Text>
            <TextInput
              style={[styles.editModalInput, styles.editModalTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
              value={editDescInput}
              onChangeText={setEditDescInput}
              placeholder="Enter group description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowEditDescModal(false)}
              >
                <Text style={[styles.editModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: colors.secondary, opacity: isSavingDesc ? 0.7 : 1 }]}
                onPress={async () => {
                  if (!isSavingDesc) {
                    setIsSavingDesc(true);
                    try {
                      await apiService.updateGroupDescription(String(chatData.id), editDescInput.trim());
                      setGroupDescription(editDescInput.trim());
                      setShowEditDescModal(false);
                      Alert.alert('Success', 'Description updated!');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update description');
                    } finally {
                      setIsSavingDesc(false);
                    }
                  }
                }}
                disabled={isSavingDesc}
              >
                {isSavingDesc ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.editModalButtonText, { color: '#ffffff' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-mention suggestions */}
      {showMentionModal && chatData?.isGroup && (
      <View style={[styles.mentionSuggestions, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
      >
        <FlatList
          data={filteredMentionMembers}
          keyExtractor={(item, index) => item.userId || `member-${index}`}
          renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mentionSuggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  const username = item.user?.username || 'User';
                  const words = message.split(/\s/);
                  words[words.length - 1] = `@${username}`;
                  const newMessage = words.join(' ') + ' ';
                  setMessage(newMessage);
                  setShowMentionModal(false);
                }}
              >
                {item.user?.avatar ? (
                  <Image source={{ uri: item.user.avatar }} style={styles.mentionSuggestionAvatar} />
                ) : (
                  <View style={[styles.mentionSuggestionAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ color: colors.primary, fontSize: 12 }}>👤</Text>
                  </View>
                )}
                <Text style={[styles.mentionSuggestionText, { color: colors.text }]}>
                  @{item.user?.username || 'User'}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.mentionSuggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Full Screen Image Viewer Modal */}
      <ImageViewer 
        visible={showImageViewer}
        imageUri={fullScreenImage || ''}
        onClose={() => {
          setShowImageViewer(false);
          setFullScreenImage(null);
        }}
      />

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <View style={[styles.emojiPickerContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.emojiPickerHeader}>
            <Text style={[styles.emojiPickerTitle, { color: colors.text }]}>Pick an Emoji</Text>
            <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.emojiPickerScroll} contentContainerStyle={styles.emojiPickerContent}>
            <View style={styles.emojiGrid}>
              {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😎', '🤔', '🤐', '😏', '😬', '🙄', '😌', '😔', '😴', '🤯', '🥳', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🙏', '💪', '👀', '👁️', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '✨', '⭐', '🌟', '💫', '🔥', '💯', '✅', '❌', '❗', '❓', '💬', '💭', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🎮', '🎯', '🎲', '🎸', '🎹', '🎤', '🎧', '🎵', '🎶', '☕', '🍕', '🍔', '🍟', '🌭', '🍿', '🧋', '🍺', '🍻', '🥂', '🍷', '🍾', '🍹', '🍰', '🎂', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭', '🌍', '🌎', '🌏', '🗺️', '🏔️', '⛰️', '🌋', '🏕️', '🏖️', '🏝️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '🌌', '🎠', '🎡', '🎢', '💈', '🎪', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚏', '🛣️', '🛤️', '🛢️', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢', '✈️', '🛩️', '🛫', '🛬', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸'].map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => handleAddEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
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
  avatarButton: {
    padding: Spacing.xs,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
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
  messageImage: {
    width: 250,
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: FontWeights.semibold,
  },
  mentionText: {
    fontWeight: FontWeights.bold,
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
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.md,
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  // Auto-mention suggestion styles
  mentionSuggestions: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.md,
    right: Spacing.md,
    maxHeight: 200,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  mentionSuggestionsList: {
    maxHeight: 200,
  },
  mentionSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
  },
  mentionSuggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionSuggestionText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  groupInfoModal: {
    height: '75%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  groupInfoHeaderGradient: {
    paddingTop: Spacing.md,
  },
  groupInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  groupInfoCloseButton: {
    padding: Spacing.xs,
  },
  groupInfoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
  },
  groupInfoHeaderSpacer: {
    width: 40,
  },

  groupInfoContent: {
    flex: 1,
  },
  groupInfoContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  groupAvatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  groupAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  groupAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  groupAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  groupAvatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  infoCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCardValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  groupActionsSection: {
    marginTop: Spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: FontSizes.xs,
  },
  memberCountText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  editModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  editModalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  editModalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editModalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  editModalButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
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

  // Members List Styles
  membersList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  memberRole: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    marginTop: 2,
  },
  // Image preview and emoji picker styles
  imagePreviewContainer: {
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
  },
  imagePreviewClose: {
    position: 'absolute',
    top: Spacing.md + 8,
    right: Spacing.md + 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
  },
  inputIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  emojiPickerContainer: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.md,
    right: Spacing.md,
    height: 300,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  emojiPickerTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  emojiPickerScroll: {
    flex: 1,
  },
  emojiPickerContent: {
    padding: Spacing.sm,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  emojiText: {
    fontSize: 24,
  },
});
export default ChatScreen;

