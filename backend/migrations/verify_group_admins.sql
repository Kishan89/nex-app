-- Verify and fix group admin status
-- This script checks and ensures group creators are marked as admins

-- First, let's see current admin status
SELECT 
    c.id as chat_id,
    c.name as group_name,
    c."createdById" as creator_id,
    cp."userId" as participant_id,
    cp."isAdmin" as is_admin,
    u.username
FROM "Chat" c
JOIN "ChatParticipant" cp ON c.id = cp."chatId"
JOIN "User" u ON cp."userId" = u.id
WHERE c."isGroup" = true
ORDER BY c.id, cp."isAdmin" DESC;

-- Fix: Ensure all group creators are marked as admins
UPDATE "ChatParticipant"
SET "isAdmin" = true
WHERE "chatId" IN (
    SELECT c.id 
    FROM "Chat" c 
    WHERE c."isGroup" = true
)
AND "userId" IN (
    SELECT c."createdById"
    FROM "Chat" c
    WHERE c."isGroup" = true
    AND "ChatParticipant"."chatId" = c.id
)
AND "isAdmin" = false;

-- Verify the fix
SELECT 
    c.id as chat_id,
    c.name as group_name,
    c."createdById" as creator_id,
    cp."userId" as participant_id,
    cp."isAdmin" as is_admin,
    u.username,
    CASE 
        WHEN c."createdById" = cp."userId" THEN 'CREATOR'
        WHEN cp."isAdmin" = true THEN 'ADMIN'
        ELSE 'MEMBER'
    END as role
FROM "Chat" c
JOIN "ChatParticipant" cp ON c.id = cp."chatId"
JOIN "User" u ON cp."userId" = u.id
WHERE c."isGroup" = true
ORDER BY c.id, cp."isAdmin" DESC;
