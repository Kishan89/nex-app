import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState } from 'react-native';
import { apiService } from './api';
import { logger } from './logger';
import { fcmService } from './fcmService';
// Notification deduplication service removed - using clean FCM now
export interface SocketMessage {
  id: string;
  text: string;
  content?: string; // Add content field as optional
  isUser: boolean;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
  chatId: string;
}
export interface SocketNotification {
  type: 'MESSAGE' | 'LIKE' | 'COMMENT' | 'FOLLOW';
  fromUser: string;
  message: string;
  chatId?: string;
  postId?: string;
  userId?: string;
}
class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private messageListeners: ((message: SocketMessage) => void)[] = [];
  private notificationListeners: ((notification: SocketNotification) => void)[] = [];
  private typingListeners: ((data: { userId: string; chatId: string; isTyping: boolean }) => void)[] = [];
  private onlineStatusListeners: ((data: { userId: string; isOnline: boolean }) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentUserId: string | null = null;
  private currentChatId: string | null = null;
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        logger.error('❌ No auth token found for socket connection');
        return;
      }
      // Get current user ID for notification filtering
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          this.currentUserId = userData.id;
        }
        // Also try to get from authToken or other sources
        const authDataStr = await AsyncStorage.getItem('authData');
        if (authDataStr && !this.currentUserId) {
          const authData = JSON.parse(authDataStr);
          this.currentUserId = authData.user?.id || authData.id;
        }
      } catch (userError) {
        logger.error('❌ Failed to load user ID:', userError);
      }
      // Use the same base URL as API for consistency
      const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'https://nex-app-production.up.railway.app';
      this.socket = io(serverUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 30000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: false,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: true
      });
      this.setupEventListeners();
    } catch (error) {
      logger.error('❌ Socket connection error:', error);
      this.scheduleReconnect();
    }
  }
  private setupEventListeners(): void {
    if (!this.socket) return;
    // Remove all existing listeners to prevent duplicates
    this.socket.removeAllListeners();
    const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'https://nex-app-production.up.railway.app';
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Try to set current user ID if not already set
      if (!this.currentUserId) {
        this.loadCurrentUserIdFromStorage();
      }
      });
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.scheduleReconnect();
      }
    });
    this.socket.on('connect_error', (error) => {
      logger.error('❌ Socket connection error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });
    // Message events - UI updates and in-app notifications
    this.socket.on('new_message', async (message: SocketMessage) => {
      // UI updates - notify all listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          }
      });
      // IMPORTANT: Only show in-app notification if:
      // 1. Message is NOT from current user (sender should never see their own notification)
      // 2. User is NOT currently in the chat (don't show banner if already viewing the chat)
      
      // Ensure currentUserId is set before checking
      if (!this.currentUserId) {
        await this.loadCurrentUserIdFromStorage();
      }
      
      const isSender = message.sender?.id === this.currentUserId;
      const isInCurrentChat = this.isUserInCurrentChat(message.chatId);
      
      console.log('🔍 [SOCKET] New message received:', {
        senderId: message.sender?.id,
        currentUserId: this.currentUserId,
        chatId: message.chatId,
        currentChatId: this.currentChatId,
        isSender,
        isInCurrentChat,
        senderIdType: typeof message.sender?.id,
        currentUserIdType: typeof this.currentUserId
      });
      
      // CRITICAL: Never show notification banner to sender, even if they leave the chat
      // Use strict equality check and also check string comparison in case of type mismatch
      const isSenderStrict = isSender || String(message.sender?.id) === String(this.currentUserId);
      
      if (!isSenderStrict && !isInCurrentChat) {
        console.log('📬 [SOCKET] Showing notification banner for message from:', message.sender?.username);
        DeviceEventEmitter.emit('showNotificationBanner', {
          title: message.sender?.username || 'New Message',
          body: message.text || message.content || 'sent you a message',
          data: {
            type: 'message',
            chatId: message.chatId,
            senderId: message.sender?.id,
            username: message.sender?.username,
            avatar: message.sender?.avatar,
          },
          onPress: () => {
            // Navigate to chat
            const router = require('expo-router').router;
            router.push(`/chat/${message.chatId}`);
          }
        });
      } else if (isSenderStrict) {
        console.log('🔕 [SOCKET] Suppressing notification - message is from current user');
      } else if (isInCurrentChat) {
        console.log('🔕 [SOCKET] Suppressing notification - user is in this chat');
      }
    });
    this.socket.on('message_status_updated', (data: { messageId: string; status: string }) => {
      // Update message status in UI
    });
    // Socket notifications DISABLED - FCM handles all push notifications
    this.socket.on('new_notification', (notification: SocketNotification) => {
      // Socket notifications are disabled, FCM handles all notifications
      // This event should not be fired from backend
    });
    // Typing events
    this.socket.on('user_typing', (data: { userId: string; chatId: string }) => {
      this.typingListeners.forEach(listener => 
        listener({ ...data, isTyping: true })
      );
    });
    this.socket.on('user_stopped_typing', (data: { userId: string; chatId: string }) => {
      this.typingListeners.forEach(listener => 
        listener({ ...data, isTyping: false })
      );
    });
    // Online status events - no logging to prevent spam
    this.socket.on('user_online', (data: { userId: string }) => {
      this.onlineStatusListeners.forEach(listener => listener({ ...data, isOnline: true }));
    });
    this.socket.on('user_offline', (data: { userId: string }) => {
      this.onlineStatusListeners.forEach(listener => 
        listener({ ...data, isOnline: false })
      );
    });
    // Error handling
    this.socket.on('message_error', (error: { error: string }) => {
      logger.error('❌ Message error:', error);
    });
  }
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.log('❌ Max reconnection attempts reached');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    logger.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  // Chat methods
  joinChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_chat', chatId);
      } else {
      }
  }
  leaveChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat', chatId);
    }
  }
  sendMessage(chatId: string, content: string, tempMessageId?: string): Promise<{success: boolean, messageId?: string, tempMessageId?: string, status?: string, timestamp?: string, error?: string}> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        // Send message with acknowledgment callback
        this.socket.emit('send_message', { chatId, content, tempMessageId }, (response: any) => {
          if (response?.success) {
            resolve({
              success: true,
              messageId: response.messageId,
              tempMessageId: response.tempMessageId,
              status: response.status,
              timestamp: response.timestamp
            });
          } else {
            resolve({
              success: false,
              error: response?.error || 'Unknown error',
              tempMessageId: response?.tempMessageId
            });
          }
        });
        } else {
        logger.error('❌ Cannot send message: Socket not connected');
        // Try to reconnect
        this.connect();
        resolve({
          success: false,
          error: 'Socket not connected'
        });
      }
    });
  }
  // Typing indicators
  startTyping(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { chatId });
    }
  }
  stopTyping(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }
  // Message status updates
  updateMessageStatus(messageId: string, status: string, chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('message_status_update', { messageId, status, chatId });
    }
  }
  // Event listeners
  onNewMessage(listener: (message: SocketMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }
  onNewNotification(listener: (notification: SocketNotification) => void): () => void {
    this.notificationListeners.push(listener);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(l => l !== listener);
    };
  }
  onTypingChange(listener: (data: { userId: string; chatId: string; isTyping: boolean }) => void): () => void {
    this.typingListeners.push(listener);
    return () => {
      this.typingListeners = this.typingListeners.filter(l => l !== listener);
    };
  }
  onOnlineStatusChange(listener: (data: { userId: string; isOnline: boolean }) => void): () => void {
    this.onlineStatusListeners.push(listener);
    return () => {
      this.onlineStatusListeners = this.onlineStatusListeners.filter(l => l !== listener);
    };
  }
  // Add message status update listener
  onMessageStatusUpdate(listener: (data: { messageId: string; status: string }) => void): () => void {
    if (this.socket?.connected) {
      this.socket.on('message_status_updated', listener);
      return () => {
        if (this.socket?.connected) {
          this.socket.off('message_status_updated', listener);
        }
      };
    }
    return () => {}; // Return empty cleanup function if not connected
  }
  // Add message listener (for chat list updates)
  addMessageListener(listener: (message: any) => void): void {
    this.messageListeners.push(listener);
  }
  // Remove message listener
  removeMessageListener(listener: (message: any) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }
  // Connection status
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
  // Get connection status
  getConnectionStatus(): { connected: boolean; socketId?: string } {
    return {
      connected: this.isSocketConnected(),
      socketId: this.socket?.id
    };
  }
  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }
  // Set current user ID for notification filtering
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }
  // Get current user ID (for debugging)
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
  // Set current chat ID when user enters a chat
  setCurrentChatId(chatId: string | null): void {
    // This can be used to track which chat the user is currently in
    this.currentChatId = chatId;
  }
  // Check if user is currently in a specific chat
  private isUserInCurrentChat(chatId: string): boolean {
    // Check if user is in the same chat using instance state
    const currentChatId = this.getCurrentChatId();
    return currentChatId === chatId;
  }
  // Get current chat ID
  private getCurrentChatId(): string | null {
    return this.currentChatId;
  }
  // Load current user ID from storage
  private async loadCurrentUserIdFromStorage(): Promise<void> {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.id) {
          this.currentUserId = userData.id;
          return;
        }
      }
      const authDataStr = await AsyncStorage.getItem('authData');
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        const userId = authData.user?.id || authData.id;
        if (userId) {
          this.currentUserId = userId;
          return;
        }
      }
      // Could not find user ID in storage
    } catch (error) {
      logger.error('❌ Failed to load current user ID from storage:', error);
    }
  }
  // Socket service no longer triggers notifications - FCM handles all notifications (Instagram-like)
  // This method is removed to prevent duplicate notifications
  // Cleanup
  cleanup(): void {
    logger.log('🧹 SocketService: Cleaning up all connections and listeners');
    this.messageListeners = [];
    this.notificationListeners = [];
    this.typingListeners = [];
    this.onlineStatusListeners = [];
    this.currentUserId = null;
    this.reconnectAttempts = 0;
    this.disconnect();
  }
  // Force reconnect with new authentication
  async forceReconnect(): Promise<void> {
    logger.log('🔄 SocketService: Force reconnecting with fresh authentication');
    this.cleanup();
    await this.connect();
  }
  // Initialize socket connection with retry
  async initialize(): Promise<boolean> {
    try {
      await this.connect();
      // Wait for connection to establish
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000);
        if (this.isSocketConnected()) {
          clearTimeout(timeout);
          resolve(true);
          return;
        }
        const checkConnection = () => {
          if (this.isSocketConnected()) {
            clearTimeout(timeout);
            resolve(true);
          } else {
            setTimeout(checkConnection, 500);
          }
        };
        checkConnection();
      });
    } catch (error) {
      return false;
    }
  }
}
export const socketService = new SocketService();
export default socketService;
