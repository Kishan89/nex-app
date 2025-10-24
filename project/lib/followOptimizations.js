// Ultra-Fast Follow Operations - Instant UI Updates
// Provides immediate visual feedback with background API sync

import { followSync } from '../store/followSync';
import { profileStore } from '../store/profileStore';
import { apiService } from './api';

class FollowOptimizations {
  constructor() {
    this.pendingOperations = new Map(); // Track pending API calls
    this.retryQueue = new Map(); // Queue for failed operations
    this.maxRetries = 3;
  }

  // 🚀 INSTANT FOLLOW: Update UI immediately, sync in background
  async instantFollow(userId, currentFollowState = false) {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required for follow operation');
    }

    const operationId = `follow-${userId}-${Date.now()}`;
    const newFollowState = !currentFollowState;

    try {
      // 1. 🚀 INSTANT UI UPDATE - Update immediately
      console.log(`⚡ Instant follow UI update: ${userId} -> ${newFollowState} (was: ${currentFollowState})`);
      
      // Check if operation is already pending
      const existingOperation = Array.from(this.pendingOperations.values())
        .find(op => op.userId === userId);
      
      if (existingOperation) {
        console.log(`⚠️ Follow operation already pending for user ${userId}, skipping`);
        return {
          success: false,
          error: 'Operation already in progress',
          isFollowing: currentFollowState
        };
      }
      
      // Update follow sync (notifies all components instantly)
      await followSync.updateFollowState(userId, newFollowState);
      
      // Update profile store cache
      await profileStore.updateFollowStatus(userId, newFollowState);

      // 2. 🔄 BACKGROUND API CALL - Don't wait for this
      this.pendingOperations.set(operationId, {
        userId,
        action: newFollowState ? 'follow' : 'unfollow',
        timestamp: Date.now(),
        retryCount: 0
      });

      // Start background sync (don't await)
      setTimeout(() => {
        this.syncFollowOperation(operationId, userId, newFollowState, currentFollowState);
      }, 100); // Small delay to ensure UI updates first

      // 3. ✅ RETURN SUCCESS IMMEDIATELY
      return {
        success: true,
        isFollowing: newFollowState,
        instant: true
      };

    } catch (error) {
      console.error('❌ Instant follow failed:', error);
      
      // Revert UI changes if instant update failed
      try {
        await followSync.updateFollowState(userId, currentFollowState);
        await profileStore.updateFollowStatus(userId, currentFollowState);
      } catch (revertError) {
        console.error('❌ Failed to revert UI changes:', revertError);
      }
      
      throw error;
    }
  }

  // 🔄 BACKGROUND SYNC: Handle API call in background
  async syncFollowOperation(operationId, userId, newFollowState, originalState) {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) {
      console.log(`⚠️ Operation ${operationId} not found in pending operations`);
      return;
    }

    try {
      console.log(`🔄 Background sync: ${operation.action} ${userId} (attempt ${operation.retryCount + 1})`);

      // Validate API service
      if (!apiService) {
        throw new Error('API service not available');
      }

      // Make API call with timeout
      const apiCall = newFollowState 
        ? apiService.followUser(userId)
        : apiService.unfollowUser(userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API call timeout')), 10000); // 10 second timeout
      });

      await Promise.race([apiCall, timeoutPromise]);

      // ✅ SUCCESS: Update counts in background
      setTimeout(() => {
        this.updateFollowCountsBackground(userId, newFollowState);
      }, 500);
      
      // Remove from pending operations
      this.pendingOperations.delete(operationId);
      
      console.log(`✅ Background sync completed: ${operation.action} ${userId}`);

    } catch (error) {
      console.error(`❌ Background sync failed: ${operation.action} ${userId}:`, error);
      
      // Handle failure with retry logic
      await this.handleSyncFailure(operationId, userId, originalState, error);
    }
  }

  // 🔄 HANDLE SYNC FAILURE: Retry or revert
  async handleSyncFailure(operationId, userId, originalState, error) {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) return;

    operation.retryCount++;

    if (operation.retryCount <= this.maxRetries) {
      // Retry after delay
      console.log(`🔄 Retrying ${operation.action} ${userId} (attempt ${operation.retryCount})`);
      
      setTimeout(() => {
        this.syncFollowOperation(operationId, userId, !originalState, originalState);
      }, 1000 * operation.retryCount); // Exponential backoff
      
    } else {
      // Max retries reached - revert UI
      console.log(`❌ Max retries reached for ${operation.action} ${userId}, reverting UI`);
      
      await followSync.updateFollowState(userId, originalState);
      await profileStore.updateFollowStatus(userId, originalState);
      
      // Add to retry queue for manual retry later
      this.retryQueue.set(userId, {
        action: operation.action,
        targetState: !originalState,
        originalState,
        error: error.message
      });
      
      this.pendingOperations.delete(operationId);
    }
  }

  // 🔄 UPDATE COUNTS IN BACKGROUND: Don't block UI
  async updateFollowCountsBackground(userId, isFollowing) {
    try {
      // Get updated counts from server
      const countsResponse = await apiService.getFollowCounts(userId);
      const countsData = countsResponse?.data || countsResponse;
      
      if (countsData && typeof countsData.followers === 'number') {
        // Update profile store with new counts
        await profileStore.updateFollowCounts(
          userId, 
          countsData.followers, 
          countsData.following
        );
        
        console.log(`📊 Updated follow counts for ${userId}: ${countsData.followers} followers`);
      }
    } catch (error) {
      console.error('❌ Failed to update follow counts:', error);
      // Don't throw - this is background operation
    }
  }

  // 🚀 BATCH FOLLOW OPERATIONS: Handle multiple follows efficiently
  async batchFollowOperations(operations) {
    const results = [];
    
    // Update all UI states instantly
    for (const { userId, currentState } of operations) {
      try {
        const result = await this.instantFollow(userId, currentState);
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // 🔄 RETRY FAILED OPERATIONS: Manual retry for failed syncs
  async retryFailedOperations() {
    const failedOperations = Array.from(this.retryQueue.entries());
    const results = [];
    
    for (const [userId, operation] of failedOperations) {
      try {
        console.log(`🔄 Retrying failed operation: ${operation.action} ${userId}`);
        
        const result = await this.instantFollow(userId, operation.originalState);
        if (result.success) {
          this.retryQueue.delete(userId);
          results.push({ userId, success: true, retried: true });
        }
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // 📊 GET OPERATION STATUS: Check pending/failed operations
  getOperationStatus() {
    return {
      pending: Array.from(this.pendingOperations.entries()).map(([id, op]) => ({
        operationId: id,
        userId: op.userId,
        action: op.action,
        retryCount: op.retryCount,
        age: Date.now() - op.timestamp
      })),
      failed: Array.from(this.retryQueue.entries()).map(([userId, op]) => ({
        userId,
        action: op.action,
        error: op.error
      }))
    };
  }

  // 🧹 CLEANUP: Clear old operations
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    // Clear old pending operations
    for (const [id, operation] of this.pendingOperations.entries()) {
      if (now - operation.timestamp > maxAge) {
        console.log(`🧹 Cleaning up old operation: ${id}`);
        this.pendingOperations.delete(id);
      }
    }
  }

  // 🚀 OPTIMISTIC FOLLOW TOGGLE: One-click instant toggle
  async optimisticFollowToggle(userId, currentState) {
    // This is the main method components should use
    console.log(`🚀 Optimistic follow toggle called: userId=${userId}, currentState=${currentState}`);
    
    // Validate inputs
    if (!userId) {
      console.error('❌ optimisticFollowToggle: userId is required');
      throw new Error('User ID is required');
    }
    
    if (typeof currentState !== 'boolean') {
      console.warn(`⚠️ optimisticFollowToggle: currentState should be boolean, got ${typeof currentState}: ${currentState}`);
      currentState = Boolean(currentState);
    }
    
    return this.instantFollow(userId, currentState);
  }

  // 🔍 DEBUG: Get current operation status for debugging
  debugStatus(userId = null) {
    const status = {
      timestamp: new Date().toISOString(),
      pendingOperations: Array.from(this.pendingOperations.entries()).map(([id, op]) => ({
        operationId: id,
        userId: op.userId,
        action: op.action,
        retryCount: op.retryCount,
        age: Date.now() - op.timestamp
      })),
      failedOperations: Array.from(this.retryQueue.entries()).map(([userId, op]) => ({
        userId,
        action: op.action,
        error: op.error
      })),
      memoryUsage: {
        pendingCount: this.pendingOperations.size,
        failedCount: this.retryQueue.size
      }
    };
    
    if (userId) {
      status.userSpecific = {
        userId,
        isPending: this.isSyncing(userId),
        followState: followSync.getFollowState(userId)
      };
    }
    
    console.log('🔍 Follow Optimizations Debug Status:', status);
    return status;
  }

  // 📱 SYNC STATUS: Check if operations are syncing
  isSyncing(userId) {
    for (const operation of this.pendingOperations.values()) {
      if (operation.userId === userId) {
        return true;
      }
    }
    return false;
  }

  // 🔄 FORCE SYNC: Force sync for a specific user
  async forceSync(userId) {
    try {
      // Get current state from follow sync
      const currentState = followSync.getFollowState(userId);
      if (currentState === null) return;

      // Get actual state from server
      const serverResponse = await apiService.checkFollowStatus(userId);
      const serverState = serverResponse?.data?.isFollowing ?? serverResponse?.isFollowing ?? false;

      // If states don't match, update local state
      if (currentState !== serverState) {
        console.log(`🔄 Force sync: ${userId} local:${currentState} server:${serverState}`);
        await followSync.updateFollowState(userId, serverState);
        await profileStore.updateFollowStatus(userId, serverState);
      }

      return { synced: true, state: serverState };
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return { synced: false, error: error.message };
    }
  }
}

// Export singleton instance
export const followOptimizations = new FollowOptimizations();

// Cleanup every 2 minutes
setInterval(() => {
  followOptimizations.cleanup();
}, 2 * 60 * 1000);

export default followOptimizations;
