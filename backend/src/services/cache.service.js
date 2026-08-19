const { redisClient } = require('../config/redis');
const crypto = require('crypto');

class CacheService {
  static DEFAULT_TTL = 86400; // 24 hours in seconds

  static generateCacheKey(question, session) {
    const cleanQuestion = question.trim().toLowerCase();
    const cleanSession = (session || 'global').trim().toLowerCase();
    const hash = crypto
      .createHash('sha256')
      .update(`${cleanSession}:${cleanQuestion}`)
      .digest('hex');
    return `cache:investigation:${hash}`;
  }

  static async getCachedResponse(question, session) {
    if (!redisClient.isOpen) {
      return null;
    }

    try {
      const key = this.generateCacheKey(question, session);
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`[Cache Hit] Serving cached response for question: "${question.substring(0, 50)}..."`);
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          _cached: true,
        };
      }
    } catch (err) {
      console.warn('[Cache Warning] Failed to read from Redis:', err.message);
    }
    return null;
  }

  static async setCachedResponse(
    question,
    response,
    session,
    ttl = CacheService.DEFAULT_TTL
  ) {
    if (!redisClient.isOpen) {
      return;
    }

    try {
      const key = this.generateCacheKey(question, session);
      await redisClient.set(key, JSON.stringify(response), {
        EX: ttl,
      });
      console.log(`[Cache Set] Cached response for question: "${question.substring(0, 50)}..." (TTL: ${ttl}s)`);
    } catch (err) {
      console.warn('[Cache Warning] Failed to set Redis cache:', err.message);
    }
  }
}

module.exports = {
  CacheService
};
