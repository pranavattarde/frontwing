const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 2) return new Error('Redis offline');
      return Math.min(retries * 100, 1000);
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

async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (e) {
      console.warn('[Redis] Redis server offline:', e.message);
    }
  }
}

module.exports = {
  redisClient,
  connectRedis
};
