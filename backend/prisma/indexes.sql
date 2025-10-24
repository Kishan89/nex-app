-- Database indexes for better performance
-- Run these commands in your database to optimize queries

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts("userId");
CREATE INDEX IF NOT EXISTS idx_posts_created_at_user_id ON posts("createdAt" DESC, "userId");

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments("postId");
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments("userId");
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON comments("postId", "createdAt" ASC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("read");
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications("type");
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications("userId", "read");
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_type ON notifications("userId", "type");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications("createdAt" DESC);

-- Chats table indexes
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats("updatedAt" DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages("chatId");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages("chatId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages("senderId");

-- Likes table indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes("postId");
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes("userId");
CREATE INDEX IF NOT EXISTS idx_likes_post_id_user_id ON likes("postId", "userId");

-- Bookmarks table indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks("postId");
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks("userId");
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id_user_id ON bookmarks("postId", "userId");

-- Follows table indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows("followerId");
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows("followingId");
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows("followerId", "followingId");

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users("username");
CREATE INDEX IF NOT EXISTS idx_users_email ON users("email");
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users("createdAt" DESC);

-- Polls table indexes
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls("postId");

-- Poll votes table indexes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON "PollVote"("pollId");
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON "PollVote"("userId");
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id_user_id ON "PollVote"("pollId", "userId");

-- Chat participants table indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON "chat_participants"("chatId");
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON "chat_participants"("userId");

-- Push tokens table indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON "push_tokens"("userId");
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON "push_tokens"("token");

-- FCM tokens table indexes
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON "fcm_tokens"("userId");
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON "fcm_tokens"("token");
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON "fcm_tokens"("isActive");

-- User blocks table indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON "user_blocks"("blockerId");
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON "user_blocks"("blockedId");
