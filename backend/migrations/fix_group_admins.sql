-- Fix: Make all group creators admin
-- This ensures that users who created groups have admin permissions

UPDATE chat_participants cp
SET "isAdmin" = true
FROM chats c
WHERE cp."chatId" = c.id
  AND cp."userId" = c."createdById"
  AND c."isGroup" = true
  AND cp."isAdmin" = false;

-- Verify the changes
SELECT 
  c.id as group_id,
  c.name as group_name,
  c."createdById" as creator_id,
  cp."userId" as participant_id,
  cp."isAdmin" as is_admin,
  u.username
FROM chats c
JOIN chat_participants cp ON c.id = cp."chatId"
JOIN users u ON cp."userId" = u.id
WHERE c."isGroup" = true
  AND cp."isAdmin" = true
ORDER BY c."createdAt" DESC;
