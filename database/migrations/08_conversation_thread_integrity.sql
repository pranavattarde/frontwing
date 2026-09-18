-- 08_conversation_thread_integrity.sql
-- Ensure investigations have conversation_id for multi-turn thread grouping
ALTER TABLE investigations ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_investigations_cid ON investigations(conversation_id);

-- Backfill existing investigations where conversation_id IS NULL with id::text
UPDATE investigations SET conversation_id = id::text WHERE conversation_id IS NULL;

-- Ensure conversations table has response JSONB for complete turn payloads
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS response JSONB;
CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
