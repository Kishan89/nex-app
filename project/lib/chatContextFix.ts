// lib/chatContextFix.ts - Fix for ChatContext real-time updates
import { socketService } from './socketService';
import { ultraFastChatCache } from './ChatCache';

export class ChatContextFix {
  private static instance: ChatContextFix;
  private messageHandlers = new Map<string, (message: any) => void>();

  static getInstance(): ChatContextFix {
    if (!ChatContextFix.instance) {
      ChatContextFix.instance = new ChatContextFix();
    }
    return ChatContextFix.instance;
  }

  // Enhanced message handler that ensures receivers get updates
  setupGlobalMessageHandler(userId: string, onMessageReceived: (chatId: string, message: any) => void) {
    // Remove existing handler
    this.cleanup();

    const handleMessage = (socketMessage: any) => {
      // Skip messages from current user (they handle optimistically)
      if (socketMessage.sender?.id === userId) {
        return;
      }

      console.log('🔄 [CONTEXT FIX] Processing message for receiver:', {
        messageId: socketMessage.id,
        chatId: socketMessage.chatId,
        senderId: socketMessage.sender?.id,
        currentUserId: userId
      });

      // Add to cache immediately
      ultraFastChatCache.addMessageInstantly(socketMessage.chatId, {
        id: socketMessage.id,
        text: socketMessage.text || socketMessage.content || '',
        isUser: false,
        timestamp: new Date(socketMessage.timestamp || Date.now()).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        status: 'delivered',
        sender: socketMessage.sender,
        imageUrl: socketMessage.imageUrl
      });

      // Notify handler
      onMessageReceived(socketMessage.chatId, socketMessage);
    };

    // Set up socket listener
    const unsubscribe = socketService.onNewMessage(handleMessage);
    this.messageHandlers.set('global', unsubscribe);

    return () => this.cleanup();
  }

  cleanup() {
    for (const [key, unsubscribe] of this.messageHandlers) {
      unsubscribe();
    }
    this.messageHandlers.clear();
  }
}

export const chatContextFix = ChatContextFix.getInstance();