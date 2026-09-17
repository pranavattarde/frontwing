-- Database Migration: 07_investigation_groups_and_customizations
-- Adds investigation_groups table and pinned, display_title, group_id to investigations table

CREATE TABLE IF NOT EXISTS investigation_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_group_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_investigation_groups_user_id ON investigation_groups(user_id);

ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS display_title TEXT,
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES investigation_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_investigations_pinned ON investigations(user_id, pinned);
CREATE INDEX IF NOT EXISTS idx_investigations_group_id ON investigations(group_id);
