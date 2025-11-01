/**
 * Comprehensive Message Persistence Layer
 * Ensures messages never disappear and provides reliable storage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '@/types';
interface PersistedMessage extends Message {
  chatId: string;
  persistedAt: number;
  syncedWithServer: boolean;
}
interface ChatPersistenceData {
  chatId: string;
  messages: PersistedMessage[];
  lastSyncTimestamp: number;
  totalMessageCount: number;
}
class MessagePersistenceManager {
  private readonly STORAGE_KEY = '@message_persistence_v2';
  private readonly BACKUP_KEY = '@message_backup_v2';
  private memoryStore: Map<string, ChatPersistenceData> = new Map();
  /**
   * Initialize persistence for a chat
   */
  async initializeChatPersistence(chatId: string): Promise<ChatPersistenceData> {
    try {
      // Load from storage first
      const stored = await this.loadChatFromStorage(chatId);
      if (stored) {
        this.memoryStore.set(chatId, stored);
        return stored;
      }
      // Create new persistence data
      const newData: ChatPersistenceData = {
        chatId,
        messages: [],
        lastSyncTimestamp: 0,
        totalMessageCount: 0
      };
      this.memoryStore.set(chatId, newData);
      await this.saveChatToStorage(chatId, newData);
      return newData;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Persist messages with deduplication and ordering
   */
  async persistMessages(chatId: string, messages: Message[], syncedWithServer: boolean = true): Promise<void> {
    try {
      const persistenceData = this.memoryStore.get(chatId) || await this.initializeChatPersistence(chatId);
      const now = Date.now();
      // Convert to persisted messages
      const newPersistedMessages: PersistedMessage[] = messages.map(msg => ({
        ...msg,
        chatId,
        persistedAt: now,
        syncedWithServer
      }));
      // Merge with existing messages (deduplication by ID)
      const existingMessageMap = new Map<string, PersistedMessage>();
      persistenceData.messages.forEach(msg => existingMessageMap.set(msg.id, msg));
      // Add new messages, updating existing ones
      newPersistedMessages.forEach(newMsg => {
        const existing = existingMessageMap.get(newMsg.id);
        if (existing) {
          // Update existing message with newer data
          existingMessageMap.set(newMsg.id, {
            ...existing,
            ...newMsg,
            syncedWithServer: syncedWithServer || existing.syncedWithServer,
            persistedAt: Math.max(existing.persistedAt, newMsg.persistedAt)
          });
        } else {
          // Add new message
          existingMessageMap.set(newMsg.id, newMsg);
        }
      });
      // Convert back to array and sort
      const allMessages = Array.from(existingMessageMap.values()).sort((a, b) => {
        // Sort by timestamp, then by ID for consistency
        const timestampA = new Date(a.timestamp).getTime();
        const timestampB = new Date(b.timestamp).getTime();
        if (timestampA !== timestampB) {
          return timestampA - timestampB;
        }
        return a.id.localeCompare(b.id);
      });
      // Update persistence data
      const updatedData: ChatPersistenceData = {
        ...persistenceData,
        messages: allMessages,
        lastSyncTimestamp: syncedWithServer ? now : persistenceData.lastSyncTimestamp,
        totalMessageCount: allMessages.length
      };
      // Update memory and storage
      this.memoryStore.set(chatId, updatedData);
      await this.saveChatToStorage(chatId, updatedData);
      // Also create backup
      await this.createBackup(chatId, updatedData);
      } catch (error) {
      throw error;
    }
  }
  /**
   * Get persisted messages for a chat
   */
  async getPersistedMessages(chatId: string): Promise<Message[]> {
    try {
      const persistenceData = this.memoryStore.get(chatId) || await this.initializeChatPersistence(chatId);
      // Convert back to regular messages
      const messages = persistenceData.messages.map(persistedMsg => {
        const { chatId: _, persistedAt, syncedWithServer, ...message } = persistedMsg;
        return message as Message;
      });
      return messages;
    } catch (error) {
      return [];
    }
  }
  /**
   * Add a single message to persistence
   */
  async addMessage(chatId: string, message: Message, syncedWithServer: boolean = false): Promise<void> {
    try {
      const persistenceData = this.memoryStore.get(chatId) || await this.initializeChatPersistence(chatId);
      const persistedMessage: PersistedMessage = {
        ...message,
        chatId,
        persistedAt: Date.now(),
        syncedWithServer
      };
      // Check if message already exists
      const existingIndex = persistenceData.messages.findIndex(msg => msg.id === message.id);
      if (existingIndex >= 0) {
        // Update existing message
        persistenceData.messages[existingIndex] = {
          ...persistenceData.messages[existingIndex],
          ...persistedMessage,
          syncedWithServer: syncedWithServer || persistenceData.messages[existingIndex].syncedWithServer
        };
      } else {
        // Add new message in correct position
        persistenceData.messages.push(persistedMessage);
        persistenceData.messages.sort((a, b) => {
          const timestampA = new Date(a.timestamp).getTime();
          const timestampB = new Date(b.timestamp).getTime();
          return timestampA - timestampB;
        });
      }
      persistenceData.totalMessageCount = persistenceData.messages.length;
      // Update storage
      this.memoryStore.set(chatId, persistenceData);
      await this.saveChatToStorage(chatId, persistenceData);
      } catch (error) {
      }
  }
  /**
   * Update message status in persistence
   */
  async updateMessageStatus(chatId: string, messageId: string, status: string): Promise<void> {
    try {
      const persistenceData = this.memoryStore.get(chatId);
      if (!persistenceData) return;
      const messageIndex = persistenceData.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex >= 0) {
        persistenceData.messages[messageIndex].status = status as any;
        // Update storage
        this.memoryStore.set(chatId, persistenceData);
        await this.saveChatToStorage(chatId, persistenceData);
        }
    } catch (error) {
      }
  }
  /**
   * Get unsynced messages (for retry logic)
   */
  async getUnsyncedMessages(chatId: string): Promise<Message[]> {
    try {
      const persistenceData = this.memoryStore.get(chatId) || await this.initializeChatPersistence(chatId);
      const unsyncedMessages = persistenceData.messages
        .filter(msg => !msg.syncedWithServer)
        .map(persistedMsg => {
          const { chatId: _, persistedAt, syncedWithServer, ...message } = persistedMsg;
          return message as Message;
        });
      return unsyncedMessages;
    } catch (error) {
      return [];
    }
  }
  /**
   * Mark messages as synced with server
   */
  async markMessagesSynced(chatId: string, messageIds: string[]): Promise<void> {
    try {
      const persistenceData = this.memoryStore.get(chatId);
      if (!persistenceData) return;
      let updated = false;
      persistenceData.messages.forEach(msg => {
        if (messageIds.includes(msg.id) && !msg.syncedWithServer) {
          msg.syncedWithServer = true;
          updated = true;
        }
      });
      if (updated) {
        persistenceData.lastSyncTimestamp = Date.now();
        this.memoryStore.set(chatId, persistenceData);
        await this.saveChatToStorage(chatId, persistenceData);
        }
    } catch (error) {
      }
  }
  /**
   * Get persistence statistics
   */
  async getPersistenceStats(): Promise<{ totalChats: number; totalMessages: number; unsyncedMessages: number }> {
    let totalMessages = 0;
    let unsyncedMessages = 0;
    this.memoryStore.forEach(data => {
      totalMessages += data.messages.length;
      unsyncedMessages += data.messages.filter(msg => !msg.syncedWithServer).length;
    });
    return {
      totalChats: this.memoryStore.size,
      totalMessages,
      unsyncedMessages
    };
  }
  /**
   * Private: Load chat data from storage
   */
  private async loadChatFromStorage(chatId: string): Promise<ChatPersistenceData | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${chatId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      // Try backup
      try {
        const backup = await AsyncStorage.getItem(`${this.BACKUP_KEY}_${chatId}`);
        if (backup) {
          return JSON.parse(backup);
        }
      } catch (backupError) {
        }
    }
    return null;
  }
  /**
   * Private: Save chat data to storage
   */
  private async saveChatToStorage(chatId: string, data: ChatPersistenceData): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_${chatId}`, JSON.stringify(data));
    } catch (error) {
      }
  }
  /**
   * Private: Create backup
   */
  private async createBackup(chatId: string, data: ChatPersistenceData): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.BACKUP_KEY}_${chatId}`, JSON.stringify(data));
    } catch (error) {
      }
  }
  /**
   * Clear persistence for a chat (use with caution)
   */
  async clearChatPersistence(chatId: string): Promise<void> {
    try {
      this.memoryStore.delete(chatId);
      await AsyncStorage.removeItem(`${this.STORAGE_KEY}_${chatId}`);
      await AsyncStorage.removeItem(`${this.BACKUP_KEY}_${chatId}`);
      } catch (error) {
      }
  }
}
// Export singleton instance
export const messagePersistence = new MessagePersistenceManager();
export type { PersistedMessage, ChatPersistenceData };
