// lib/shareService.ts - Professional Deep Linking Share Solution
import { Share as RNShare, Clipboard, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { BACKEND_URL } from './backendConfig';

export class ShareService {
  // Generate post share links (app + web fallback + Play Store)
  static generatePostShareLink(postId: string): { appLink: string; webLink: string; playStoreLink: string } {
    return {
      appLink: `boltnexeed://post/${postId}`,
      webLink: `${BACKEND_URL}/post/${postId}`, // Clickable HTTPS link that redirects to app
      playStoreLink: `https://play.google.com/store/apps/details?id=com.mycompany.nexeed1`
    };
  }

  // Professional share with app, web, and Play Store links
  static async sharePost(postId: string, username: string, content?: string): Promise<boolean> {
    try {
      const { appLink, playStoreLink } = this.generatePostShareLink(postId);
      
      let shareMessage = `🚀 Check out this post by @${username} on Nexeed!\n\n`;
      
      if (content) {
        const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
        shareMessage += `"${preview}"\n\n`;
      }
      
      // Use webLink (HTTPS) for clickability in WhatsApp, SMS, etc.
      shareMessage += `👉 Open post: ${webLink}\n\n`;
      shareMessage += `Download app: ${playStoreLink}`;

      // On Android, the 'url' parameter works better with share sheet
      const shareOptions: any = {
        message: shareMessage,
        title: 'Share Nexeed Post',
      };
      
      // Add URL for better compatibility
      if (Platform.OS === 'android') {
        shareOptions.url = appLink;
      }

      const result = await RNShare.share(shareOptions);

      if (result.action === RNShare.sharedAction) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Share error:', error);
      return false;
    }
  }

  // Copy post link - just copies app link
  static async copyPostLink(postId: string): Promise<boolean> {
    try {
      const { appLink } = this.generatePostShareLink(postId);
      await Clipboard.setString(appLink);
      return true;
    } catch (error) {
      console.error('Copy link error:', error);
      return false;
    }
  }

  // Quick share - single tap solution with improved message
  static async quickShare(postId: string, username: string, content?: string) {
    try {
      const { appLink, playStoreLink } = this.generatePostShareLink(postId);
      
      // Create an optimized share message for quick sharing
      let shareMessage = `🚀 Check out this post by @${username} on Nexeed!\n\n`;
      
      if (content) {
        const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
        shareMessage += `"${preview}"\n\n`;
      }
      
      // Simplified format with only clickable links
      shareMessage += `${appLink}\n\n`;
      shareMessage += `Download app: ${playStoreLink}`;

      const result = await RNShare.share({
        message: shareMessage,
        title: `Post by @${username}`,
        url: appLink
      });

      return result.action === RNShare.sharedAction;
    } catch (error) {
      console.error('Quick share error:', error);
      return false;
    }
  }

  // Simple copy function that just copies the app link
  static async copyAppLink(postId: string): Promise<boolean> {
    try {
      const { appLink } = this.generatePostShareLink(postId);
      await Clipboard.setString(appLink);
      return true;
    } catch (error) {
      console.error('Copy app link error:', error);
      return false;
    }
  }

  // Generate profile share links
  static generateProfileShareLink(userId: string): { appLink: string; webLink: string; playStoreLink: string } {
    return {
      appLink: `boltnexeed://profile/${userId}`,
      webLink: `${BACKEND_URL}/profile/${userId}`, // Clickable HTTPS link that redirects to app
      playStoreLink: `https://play.google.com/store/apps/details?id=com.mycompany.nexeed1`
    };
  }

  // Share profile with app, web, and Play Store links
  static async shareProfile(userId: string, username: string): Promise<boolean> {
    try {
      const { appLink, playStoreLink } = this.generateProfileShareLink(userId);
      
      let shareMessage = `Check out @${username}'s profile on Nexeed! 🚀\n\n`;
      shareMessage += `📱 Open in app:\n${appLink}\n\n`;
      shareMessage += `Download app:\n${playStoreLink}`;

      const result = await RNShare.share({
        message: shareMessage,
        title: 'Share Nexeed Profile',
        url: appLink
      });

      return result.action === RNShare.sharedAction;
    } catch (error) {
      console.error('Share profile error:', error);
      return false;
    }
  }

  // Test if deep link can be opened
  static async canOpenDeepLink(postId: string): Promise<boolean> {
    try {
      const { appLink } = this.generatePostShareLink(postId);
      return await Linking.canOpenURL(appLink);
    } catch (error) {
      console.error('Deep link test error:', error);
      return false;
    }
  }
}
