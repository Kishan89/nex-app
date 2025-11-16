// lib/clearAppData.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
/**
 * Clear all app data and cached content
 * This should be called when the database is reset to ensure the app reflects the empty state
 */
export const clearAllAppData = async (): Promise<void> => {
  try {
    // Get all keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    // Filter keys that contain app data (but keep auth tokens if needed)
    const dataKeys = keys.filter(key => 
      key.includes('post_interactions') ||
      key.includes('poll_votes') ||
      key.includes('comments_data') ||
      key.includes('cached_posts') ||
      key.includes('user_bookmarks') ||
      key.includes('user_likes') ||
      key.includes('app_cache')
    );
    // Remove all data keys
    if (dataKeys.length > 0) {
      await AsyncStorage.multiRemove(dataKeys);
      } else {
      }
    } catch (error) {
    throw error;
  }
};
/**
 * Clear specific user data (interactions, votes, etc.)
 */
export const clearUserData = async (userId: string): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter(key => key.includes(userId));
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      }
  } catch (error) {
    throw error;
  }
};
/**
 * Force refresh app state by clearing cache and reloading
 */
export const forceAppRefresh = async (): Promise<void> => {
  try {
    // Clear all cached data
    await clearAllAppData();
    // You can add additional refresh logic here
    // For example, triggering context refreshes, clearing state, etc.
    } catch (error) {
    throw error;
  }
};
