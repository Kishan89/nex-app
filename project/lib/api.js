// API configuration and service functions
import { Platform } from 'react-native';
import Constants from 'expo-constants';
// Configuration for different development environments
const API_CONFIG = {
  // For iOS Simulator and Expo web
  ios_simulator: 'http://localhost:3000/api',
  // For Android Emulator
  android_emulator: 'http://10.0.2.2:3000/api',
  // For physical devices - Your computer's IP address
  physical_device: 'http://10.120.150.74:3001/api', 
  // For Expo development with tunneling
  expo_tunnel: 'http://localhost:3000/api', 
};
const getApiBaseUrl = () => {
  // Use deployed backend URL
  // Use Render deployed backend for all platforms
  const deployedUrl = 'https://nexeed-t2wb.onrender.com/api';
  return deployedUrl;
};
// Re-enable network detection for real API calls
const API_BASE_URL = getApiBaseUrl();
const HEALTH_URL = API_BASE_URL.replace(/\/api$/, '') + '/health';
// Log the URL being used for debugging
// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 10000, // 10 second timeout
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
// Simple API service functions
export const apiService = {
  // Posts
  async getPosts() {
    return apiRequest('/posts');
  },
  async getPostComments(postId) {
    return apiRequest(`/posts/${postId}/comments`);
  },
  // Chats
  async getUserChats(userId) {
    return apiRequest(`/chats/${userId}`);
  },
  async getChatMessages(chatId, userId) {
    return apiRequest(`/chats/${chatId}/messages?userId=${userId}`);
  },
  // Notifications
  async getUserNotifications(userId) {
    return apiRequest(`/notifications/${userId}`);
  },
  // Health check
  async healthCheck() {
    try {
      const response = await fetch(HEALTH_URL);
      const result = await response.json();
      return result;
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  },
};
// Constants for demo user ID (replace with actual auth later)
// Using the "you" user from our seeded data - this would come from authentication in a real app
export const CURRENT_USER_ID = 'cme5uekoq0001blgsrsw8x3ve';
export default apiService;