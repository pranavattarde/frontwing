import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
});

redisClient.on('connect', () => {
  console.log('[Redis] Client connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Client ready and connected');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error', err);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
