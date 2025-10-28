-- Migration: Add Poll Performance Indexes
-- Run this SQL directly in Supabase SQL Editor

-- Add index on Poll.postId for faster poll lookups when fetching posts
CREATE INDEX IF NOT EXISTS "Poll_postId_idx" ON "Poll"("postId");

-- Add index on PollOption.pollId for faster option lookups
CREATE INDEX IF NOT EXISTS "PollOption_pollId_idx" ON "PollOption"("pollId");

-- Add indexes on PollVote for faster vote counting and user vote lookups
CREATE INDEX IF NOT EXISTS "PollVote_pollId_idx" ON "PollVote"("pollId");
CREATE INDEX IF NOT EXISTS "PollVote_pollOptionId_idx" ON "PollVote"("pollOptionId");
CREATE INDEX IF NOT EXISTS "PollVote_userId_idx" ON "PollVote"("userId");

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Poll', 'PollOption', 'PollVote')
ORDER BY tablename, indexname;
