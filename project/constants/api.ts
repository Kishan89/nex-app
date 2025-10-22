// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://nexeed-t2wb.onrender.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
// API Endpoints
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/api/health',
  // Posts
  POSTS: '/api/posts',
  POST_BY_ID: (id: string) => `/api/posts/${id}`,
  POST_LIKE: (id: string) => `/api/posts/${id}/like`,
  POST_BOOKMARK: (id: string) => `/api/posts/${id}/bookmark`,
  // Comments
  POST_COMMENTS: (postId: string) => `/api/posts/${postId}/comments`,
  COMMENT_BY_ID: (id: string) => `/api/comments/${id}`,
  // Chats
  CHATS: '/api/chats',
  USER_CHATS: (userId: string) => `/api/chats/user/${userId}`,
  CHAT_MESSAGES: (chatId: string) => `/api/chats/${chatId}/messages`,
  SEND_MESSAGE: (chatId: string) => `/api/chats/${chatId}/messages`,
  // Notifications
  USER_NOTIFICATIONS: (userId: string) => `/api/notifications/${userId}`,
  // Users (future)
  USERS: '/api/users',
  USER_BY_ID: (id: string) => `/api/users/${id}`,
  USER_PROFILE: (id: string) => `/api/users/${id}/profile`,
  USER_FOLLOW: (id: string) => `/api/users/${id}/follow`,
  // Auth (future)
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
};
// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
// API Error Messages
export const API_ERRORS = {
  NETWORK_ERROR: 'Network connection failed',
  TIMEOUT_ERROR: 'Request timeout',
  SERVER_ERROR: 'Server error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
  VALIDATION_ERROR: 'Invalid data provided',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
} as const;