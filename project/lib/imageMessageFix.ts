// Image Message Fix Utility
// This utility helps prevent image messages from disappearing in chat

export interface ImageMessageValidation {
  isValid: boolean;
  url: string | null;
  error?: string;
}

export class ImageMessageFixer {
  
  // Validate image URL to ensure it's not empty or invalid
  static validateImageUrl(imageUrl: any): ImageMessageValidation {
    // Check if imageUrl exists and is a string
    if (!imageUrl || typeof imageUrl !== 'string') {
      return {
        isValid: false,
        url: null,
        error: 'Image URL is missing or not a string'
      };
    }

    // Trim whitespace
    const trimmedUrl = imageUrl.trim();
    
    // Check if empty after trimming
    if (trimmedUrl === '') {
      return {
        isValid: false,
        url: null,
        error: 'Image URL is empty'
      };
    }

    // Check for invalid values
    if (trimmedUrl === 'undefined' || trimmedUrl === 'null' || trimmedUrl === 'false') {
      return {
        isValid: false,
        url: null,
        error: 'Image URL contains invalid value'
      };
    }

    // Check if it looks like a valid URL (basic check)
    if (!trimmedUrl.startsWith('http') && !trimmedUrl.startsWith('file://')) {
      return {
        isValid: false,
        url: null,
        error: 'Image URL does not appear to be valid'
      };
    }

    return {
      isValid: true,
      url: trimmedUrl,
      error: undefined
    };
  }

  // Fix message object to ensure image URL is properly handled
  static fixMessageImageUrl(message: any): any {
    if (!message) return message;

    const validation = this.validateImageUrl(message.imageUrl);
    
    return {
      ...message,
      imageUrl: validation.isValid ? validation.url : undefined
    };
  }

  // Fix array of messages
  static fixMessagesImageUrls(messages: any[]): any[] {
    if (!Array.isArray(messages)) return messages;
    
    return messages.map(message => this.fixMessageImageUrl(message));
  }

  // Check if message should show image
  static shouldShowImage(message: any): boolean {
    const validation = this.validateImageUrl(message?.imageUrl);
    return validation.isValid;
  }

  // Get safe image URL for display
  static getSafeImageUrl(message: any): string | null {
    const validation = this.validateImageUrl(message?.imageUrl);
    return validation.isValid ? validation.url : null;
  }

  // Log image validation issues for debugging
  static logImageIssue(message: any, context: string = 'unknown'): void {
    const validation = this.validateImageUrl(message?.imageUrl);
    if (!validation.isValid) {
      console.log(`🔍 [IMAGE FIX] ${context}:`, {
        messageId: message?.id,
        originalImageUrl: message?.imageUrl,
        error: validation.error,
        messageStatus: message?.status,
        isUser: message?.isUser
      });
    }
  }
}