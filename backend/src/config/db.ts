import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/frontwing';

const poolConfig: PoolConfig = {
  connectionString: dbUrl,
  max: 20, // max active clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('[Database] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle PostgreSQL client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log queries in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Database] Query executed: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}" (${duration}ms)`);
    }
    return res;
  } catch (error) {
    console.error(`[Database] Error running query "${text.substring(0, 100)}":`, error);
    throw error;
  }
}
