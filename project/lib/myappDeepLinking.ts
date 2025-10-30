// lib/myappDeepLinking.ts
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Simplified deep linking service for myapp:// scheme only
 * Handles: myapp://post/<postId>
 */
export class MyAppDeepLinkingService {
  private static instance: MyAppDeepLinkingService;
  private subscription: any;
  private isInitialized = false;
  private pendingNavigation: string | null = null;

  static getInstance(): MyAppDeepLinkingService {
    if (!MyAppDeepLinkingService.instance) {
      MyAppDeepLinkingService.instance = new MyAppDeepLinkingService();
    }
    return MyAppDeepLinkingService.instance;
  }

  /**
   * Initialize deep linking listeners for both cold and warm starts
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      // Handle initial URL (cold start - app was closed)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        // Reduced delay to minimize intermediate screen showing
        setTimeout(() => {
          this.handleDeepLink(initialUrl);
        }, 800); // Reduced delay for faster navigation
      } else {
      }
      // Handle URL changes (warm start - app was in background)
      this.subscription = Linking.addEventListener('url', (event) => {
        // Immediate handling for warm start to avoid screen flashing
        this.handleDeepLink(event.url);
      });
      this.isInitialized = true;
      return () => this.cleanup();
    } catch (error) {
      this.isInitialized = false;
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    // Clear any pending navigation
    this.pendingNavigation = null;
    this.isInitialized = false;
  }

  /**
   * Clear any pending navigation (useful for debugging)
   */
  public clearPendingNavigation() {
    this.pendingNavigation = null;
  }

  /**
   * Handle incoming deep links
   */
  private handleDeepLink(url: string): boolean {
    try {
      const parsed = Linking.parse(url);
      const { path } = parsed;
      // Handle boltnexeed:// scheme
      if (parsed.scheme === 'boltnexeed') {
        // Handle boltnexeed://post/123
        if (path && path.startsWith('post/')) {
          const postId = path.replace('post/', '').split('?')[0];
          if (postId && postId.trim()) {
            this.navigateToPost(postId);
            return true;
          }
        }
        // Handle boltnexeed://profile/123
        if (path && path.startsWith('profile/')) {
          const userId = path.replace('profile/', '').split('?')[0];
          if (userId && userId.trim()) {
            this.navigateToProfile(userId);
            return true;
          }
        }
      }
      // Handle HTTPS scheme for web fallback
      if (parsed.scheme === 'https' && (
        parsed.hostname === 'nex-app-production.up.railway.app' ||
        parsed.hostname === 'nexeed.app' ||
        parsed.hostname === 'mynexeedapp.com' ||
        parsed.hostname === 'nexeed-app.vercel.app'
      )) {
        // Handle https://nex-app-production.up.railway.app/post/123
        if (path && path.startsWith('/post/')) {
          const postId = path.replace('/post/', '').split('?')[0];
          if (postId && postId.trim()) {
            this.navigateToPost(postId);
            return true;
          }
        }
        // Handle https://nex-app-production.up.railway.app/profile/123
        if (path && path.startsWith('/profile/')) {
          const userId = path.replace('/profile/', '').split('?')[0];
          if (userId && userId.trim()) {
            this.navigateToProfile(userId);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Navigate to post detail screen
   */
  private navigateToPost(postId: string) {
    const targetRoute = `/post/${postId}`;
    // Store pending navigation in case we need to retry after auth
    this.pendingNavigation = targetRoute;
    // Function to attempt navigation - ONLY navigate, don't do anything else
    const attemptNavigation = () => {
      try {
        // Use replace instead of push to avoid navigation stack issues
        router.replace(targetRoute);
        this.pendingNavigation = null; // Clear pending navigation on success
        return true;
      } catch (navError) {
        return false;
      }
    };
    // Try immediate navigation
    if (attemptNavigation()) {
      return;
    }
    // If immediate navigation fails, wait for auth to complete
    // Don't retry automatically - let the auth system handle it
  }

  /**
   * Execute pending navigation (call this after user authentication is complete)
   */
  public executePendingNavigation() {
    if (this.pendingNavigation) {
      try {
        // Ensure we're using the correct route format
        const route = this.pendingNavigation;
        // Clear pending navigation first to prevent loops
        this.pendingNavigation = null;
        // Navigate to the route using replace to avoid stack issues
        router.replace(route);
      } catch (error) {
        // Clear pending navigation even on error
        this.pendingNavigation = null;
      }
    } else {
    }
  }

  /**
   * Navigate to profile screen
   */
  private navigateToProfile(userId: string) {
    try {
      setTimeout(() => {
        router.push(`/profile/${userId}`);
      }, 500);
    } catch (error) {
    }
  }

  /**
   * Generate a boltnexeed:// deep link for a post
   */
  static generatePostLink(postId: string): string {
    return `boltnexeed://post/${postId}`;
  }

  /**
   * Generate a boltnexeed:// deep link for a profile
   */
  static generateProfileLink(userId: string): string {
    return `boltnexeed://profile/${userId}`;
  }

  /**
   * Test if the app can handle myapp:// links
   */
  static async canHandleMyAppLinks(): Promise<boolean> {
    try {
      const testUrl = 'boltnexeed://test';
      const canOpen = await Linking.canOpenURL(testUrl);
      return canOpen;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test deep linking functionality
   */
  static async testDeepLinking(): Promise<void> {
    try {
      // Test if the scheme is supported
      const canHandle = await this.canHandleMyAppLinks();
      if (!canHandle) {
        Alert.alert(
          'Deep Linking Issue',
          'The boltnexeed:// scheme is not properly configured. Please check app.json and rebuild the app.'
        );
        return;
      }
      // Test URL parsing
      const testUrl = 'boltnexeed://post/123';
      const parsed = Linking.parse(testUrl);
      Alert.alert(
        'Deep Linking Test',
        `URL: ${testUrl}\nParsed: ${JSON.stringify(parsed, null, 2)}\n\nThis should work if properly configured.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to test deep linking: ${error.message}`);
    }
  }
}

// Export singleton instance
export const myAppDeepLinkingService = MyAppDeepLinkingService.getInstance();