// lib/shareServiceQuick.ts - Quick workaround for post sharing
import { Share as RNShare, Clipboard, Platform, Alert } from 'react-native';

/**
 * Quick workaround for sharing until we set up proper web links
 * This gives users multiple options to share the post
 */
export class QuickShareService {
  
  // Generate simple share links
  static generatePostShareLink(postId: string) {
    return {
      appLink: `boltnexeed://post/${postId}`,
      playStoreLink: `https://play.google.com/store/apps/details?id=com.mycompany.nexeed1`,
      postId: postId
    };
  }

  /**
   * Show share options with copy functionality
   * This is the BEST workaround until we have clickable HTTPS links
   */
  static async sharePostWithOptions(postId: string, username: string, content?: string) {
    const { appLink, playStoreLink } = this.generatePostShareLink(postId);
    
    Alert.alert(
      '📤 Share Post',
      'Choose how to share:',
      [
        {
          text: '📱 Share to Apps',
          onPress: () => this.shareSimple(postId, username, content)
        },
        {
          text: '📋 Copy Link',
          onPress: async () => {
            await Clipboard.setString(appLink);
            Alert.alert('✅ Copied!', 'Link copied to clipboard. Paste it anywhere to share!');
          }
        },
        {
          text: '📲 Share Play Store',
          onPress: async () => {
            await RNShare.share({
              message: `Download Nexeed app to see amazing posts! ${playStoreLink}`,
              title: 'Download Nexeed'
            });
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * Simple share with clear instructions
   */
  static async shareSimple(postId: string, username: string, content?: string) {
    const { appLink, playStoreLink } = this.generatePostShareLink(postId);
    
    let message = `🚀 Check out this post by @${username} on Nexeed!\n\n`;
    
    if (content) {
      const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
      message += `"${preview}"\n\n`;
    }
    
    message += `Post ID: ${postId}\n\n`;
    message += `To open in Nexeed app:\n`;
    message += `1. Copy this: ${appLink}\n`;
    message += `2. Paste in your browser\n\n`;
    message += `Or download the app:\n${playStoreLink}`;

    try {
      await RNShare.share({
        message: message,
        title: 'Share Nexeed Post'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }

  /**
   * Direct copy to clipboard
   */
  static async copyLink(postId: string) {
    const { appLink } = this.generatePostShareLink(postId);
    await Clipboard.setString(appLink);
  }
}
