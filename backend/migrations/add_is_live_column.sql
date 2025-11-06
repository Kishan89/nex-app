-- Add isLive column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on live posts
CREATE INDEX IF NOT EXISTS idx_posts_is_live ON posts("isLive") WHERE "isLive" = true;
