-- Add imageUrl column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Add index for faster image message queries
CREATE INDEX IF NOT EXISTS idx_messages_imageurl ON messages("imageUrl") WHERE "imageUrl" IS NOT NULL;
