-- Add avatar column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS avatar TEXT;
