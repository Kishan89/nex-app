/**
 * Application Constants
 * Centralized location for all magic numbers, strings, and configuration values
 */

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Cache Configuration
  CACHE: {
    CHATS_MAX_AGE: 30, // seconds
    MESSAGES_MAX_AGE: 10, // seconds
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
  },

  // Message Status
  MESSAGE_STATUS: {
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
  },

  // Notification Retry Configuration
  NOTIFICATION: {
    RETRY_DELAY_MS: 2000,
    MAX_RETRIES: 3,
  },

  // Database Configuration
  DATABASE: {
    CONNECTION_TIMEOUT_MS: 5000,
    RETRY_ATTEMPTS: 3,
  },

  // Server Configuration
  SERVER: {
    DEFAULT_PORT: 3000,
    DEFAULT_HOST: '0.0.0.0',
    REQUEST_SIZE_LIMIT: '10mb',
  },

  // Error Messages
  ERROR_MESSAGES: {
    USER_ID_REQUIRED: 'User ID is required',
    CONTENT_REQUIRED: 'Content and senderId are required',
    CHAT_ID_REQUIRED: 'Chat ID is required',
    AUTH_REQUIRED: 'Authentication required',
    NOT_PARTICIPANT: 'You are not a participant in this chat',
    PARTICIPANTS_REQUIRED: 'At least 2 participants are required',
    CHAT_NOT_FOUND: 'Chat not found or user is not a participant',
    UNAUTHORIZED: 'Unauthorized',
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    MESSAGES_MARKED_READ: 'Messages marked as read',
    UNREAD_MESSAGES_RETRIEVED: 'Unread messages retrieved',
    CHAT_CREATED: 'Chat created successfully',
    CHAT_DELETED: 'Chat deleted successfully',
    CHAT_MARKED_READ: 'Chat marked as read',
  },
};
