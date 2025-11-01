import AsyncStorage from '@react-native-async-storage/async-storage';
interface PostInteraction {
  liked: boolean;
  bookmarked: boolean;
  timestamp: number;
}
interface InteractionCache {
  interactions: Map<string, PostInteraction>;
  pendingActions: Map<string, { liking?: boolean; bookmarking?: boolean }>;
}
class InteractionStoreManager {
  private cache: InteractionCache = {
    interactions: new Map(),
    pendingActions: new Map(),
  };
  private readonly STORAGE_PREFIX = '@user_post_interactions_';
  private saveTimeout: NodeJS.Timeout | null = null;
  // Get interaction state instantly from memory
  getInteraction(postId: string): PostInteraction | null {
    return this.cache.interactions.get(postId) || null;
  }
  // Set interaction state instantly in memory
  setInteraction(postId: string, interaction: Partial<PostInteraction>): void {
    const existing = this.cache.interactions.get(postId) || { liked: false, bookmarked: false, timestamp: 0 };
    const updated = {
      ...existing,
      ...interaction,
      timestamp: Date.now()
    };
    this.cache.interactions.set(postId, updated);
    // Debounced save to storage
    this.debouncedSave();
  }
  // Check if action is pending
  isPending(postId: string, action: 'liking' | 'bookmarking'): boolean {
    return Boolean(this.cache.pendingActions.get(postId)?.[action]);
  }
  // Set pending action with automatic timeout
  setPending(postId: string, action: 'liking' | 'bookmarking', pending: boolean, autoTimeout?: number): void {
    const existing = this.cache.pendingActions.get(postId) || {};
    if (pending) {
      this.cache.pendingActions.set(postId, { ...existing, [action]: true });
      // Auto-clear pending state after timeout (default 200ms)
      if (autoTimeout !== 0) {
        setTimeout(() => {
          this.setPending(postId, action, false, 0); // 0 prevents recursive timeout
        }, autoTimeout || 200);
      }
    } else {
      const updated = { ...existing };
      delete updated[action];
      if (Object.keys(updated).length === 0) {
        this.cache.pendingActions.delete(postId);
      } else {
        this.cache.pendingActions.set(postId, updated);
      }
    }
  }
  // Bulk set interactions (for initial load)
  setInteractions(interactions: Record<string, { liked: boolean; bookmarked: boolean }>): void {
    const timestamp = Date.now();
    Object.entries(interactions).forEach(([postId, interaction]) => {
      this.cache.interactions.set(postId, { ...interaction, timestamp });
    });
    this.debouncedSave();
  }
  // Get all interactions as object (for compatibility)
  getAllInteractions(): Record<string, { liked: boolean; bookmarked: boolean }> {
    const result: Record<string, { liked: boolean; bookmarked: boolean }> = {};
    this.cache.interactions.forEach((interaction, postId) => {
      result[postId] = {
        liked: interaction.liked,
        bookmarked: interaction.bookmarked
      };
    });
    return result;
  }
  // Load from storage on app start
  async loadFromStorage(userId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_PREFIX}${userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([postId, interaction]: [string, any]) => {
          this.cache.interactions.set(postId, {
            liked: interaction.liked || false,
            bookmarked: interaction.bookmarked || false,
            timestamp: interaction.timestamp || Date.now()
          });
        });
      }
    } catch (error) {
      }
  }
  // Debounced save to storage
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToStorage();
    }, 500); // Save after 500ms of no changes
  }
  // Save to storage
  private async saveToStorage(): Promise<void> {
    try {
      // We need userId for storage key, but we'll handle this in the context
      // For now, just prepare the data
      const data = this.getAllInteractions();
      // The actual saving will be handled by the context with proper userId
      return Promise.resolve();
    } catch (error) {
      }
  }
  // Force save to storage (with userId)
  async forceSave(userId: string): Promise<void> {
    try {
      const data = this.getAllInteractions();
      await AsyncStorage.setItem(`${this.STORAGE_PREFIX}${userId}`, JSON.stringify(data));
    } catch (error) {
      }
  }
  // Clear all interactions
  clear(): void {
    this.cache.interactions.clear();
    this.cache.pendingActions.clear();
  }
  // Get cache stats (for debugging)
  getStats(): { interactionCount: number; pendingCount: number } {
    return {
      interactionCount: this.cache.interactions.size,
      pendingCount: this.cache.pendingActions.size
    };
  }
}
// Export singleton instance
export const interactionStore = new InteractionStoreManager();
export type { PostInteraction };
