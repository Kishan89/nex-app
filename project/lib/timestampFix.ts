// lib/timestampFix.ts - Fix timestamp sorting issues
export class TimestampFix {
  // Convert any timestamp to milliseconds for proper comparison
  static toMilliseconds(timestamp: any): number {
    if (!timestamp) return 0;
    
    if (typeof timestamp === 'number') {
      // If it's already a number, assume it's milliseconds
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      // Try to parse as date
      const parsed = new Date(timestamp).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }
  
  // Sort messages chronologically (oldest first)
  static sortMessages(messages: any[]): any[] {
    return messages.sort((a, b) => {
      // Temp messages always go to end
      if (a.id?.startsWith('temp_') && !b.id?.startsWith('temp_')) return 1;
      if (!a.id?.startsWith('temp_') && b.id?.startsWith('temp_')) return -1;
      
      // Get timestamps in milliseconds
      const aTime = this.toMilliseconds(a.rawTimestamp || a.timestamp);
      const bTime = this.toMilliseconds(b.rawTimestamp || b.timestamp);
      
      return aTime - bTime;
    });
  }
  
  // Sort chats by most recent activity
  static sortChats(chats: any[]): any[] {
    return chats.sort((a, b) => {
      // 'now' messages always go to top
      if (a.time === 'now' && b.time !== 'now') return -1;
      if (a.time !== 'now' && b.time === 'now') return 1;
      
      // For other chats, maintain existing order or use updatedAt if available
      if (a.updatedAt && b.updatedAt) {
        const aTime = this.toMilliseconds(a.updatedAt);
        const bTime = this.toMilliseconds(b.updatedAt);
        return bTime - aTime; // Most recent first
      }
      
      return 0; // Maintain order
    });
  }
}