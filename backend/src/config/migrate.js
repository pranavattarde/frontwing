const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigrations() {
  console.log('[Migration] Starting database initialization...');

  const migrationsDir = path.join(__dirname, '../../../database/migrations');
  const seedPath = path.join(__dirname, '../../../database/seeds/seed_static_data.sql');

  const client = await pool.connect();
  try {
    // 1. Run all Init and Schema DDL files in alphabetical order
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // guarantees alphabetical order

      console.log(`[Migration] Found ${files.length} SQL schema files to apply.`);
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log(`[Migration] Executing migration: ${file}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`[Migration] Migration ${file} executed successfully`);
      }
    } else {
      console.error(`[Migration] Migrations directory not found at: ${migrationsDir}`);
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
