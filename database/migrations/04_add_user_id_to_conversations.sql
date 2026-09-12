-- Database Migration: 04_add_user_id_to_conversations
-- Add user_id foreign key to conversations table if missing, and ensure indexes

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
