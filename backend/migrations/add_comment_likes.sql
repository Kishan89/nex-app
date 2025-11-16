-- Add likesCount column to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "likesCount" INTEGER NOT NULL DEFAULT 0;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT comment_likes_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_commentId_fkey FOREIGN KEY ("commentId") REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_userId_commentId_key UNIQUE ("userId", "commentId")
);

-- Create index on commentId for faster lookups
CREATE INDEX IF NOT EXISTS comment_likes_commentId_idx ON comment_likes("commentId");
