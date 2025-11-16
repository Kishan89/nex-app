-- Verification script for mentions migration
-- Run this to verify the migration was successful

-- Check if mentions column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'mentions';

-- Check if new notification types exist
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'NotificationType'
)
ORDER BY enumlabel;

-- Check if index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'messages' AND indexname = 'idx_messages_mentions';

-- Sample query to test mentions functionality
SELECT id, content, mentions, "senderId", "createdAt"
FROM messages
WHERE array_length(mentions, 1) > 0
LIMIT 5;

-- Count messages with mentions
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN array_length(mentions, 1) > 0 THEN 1 END) as messages_with_mentions,
  ROUND(
    100.0 * COUNT(CASE WHEN array_length(mentions, 1) > 0 THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) as mention_percentage
FROM messages;

-- Check notification types distribution
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Verify chat_participants have isAdmin flag
SELECT 
  COUNT(*) as total_participants,
  COUNT(CASE WHEN "isAdmin" = true THEN 1 END) as admin_count,
  COUNT(CASE WHEN "isAdmin" = false THEN 1 END) as member_count
FROM chat_participants;

-- Check group chats
SELECT 
  c.id,
  c.name,
  c."createdById",
  COUNT(cp.id) as member_count,
  COUNT(CASE WHEN cp."isAdmin" = true THEN 1 END) as admin_count
FROM chats c
LEFT JOIN chat_participants cp ON c.id = cp."chatId"
WHERE c."isGroup" = true
GROUP BY c.id, c.name, c."createdById"
ORDER BY member_count DESC
LIMIT 10;

-- Verify foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('messages', 'chat_participants', 'notifications')
ORDER BY tc.table_name, tc.constraint_name;

-- Check for any orphaned records
SELECT 'Orphaned Messages' as check_type, COUNT(*) as count
FROM messages m
WHERE m."chatId" IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM chats c WHERE c.id = m."chatId")
UNION ALL
SELECT 'Orphaned Chat Participants', COUNT(*)
FROM chat_participants cp
WHERE NOT EXISTS (SELECT 1 FROM chats c WHERE c.id = cp."chatId")
UNION ALL
SELECT 'Orphaned Notifications', COUNT(*)
FROM notifications n
WHERE n."fromUserId" IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n."fromUserId");

-- Performance check: Ensure indexes are being used
EXPLAIN ANALYZE
SELECT id, content, mentions
FROM messages
WHERE mentions && ARRAY['testuser']::text[]
LIMIT 10;

-- Summary
SELECT 
  'Migration Verification Complete' as status,
  NOW() as verified_at;
