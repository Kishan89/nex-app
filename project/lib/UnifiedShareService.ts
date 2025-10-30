// lib/UnifiedShareService.ts - Complete Post Sharing Solution
import { Share, Alert, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SHARE_BASE_URL } from './backendConfig';

/**
 * Unified Share Service - Complete post sharing with deep linking
 * Features:
 * - Clickable HTTPS links that work in WhatsApp, SMS, Telegram, etc.
 * - Automatic app redirect via deep linking
 * - Fallback to Play Store if app not installed
 * - Clean, professional share messages
 */
export class UnifiedShareService {
  
  /**
   * Generate all share links for a post
   */
  private static generatePostLinks(postId: string) {
    return {
      // HTTPS link - clickable in all apps, triggers deep linking
      webLink: `${SHARE_BASE_URL}/post/${postId}`,
      // Direct app scheme for native sharing
      appLink: `boltnexeed://post/${postId}`,
      // Play Store link
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1'
    };
  }

  /**
   * Share a post with clickable links
   */
  static async sharePost(postId: string, username: string, content?: string): Promise<boolean> {
    try {
      const { webLink, playStoreLink } = this.generatePostLinks(postId);
      
      // Build clean share message
      let message = `🚀 Check out this post by @${username} on Nexeed!\n\n`;
      
      // Add content preview if available
      if (content && content.trim()) {
        const maxLen = 100;
        const preview = content.length > maxLen ? content.substring(0, maxLen) + '...' : content;
        message += `"${preview}"\n\n`;
      }
      
      // Add clickable HTTPS link (works in all messaging apps)
      message += `${webLink}\n\n`;
      
      // Add download link
      message += `📲 Download Nexeed: ${playStoreLink}`;
      
      // Share with both message and URL for best compatibility
      const result = await Share.share(
        {
          message: message,
          title: `Post by @${username}`,
          url: Platform.OS === 'ios' ? webLink : undefined, // iOS uses url param
        },
        {
          dialogTitle: 'Share Post'
        }
      );
      
      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
      return false;
    }
  }

  /**
   * Copy post link to clipboard
   */
  static async copyPostLink(postId: string): Promise<boolean> {
    try {
      const { webLink } = this.generatePostLinks(postId);
      await Clipboard.setString(webLink);
      Alert.alert('Link Copied', 'Post link copied to clipboard successfully');
      return true;
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy link');
      return false;
    }
  }

  /**
   * Show share options dialog - Beautiful and simple
   */
  static showShareOptions(postId: string, username: string, content?: string) {
    Alert.alert(
      'Share Post',
      'Choose how you want to share this post',
      [
        {
          text: 'Share to Apps',
          onPress: () => this.sharePost(postId, username, content),
          style: 'default'
        },
        {
          text: 'Copy Link',
          onPress: () => this.copyPostLink(postId),
          style: 'default'
        }
      ],
      { 
        cancelable: true,
        userInterfaceStyle: 'light'
      }
    );
  }

  /**
   * Quick share - one-tap sharing
   */
  static async quickShare(postId: string, username: string, content?: string): Promise<boolean> {
    return this.sharePost(postId, username, content);
  }

  /**
   * Share profile
   */
  static async shareProfile(userId: string, username: string): Promise<boolean> {
    try {
      const webLink = `${SHARE_BASE_URL}/profile/${userId}`;
      const playStoreLink = 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1';
      
      const message = `Check out @${username}'s profile on Nexeed! 🚀\n\n${webLink}\n\n📲 Download: ${playStoreLink}`;
      
      const result = await Share.share(
        {
          message: message,
          title: `${username}'s Profile`,
          url: Platform.OS === 'ios' ? webLink : undefined,
        },
        {
          dialogTitle: 'Share Profile'
        }
      );
      
      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Share profile error:', error);
      Alert.alert('Error', 'Failed to share profile');
      return false;
    }
  }

  /**
   * Copy profile link
   */
  static async copyProfileLink(userId: string): Promise<boolean> {
    try {
      const webLink = `${SHARE_BASE_URL}/profile/${userId}`;
      await Clipboard.setString(webLink);
      Alert.alert('Link Copied', 'Profile link copied to clipboard successfully');
      return true;
    } catch (error) {
      console.error('Copy profile link error:', error);
      Alert.alert('Error', 'Failed to copy link');
      return false;
    }
  }

  /**
   * Get shareable link (without sharing)
   */
  static getPostLink(postId: string): string {
    return `${SHARE_BASE_URL}/post/${postId}`;
  }

  /**
   * Get profile link (without sharing)
   */
  static getProfileLink(userId: string): string {
    return `${SHARE_BASE_URL}/profile/${userId}`;
  }
}

// Export singleton methods for convenience
export const sharePost = UnifiedShareService.sharePost.bind(UnifiedShareService);
export const shareProfile = UnifiedShareService.shareProfile.bind(UnifiedShareService);
export const copyPostLink = UnifiedShareService.copyPostLink.bind(UnifiedShareService);
export const copyProfileLink = UnifiedShareService.copyProfileLink.bind(UnifiedShareService);
export const showShareOptions = UnifiedShareService.showShareOptions.bind(UnifiedShareService);
