import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Reconnect strategy: incremental backoff capped at 3 seconds
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('connect', () => {
  console.log('[Redis] Client connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Client ready and connected');
});

let lastLoggedErrorTime = 0;
redisClient.on('error', (err) => {
  const now = Date.now();
  if (now - lastLoggedErrorTime > 10000) { // Log at most once every 10 seconds
    console.error('[Redis] Connection error (throttled):', err.message || err);
    lastLoggedErrorTime = now;
  }
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
