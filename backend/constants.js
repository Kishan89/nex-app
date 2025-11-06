/**
 * Application Constants
 * Centralized constants for HTTP status codes, error messages, pagination, etc.
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  
  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  
  // Post
  POST_NOT_FOUND: 'Post not found',
  POST_CREATION_FAILED: 'Failed to create post',
  
  // Comment
  COMMENT_NOT_FOUND: 'Comment not found',
  COMMENT_CREATION_FAILED: 'Failed to create comment',
  
  // Like
  ALREADY_LIKED: 'Already liked',
  NOT_LIKED: 'Not liked yet',
  
  // Follow
  ALREADY_FOLLOWING: 'Already following',
  NOT_FOLLOWING: 'Not following',
  CANNOT_FOLLOW_SELF: 'Cannot follow yourself',
  
  // Bookmark
  ALREADY_BOOKMARKED: 'Already bookmarked',
  NOT_BOOKMARKED: 'Not bookmarked',
  
  // Chat
  CHAT_NOT_FOUND: 'Chat not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  CANNOT_MESSAGE_SELF: 'Cannot message yourself',
  
  // General
  INVALID_INPUT: 'Invalid input',
  DATABASE_ERROR: 'Database error',
  SERVER_ERROR: 'Internal server error',
};

// Success Messages
const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',
  
  // Post
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  
  // Comment
  COMMENT_CREATED: 'Comment created successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  
  // Like
  POST_LIKED: 'Post liked',
  POST_UNLIKED: 'Post unliked',
  
  // Follow
  USER_FOLLOWED: 'User followed',
  USER_UNFOLLOWED: 'User unfollowed',
  
  // Bookmark
  POST_BOOKMARKED: 'Post bookmarked',
  POST_UNBOOKMARKED: 'Post unbookmarked',
  
  // Chat
  MESSAGE_SENT: 'Message sent',
  MESSAGE_DELETED: 'Message deleted',
};

// Pagination (Optimized for smooth scrolling)
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 15,        // Reduced for faster initial load
  MAX_LIMIT: 50,            // Reduced max for performance
  POSTS_PER_PAGE: 15,       // Smooth scroll experience
  COMMENTS_PER_PAGE: 20,
  MESSAGES_PER_PAGE: 30,    // Reduced for faster chat load
};

// Cache TTL (Time To Live) in seconds
const CACHE = {
  USER_PROFILE: 300, // 5 minutes
  POST_FEED: 60, // 1 minute
  TRENDING: 600, // 10 minutes
};

// Message Status (must match Prisma enum exactly)
const MESSAGE_STATUS = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
};

// Notification Types
const NOTIFICATION = {
  TYPES: {
    LIKE: 'like',
    COMMENT: 'comment',
    FOLLOW: 'follow',
    MENTION: 'mention',
    MESSAGE: 'message',
  },
  PRIORITY: {
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
  },
};

// XP (Experience Points) Rewards
const XP_REWARDS = {
  POST_CREATED: 10,
  COMMENT_CREATED: 5,
  POST_LIKED: 2,
  COMMENT_LIKED: 1,
  DAILY_LOGIN: 5,
};

// User Levels
const USER_LEVELS = {
  1: { name: 'Beginner', minXp: 0 },
  2: { name: 'Novice', minXp: 100 },
  3: { name: 'Intermediate', minXp: 500 },
  4: { name: 'Advanced', minXp: 1000 },
  5: { name: 'Expert', minXp: 5000 },
  6: { name: 'Master', minXp: 10000 },
};

module.exports = {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
  CACHE,
  MESSAGE_STATUS,
  NOTIFICATION,
  XP_REWARDS,
  USER_LEVELS,
};
