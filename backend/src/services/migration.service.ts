import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

export async function runDatabaseMigrations(): Promise<void> {
  console.log('[Migration] Checking and applying PostgreSQL database migrations...');
  
  const candidateDirs = [
    path.resolve(__dirname, '../../../database/migrations'),
    path.resolve(process.cwd(), 'database/migrations'),
    path.resolve(process.cwd(), '../database/migrations'),
    path.resolve('/app/database/migrations'),
  ];

  let migrationDir: string | null = null;
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
  ];

  if (migrationDir) {
    console.log(`[Migration] Found database migrations directory at: ${migrationDir}`);
    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const sql = fs.readFileSync(filePath, 'utf-8');
          await pool.query(sql);
          console.log(`[Migration] Successfully executed migration: ${file}`);
        } catch (err: any) {
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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
  `;

  try {
    await pool.query(inlineDdl);
    console.log('[Migration] Database tables verified (users, investigations, saved_investigations, conversations).');
  } catch (err: any) {
    console.error('[Migration] Fallback DDL execution warning:', err.message);
  }
}
