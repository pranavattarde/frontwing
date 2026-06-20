import * as fs from 'fs';
import * as path from 'path';
import { pool } from './db';

async function runMigrations() {
  console.log('[Migration] Starting database initialization...');

  const schemaPath = path.join(__dirname, '../../../database/migrations/01_init_schema.sql');
  const seedPath = path.join(__dirname, '../../../database/seeds/seed_static_data.sql');

  const client = await pool.connect();
  try {
    // 1. Run Init Schema DDL
    if (fs.existsSync(schemaPath)) {
      console.log('[Migration] Loading schema DDL...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('[Migration] Schema DDL executed successfully');
    } else {
      console.error(`[Migration] Schema file not found at: ${schemaPath}`);
    }

    // 2. Run Static Data Seeds
    if (fs.existsSync(seedPath)) {
      console.log('[Migration] Loading static data seeds...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query('BEGIN');
      await client.query(seedSql);
      await client.query('COMMIT');
      console.log('[Migration] Static seeds executed successfully');
    } else {
      console.log(`[Migration] Seed file not found at: ${seedPath} (skipping seed step)`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Critical migration error. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('[Migration] Database pool closed. Migration process complete.');
  }
}

runMigrations().catch((err) => {
  console.error('[Migration] Failed running migrator process:', err);
  process.exit(1);
});
