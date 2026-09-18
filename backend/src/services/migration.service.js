const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runDatabaseMigrations() {
  console.log('[Migration] Checking and applying PostgreSQL database migrations...');
  
  const candidateDirs = [
    path.resolve(__dirname, '../../../database/migrations'),
    path.resolve(process.cwd(), 'database/migrations'),
    path.resolve(process.cwd(), '../database/migrations'),
    path.resolve('/app/database/migrations'),
  ];

  let migrationDir = null;
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      migrationDir = dir;
      break;
    }
  }

  const migrationFiles = [
    '01_init_schema.sql',
    '02_intelligence_tables.sql',
    '03_auth_and_history.sql',
    '04_add_user_id_to_conversations.sql',
    '05_hero_and_editorial_content.sql',
    '06_performance_indexes.sql',
    '07_investigation_groups_and_customizations.sql',
    '08_conversation_thread_integrity.sql',
  ];

  if (migrationDir) {
    console.log(`[Migration] Found database migrations directory at: ${migrationDir}`);
    // Read all SQL files dynamically, sorted in order
    const filesToRun = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of filesToRun) {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const sql = fs.readFileSync(filePath, 'utf-8');
          await pool.query(sql);
          console.log(`[Migration] Successfully executed migration: ${file}`);
        } catch (err) {
          console.warn(`[Migration] Note on executing ${file}: ${err.message}`);
        }
      }
    }
  } else {
    console.warn('[Migration] Migrations directory not found on disk, running fallback DDL inline...');
  }

  // Ensure core tables exist via fallback DDL statements
  const inlineDdl = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS investigations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        ai_response JSONB NOT NULL,
        session VARCHAR(100),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        provider_used VARCHAR(50) DEFAULT 'gemini-2.5-flash',
        investigation_metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_investigations (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_saved_investigation UNIQUE (user_id, investigation_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        context JSONB,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

    CREATE TABLE IF NOT EXISTS hero_content (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        event_name VARCHAR(255) NOT NULL,
        official_event_name VARCHAR(255),
        location VARCHAR(255),
        country VARCHAR(255),
        round_number INT,
        season INT,
        circuit_name VARCHAR(255),
        circuit_key VARCHAR(100),
        track_length_km NUMERIC(6,3),
        turns INT,
        drs_zones INT,
        lap_record VARCHAR(50),
        hero_headline TEXT,
        hero_subheadline TEXT,
        sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
        suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        source VARCHAR(100) DEFAULT 'fastf1_official',
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS editorial_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        source_outlet VARCHAR(100) NOT NULL,
        source_url TEXT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metrics JSONB DEFAULT '{}'::jsonb,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_editorial_category ON editorial_content(category);
    CREATE INDEX IF NOT EXISTS idx_editorial_published ON editorial_content(published_at DESC);

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
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES investigation_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255);

    UPDATE investigations SET conversation_id = id::text WHERE conversation_id IS NULL;

    CREATE INDEX IF NOT EXISTS idx_investigations_pinned ON investigations(user_id, pinned);
    CREATE INDEX IF NOT EXISTS idx_investigations_group_id ON investigations(group_id);
    CREATE INDEX IF NOT EXISTS idx_investigations_cid ON investigations(conversation_id);

    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS response JSONB;
  `;

  try {
    await pool.query(inlineDdl);
    console.log('[Migration] Database tables verified (users, investigations, groups, conversations, hero_content, editorial_content).');
  } catch (err) {
    console.error('[Migration] Fallback DDL execution warning:', err.message);
  }
}

module.exports = {
  runDatabaseMigrations
};
