import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../lib/api';
import { useAuth } from './AuthContext';
import { socketService, SocketMessage } from '../lib/socketService';
import { Message } from '../types';
import { logger } from '../lib/logger';
import { getCurrentTimestamp, fixServerTimestamp } from '../lib/timestampUtils';
import { chatContextFix } from '../lib/chatContextFix';
interface ChatContextType {
  totalUnreadCount: number;
  chatReadCounts: Record<string, number>;
  updateReadCount: (chatId: string, readCount: number) => void;
  refreshUnreadCounts: () => Promise<void>;
  markChatAsRead: (chatId: string, totalMessages: number) => void;
  // Global message management
  getChatMessages: (chatId: string) => Message[];
  addMessageToChat: (chatId: string, message: Message, skipDuplicateCheck?: boolean) => void;
  clearChatMessages: (chatId: string) => void;
  mergeServerMessages: (chatId: string, serverMessages: Message[]) => Message[];
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [chatReadCounts, setChatReadCounts] = useState<Record<string, number>>({});
  const [globalChatMessages, setGlobalChatMessages] = useState<Record<string, Message[]>>({});
  const { user } = useAuth();
  const processedMessageIds = useRef(new Set<string>());
  const socketInitialized = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Load read counts from AsyncStorage
  const loadReadCounts = useCallback(async () => {
    if (!user?.id) return {};
    try {
      const stored = await AsyncStorage.getItem(`chat_read_counts_${user.id}`);
      const counts = stored ? JSON.parse(stored) : {};
      setChatReadCounts(counts);
      return counts;
    } catch (error) {
      return {};
    }
  }, [user?.id]);
  // Save read counts to AsyncStorage
  const saveReadCounts = useCallback(async (counts: Record<string, number>) => {
    if (!user?.id) return;
    try {
      await AsyncStorage.setItem(`chat_read_counts_${user.id}`, JSON.stringify(counts));
    } catch (error) {
      // Failed to save read counts
    }
  }, [user?.id]);
  // Debounced refresh to prevent multiple rapid calls
  const refreshUnreadCountsDebounced = useCallback(async () => {
    if (!user?.id) return;
    try {
      const chats = await apiService.getUserChats(user.id);
      const readCounts = await loadReadCounts();
      let totalUnread = 0;
      if (chats && Array.isArray(chats)) {
        chats.forEach((chat: any) => {
          // Backend now returns accurate unread count (only unread messages from others)
          const unreadCount = chat.unread || 0;
          // Simply add the backend unread count (no local calculation needed)
          totalUnread += unreadCount;
        });
      }
      // Ensure we never have negative unread counts
      totalUnread = Math.max(0, totalUnread);
      setTotalUnreadCount(totalUnread);
    } catch (error) {
      // Silent error handling for performance
    }
  }, [user?.id, loadReadCounts]);
  // Debounce the refresh function to prevent multiple rapid calls
  const refreshUnreadCounts = useCallback(async () => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    // Set a new timeout to debounce the calls
    return new Promise<void>((resolve) => {
      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshUnreadCountsDebounced();
        resolve();
      }, 300); // 300ms debounce
    });
  }, [refreshUnreadCountsDebounced]);
  // Update read count for a specific chat
  const updateReadCount = useCallback((chatId: string, readCount: number) => {
    const newReadCounts = {
      ...chatReadCounts,
      [chatId]: readCount
    };
    setChatReadCounts(newReadCounts);
    saveReadCounts(newReadCounts);
    // Refresh total count
    refreshUnreadCounts();
  }, [chatReadCounts, saveReadCounts, refreshUnreadCounts]);
  // Mark chat as completely read
  const markChatAsRead = useCallback((chatId: string, currentUnreadCount: number) => {
    // Since backend now handles unread counts accurately, just refresh from server
    // This ensures we get the most up-to-date unread counts
    refreshUnreadCounts();
    // Immediately update total unread count for instant UI feedback
    setTotalUnreadCount(prev => {
      const newTotal = Math.max(0, prev - currentUnreadCount);
      return newTotal;
    });
  }, [refreshUnreadCounts]);
  // Helper function to merge messages intelligently with minimal logging
  const mergeMessages = useCallback((existingMessages: Message[], newMessages: Message[], sourceLabel: string = ''): Message[] => {
    const messageMap = new Map<string, Message>();
    let addedCount = 0;
    let skippedCount = 0;
    // Add existing messages to map
    existingMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    // Add/update with new messages (newer data wins)
    newMessages.forEach(msg => {
      const existing = messageMap.get(msg.id);
      // Skip if we already have this exact message
      if (existing && existing.id === msg.id && existing.text === msg.text) {
        skippedCount++;
        return;
      }
      // Add the new message
      messageMap.set(msg.id, msg);
      addedCount++;
    });
    // Convert back to array and sort by creation time
    let mergedMessages = Array.from(messageMap.values());
    
    // 🔒 CRITICAL: Remove temp messages when their server versions exist
    // This prevents duplicate temp + server messages from appearing together
    mergedMessages = mergedMessages.filter(msg => {
      // Keep all non-temp messages
      if (!msg.id.startsWith('temp_')) return true;
      
      // For temp messages, check if a matching server message exists
      // Match by: same sender + (same text OR both have images)
      const hasServerVersion = mergedMessages.some(serverMsg => 
        !serverMsg.id.startsWith('temp_') &&
        serverMsg.sender?.id === msg.sender?.id &&
        (
          // Text match (for text messages)
          serverMsg.text === msg.text ||
          // Image match (for image messages - both have imageUrl)
          (msg.imageUrl && serverMsg.imageUrl)
        )
      );
      
      if (hasServerVersion) {
        return false; // Remove this temp message
      }
      
      return true;
    });
    
    // Sort messages chronologically
    mergedMessages.sort((a, b) => {
      // Temp messages should appear at the end (most recent)
      if (a.id.startsWith('temp_') && !b.id.startsWith('temp_')) return 1;
      if (!a.id.startsWith('temp_') && b.id.startsWith('temp_')) return -1;
      // For temp messages, sort by creation time (embedded in ID)
      if (a.id.startsWith('temp_') && b.id.startsWith('temp_')) {
        const timeA = parseInt(a.id.split('_')[1]) || 0;
        const timeB = parseInt(b.id.split('_')[1]) || 0;
        return timeA - timeB;
      }
      // For real messages, sort by ID (usually chronological)
      return a.id.localeCompare(b.id);
    });
    // Merge completed
    return mergedMessages;
  }, []);
  // Global message management functions
  const getChatMessages = useCallback((chatId: string): Message[] => {
    const messages = globalChatMessages[chatId] || [];
    // Don't log every retrieval - too spammy
    return messages;
  }, [globalChatMessages]);
  const addMessageToChat = useCallback((chatId: string, message: Message, skipDuplicateCheck: boolean = false) => {
    setGlobalChatMessages(prev => {
      const existingMessages = prev[chatId] || [];
      // Enhanced duplicate check - primarily use ID for matching
      if (!skipDuplicateCheck) {
        const isDuplicate = existingMessages.some(msg => 
          msg.id === message.id
        );
        if (isDuplicate) {
          return prev;
        }
      }
      const updatedMessages = [...existingMessages, message];
      // Sort messages to maintain order
      updatedMessages.sort((a, b) => {
        if (a.id.startsWith('temp_') && !b.id.startsWith('temp_')) return 1;
        if (!a.id.startsWith('temp_') && b.id.startsWith('temp_')) return -1;
        return a.id.localeCompare(b.id);
      });
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
  }, []);
  const clearChatMessages = useCallback((chatId: string) => {
    setGlobalChatMessages(prev => {
      const newState = { ...prev };
      delete newState[chatId];
      return newState;
    });
  }, []);
  // New function to merge server messages with global messages
  const mergeServerMessages = useCallback((chatId: string, serverMessages: Message[]): Message[] => {
    const globalMessages = globalChatMessages[chatId] || [];
    // Smart merge: Don't lose messages if server returns fewer than global
    let finalMessages: Message[];
    if (globalMessages.length > 0) {
      // If global has more messages than server, preserve global messages
      if (globalMessages.length > serverMessages.length) {
        // Merge server messages into global (update existing, keep new ones)
        finalMessages = mergeMessages(globalMessages, serverMessages, `Server-${chatId}`);
      } else {
        // Server has more or equal messages, merge normally
        finalMessages = mergeMessages(serverMessages, globalMessages, `Server-${chatId}`);
      }
    } else {
      // No global messages, use server messages
      finalMessages = serverMessages;
    }
    
    // 🔒 CRITICAL: Remove temp messages when their server versions arrive
    // This prevents duplicate temp + server messages from appearing together
    finalMessages = finalMessages.filter(msg => {
      // Keep all non-temp messages
      if (!msg.id.startsWith('temp_')) return true;
      
      // For temp messages, check if a matching server message exists
      // Match by: same sender + (same text OR both have images)
      const hasServerVersion = finalMessages.some(serverMsg => 
        !serverMsg.id.startsWith('temp_') &&
        serverMsg.sender?.id === msg.sender?.id &&
        (
          // Text match (for text messages)
          serverMsg.text === msg.text ||
          // Image match (for image messages - both have imageUrl)
          (msg.imageUrl && serverMsg.imageUrl)
        )
      );
      
      if (hasServerVersion) {
        console.log('🧹 [MERGE] Removing temp message - server version exists', {
          tempId: msg.id,
          textPreview: (msg.text || '').substring(0, 30) + '...',
          hasImage: !!msg.imageUrl
        });
        return false;
      }
      
      return true;
    });
    
    // Update global state
    setGlobalChatMessages(prev => ({
      ...prev,
      [chatId]: finalMessages
    }));
    // Save to cache
    const cacheKey = `chat_messages_${chatId}`;
    AsyncStorage.setItem(cacheKey, JSON.stringify(finalMessages)).catch(() => {});
    return finalMessages;
  }, [globalChatMessages, mergeMessages]);
  // Initialize global socket listener
  useEffect(() => {
    if (!user?.id || socketInitialized.current) return;
    // Enhanced socket listener with fix
    const initializeSocket = async () => {
      try {
        // Ensure socket is connected
        if (!socketService.isSocketConnected()) {
          await socketService.connect();
        }
        
        // Use enhanced message handler
        const cleanup = chatContextFix.setupGlobalMessageHandler(
          user.id,
          (chatId: string, socketMessage: any) => {
            // Check for duplicate processing
            if (processedMessageIds.current.has(socketMessage.id)) {
              return;
            }
            
            // Mark as processed
            processedMessageIds.current.add(socketMessage.id);
            
            const newMessage: Message = {
              id: socketMessage.id,
              text: socketMessage.text || socketMessage.content,
              isUser: false,
              timestamp: fixServerTimestamp(socketMessage.timestamp) || socketMessage.timestamp,
              status: 'delivered',
              sender: socketMessage.sender,
              imageUrl: socketMessage.imageUrl
            };
            
            // Add to global store
            addMessageToChat(chatId, newMessage);
            
            // Update unread counts
            refreshUnreadCounts();
          }
        );
        
        socketInitialized.current = true;
        
        return cleanup;
      } catch (error) {
        console.error('Failed to initialize socket listener:', error);
        return () => {};
      }
    };
    initializeSocket();
  }, [user?.id, addMessageToChat, refreshUnreadCounts]);
  // Load initial data - with proper cleanup on user change
  useEffect(() => {
    if (user?.id) {
      // Reset everything first to ensure clean state
      setTotalUnreadCount(0);
      setChatReadCounts({});
      setGlobalChatMessages({});
      processedMessageIds.current.clear();
      // Then load fresh data
      loadReadCounts().then((counts) => {
        refreshUnreadCounts();
      });
    } else {
      // User logged out - ensure everything is cleared
      setTotalUnreadCount(0);
      setChatReadCounts({});
      setGlobalChatMessages({});
      processedMessageIds.current.clear();
    }
  }, [user?.id, loadReadCounts, refreshUnreadCounts]);
  // Refresh counts periodically
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      refreshUnreadCounts();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id, refreshUnreadCounts]);
  // Cleanup function for user logout/login
  const cleanupAllChatData = useCallback(async () => {
    // Cleaning up all chat data
    // Clear global state
    setGlobalChatMessages({});
    setChatReadCounts({});
    setTotalUnreadCount(0);
    // Clear processed message IDs
    processedMessageIds.current.clear();
    // Reset socket initialization flag
    socketInitialized.current = false;
    // Clear AsyncStorage cache
    try {
      if (user?.id) {
        const keys = await AsyncStorage.getAllKeys();
        const chatKeys = keys.filter(key => 
          key.startsWith('chat_messages_') || 
          key.startsWith(`chat_read_counts_${user.id}`)
        );
        if (chatKeys.length > 0) {
          await AsyncStorage.multiRemove(chatKeys);
          // Cleared cache entries
        }
      }
    } catch (error) {
      // Failed to clear chat cache
    }
  }, [user?.id]);
  // Listen for user changes and cleanup when user logs out
  useEffect(() => {
    // If user becomes null (logout), cleanup everything
    if (!user?.id && (Object.keys(globalChatMessages).length > 0 || Object.keys(chatReadCounts).length > 0)) {
      cleanupAllChatData();
    }
  }, [user?.id, globalChatMessages, chatReadCounts, cleanupAllChatData]);
  const value: ChatContextType = {
    totalUnreadCount,
    chatReadCounts,
    updateReadCount,
    refreshUnreadCounts,
    markChatAsRead,
    getChatMessages,
    addMessageToChat,
    clearChatMessages,
    mergeServerMessages,
  };
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
