-- Add mentions column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';

-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MENTION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_INVITE';

-- Create index for faster mention queries
CREATE INDEX IF NOT EXISTS idx_messages_mentions ON messages USING GIN (mentions);
