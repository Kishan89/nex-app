// User types
export interface User {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  verified?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
}
// Post types
export interface Post {
  id: string;
  username: string;
  avatar: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: string;
  reposts: number;
  time: string;
  user?: User;
  bookmarked?: boolean;
  liked?: boolean;
}
export type RawPost = Record<string, any>;
export interface CreatePostData {
  content: string;
  imageUrl?: string;
  userId: string;
}
// Comment types
export interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
  user?: User;
  userId?: string; // Added for delete functionality
  isAnonymous?: boolean;
  replies?: Comment[];
  parentId?: string;
  replyTo?: string; // Username being replied to
  isOptimistic?: boolean; // Flag for optimistic updates
  createdAt?: string; // ISO date string for sorting
  likesCount?: number;
  isLiked?: boolean;
}
// Corrected: Moved RawComment to its proper section
export type RawComment = Record<string, any>;
export interface CreateCommentData {
  text: string;
  postId: string;
  userId: string;
}
// Chat and Message types
export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  isOnline?: boolean;
  unread?: number;
}
export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  rawTimestamp?: number; // Raw timestamp for sorting
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  sender?: User;
  imageUrl?: string; // Support for image messages
}
export interface CreateMessageData {
  content: string;
  chatId: string;
  senderId: string;
}
// Notification types
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  user: string;
  action: string;
  time: string;
  read?: boolean;
}
// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: number;
}
// Component Props types
export interface PostInteractions {
  [key: string]: {
    liked: boolean;
    bookmarked: boolean;
    commented: boolean;
  };
}
export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatar: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}
export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  pushNotifications: boolean;
}
// Poll types
export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
  _count?: { votes: number };
}
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}
export interface NormalizedPost {
  id: string;
  avatar: string;
  username: string;
  createdAt: string;
  content: string;
  userId: string;
  image: string | null;
  likes: number;
  comments: number;
  bookmarks: number;
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  isPinned?: boolean;
  isLive?: boolean;
  isAnonymous?: boolean;
  // Poll data
  poll?: Poll | null;
  // Poll voting state
  hasVotedOnPoll?: boolean;
  userPollVote?: string;
  // Additional fields for enhanced functionality
  likesCount?: number;
  commentsCount?: number;
  bookmarksCount?: number;
  // YouTube integration fields
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeAuthor?: string;
  youtubeThumbnail?: string;
  youtubeUrl?: string;
  youtubeDuration?: string;
}
import { NavigatorScreenParams } from '@react-navigation/native';
export type RootStackParamList = {
  login: undefined;
};
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}