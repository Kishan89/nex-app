const axios = require('axios');

class OneSignalService {
  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;
    this.baseUrl = 'https://onesignal.com/api/v1';
  }

  /**
   * Send notification to all users (broadcast)
   * @param {Object} notification - Notification data
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {Object} notification.data - Additional data to send with notification
   * @param {string} notification.imageUrl - Optional image URL
   * @param {string} notification.url - Optional URL to open when clicked
   */
  async sendBroadcastNotification({ title, message, data = {}, imageUrl, url }) {
    try {
      if (!this.appId || !this.apiKey) {
        throw new Error('OneSignal credentials not configured. Please set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in environment variables.');
      }

      const payload = {
        app_id: this.appId,
        // Send to all subscribed users
        included_segments: ['All'],
        // Notification content
        headings: { en: title },
        contents: { en: message },
        // Additional data
        data: data,
      };

      // Add optional image
      if (imageUrl) {
        payload.big_picture = imageUrl;
        payload.ios_attachments = { id: imageUrl };
      }

      // Add optional URL
      if (url) {
        payload.url = url;
      }

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      console.log('Broadcast notification sent successfully:', response.data);
      return {
        success: true,
        notificationId: response.data.id,
        recipients: response.data.recipients,
      };
    } catch (error) {
      console.error('Error sending broadcast notification:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send notification to specific users by external user IDs
   * @param {Array<string>} userIds - Array of external user IDs
   * @param {Object} notification - Notification data
   */
  async sendToSpecificUsers(userIds, { title, message, data = {}, imageUrl, url }) {
    try {
      if (!this.appId || !this.apiKey) {
        throw new Error('OneSignal credentials not configured');
      }

      const payload = {
        app_id: this.appId,
        // Target specific users by external user IDs
        include_external_user_ids: userIds,
        // Notification content
        headings: { en: title },
        contents: { en: message },
        // Additional data
        data: data,
      };

      // Add optional image
      if (imageUrl) {
        payload.big_picture = imageUrl;
        payload.ios_attachments = { id: imageUrl };
      }

      // Add optional URL
      if (url) {
        payload.url = url;
      }

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      console.log('Notification sent to specific users:', response.data);
      return {
        success: true,
        notificationId: response.data.id,
        recipients: response.data.recipients,
      };
    } catch (error) {
      console.error('Error sending notification to specific users:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send notification to users with specific tags
   * @param {Array<Object>} filters - Array of tag filters
   * @param {Object} notification - Notification data
   * 
   * Example filters:
   * [
   *   { field: "tag", key: "platform", relation: "=", value: "android" },
   *   { operator: "OR" },
   *   { field: "tag", key: "platform", relation: "=", value: "ios" }
   * ]
   */
  async sendToSegment(filters, { title, message, data = {}, imageUrl, url }) {
    try {
      if (!this.appId || !this.apiKey) {
        throw new Error('OneSignal credentials not configured');
      }

      const payload = {
        app_id: this.appId,
        // Target users by filters
        filters: filters,
        // Notification content
        headings: { en: title },
        contents: { en: message },
        // Additional data
        data: data,
      };

      // Add optional image
      if (imageUrl) {
        payload.big_picture = imageUrl;
        payload.ios_attachments = { id: imageUrl };
      }

      // Add optional URL
      if (url) {
        payload.url = url;
      }

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      console.log('Notification sent to segment:', response.data);
      return {
        success: true,
        notificationId: response.data.id,
        recipients: response.data.recipients,
      };
    } catch (error) {
      console.error('Error sending notification to segment:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - The notification ID to cancel
   */
  async cancelNotification(notificationId) {
    try {
      if (!this.appId || !this.apiKey) {
        throw new Error('OneSignal credentials not configured');
      }

      const response = await axios.delete(
        `${this.baseUrl}/notifications/${notificationId}?app_id=${this.appId}`,
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      console.log('Notification cancelled:', response.data);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling notification:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * View notification details
   * @param {string} notificationId - The notification ID
   */
  async getNotificationDetails(notificationId) {
    try {
      if (!this.appId || !this.apiKey) {
        throw new Error('OneSignal credentials not configured');
      }

      const response = await axios.get(
        `${this.baseUrl}/notifications/${notificationId}?app_id=${this.appId}`,
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting notification details:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new OneSignalService();
