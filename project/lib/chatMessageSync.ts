// lib/chatMessageSync.ts - Real-time message synchronization fix
import { socketService } from './socketService';
import { ultraFastChatCache } from './ChatCache';
import { Message } from '@/types';

interface MessageSyncOptions {
  chatId: string;
  userId: string;
  onMessageReceived: (message: Message) => void;
  onMessageUpdated: (messages: Message[]) => void;
}

class ChatMessageSync {
  private activeListeners = new Map<string, () => void>();
  private syncIntervals = new Map<string, NodeJS.Timeout>();

  // Start real-time sync for a chat
  startSync(options: MessageSyncOptions) {
    const { chatId, userId, onMessageReceived, onMessageUpdated } = options;
    
    // Clean up existing listeners
    this.stopSync(chatId);

    // Socket listener for real-time messages
    const socketUnsubscribe = socketService.onNewMessage((socketMessage) => {
      if (String(socketMessage.chatId) !== String(chatId)) return;
      
      // Skip messages from current user (handled optimistically)
      if (socketMessage.sender?.id === userId) return;

      const newMessage: Message = {
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
      };

      // Add to cache immediately
      ultraFastChatCache.addMessageInstantly(chatId, newMessage);
      
      // Notify UI
      onMessageReceived(newMessage);
    });

    // Periodic sync to catch missed messages
    const syncInterval = setInterval(async () => {
      try {
        const cachedMessages = ultraFastChatCache.getInstantMessages(chatId);
        const cacheAge = ultraFastChatCache.getCacheAge(chatId);
        
        // Sync if cache is older than 30 seconds
        if (cacheAge > 30000) {
          const { apiService } = await import('./api');
          const freshMessages = await apiService.getChatMessages(chatId);
          
          if (Array.isArray(freshMessages) && freshMessages.length > 0) {
            const formattedMessages: Message[] = freshMessages.map((msg: any) => ({
              id: msg.id,
              text: msg.text || msg.content,
              isUser: msg.senderId === userId,
              timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }),
              status: 'delivered',
              sender: msg.sender,
              imageUrl: msg.imageUrl
            }));

            // Update cache
            await ultraFastChatCache.cacheMessages(chatId, formattedMessages, {
              id: chatId,
              name: 'Chat',
              avatar: ''
            });

            // Notify UI if there are new messages
            if (formattedMessages.length > cachedMessages.length) {
              onMessageUpdated(formattedMessages);
            }
          }
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }, 15000); // Sync every 15 seconds

    // Store cleanup functions
    this.activeListeners.set(chatId, socketUnsubscribe);
    this.syncIntervals.set(chatId, syncInterval);
  }

  // Stop sync for a chat
  stopSync(chatId: string) {
    const unsubscribe = this.activeListeners.get(chatId);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(chatId);
    }

    const interval = this.syncIntervals.get(chatId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(chatId);
    }
  }

  // Stop all syncs
  stopAllSyncs() {
    for (const [chatId] of this.activeListeners) {
      this.stopSync(chatId);
    }
  }
}

export const chatMessageSync = new ChatMessageSync();