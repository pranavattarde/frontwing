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

  static isErrorResponse(response) {
    if (!response || typeof response !== 'object') return true;
    if (response.error) return true;
    if (Array.isArray(response.errors) && response.errors.length > 0) return true;
    if (typeof response.final_answer === 'string') {
      const fa = response.final_answer.toLowerCase();
      if (
        fa.includes('something went wrong') ||
        fa.includes('internal execution error') ||
        fa.includes('no verified telemetry data') ||
        fa.includes('no verified race data') ||
        fa.includes('data_unavailable')
      ) return true;
    }
    if (response.status === 'backfilling' || response.status === 'in_progress') return true;
    if (response.intelligence_trace && Array.isArray(response.intelligence_trace.errors) && response.intelligence_trace.errors.length > 0) return true;
    return false;
  }

  static async getCachedResponse(question, session) {
    if (!redisClient.isOpen) {
      return null;
    }

    try {
      const key = this.generateCacheKey(question, session);
      const cached = await redisClient.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (this.isErrorResponse(parsed)) {
          console.log(`[Cache Invalidation] Purging cached error response for question: "${question.substring(0, 50)}..."`);
          await redisClient.del(key);
          return null;
        }
        console.log(`[Cache Hit] Serving cached response for question: "${question.substring(0, 50)}..."`);
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

    if (this.isErrorResponse(response)) {
      console.warn(`[Cache Warning] Refusing to cache error response for question: "${question.substring(0, 50)}..."`);
      return;
    }

    try {
      const key = this.generateCacheKey(question, session);
      await redisClient.set(key, JSON.stringify(response), {
        EX: ttl,
      });
      console.log(`[Cache Set] Cached response for question: "${question.substring(0, 50)}..." (TTL: ${ttl}s)`);

      // Index cache key by session to enable targeted invalidation on re-ingestion
      if (session && session !== 'global') {
        const cleanSession = session.trim().toLowerCase();
        await redisClient.sAdd(`cache:session_keys:${cleanSession}`, key);
        await redisClient.expire(`cache:session_keys:${cleanSession}`, ttl);
      }
    } catch (err) {
      console.warn('[Cache Warning] Failed to set Redis cache:', err.message);
    }
  }

  static async invalidateSessionCache(sessionId) {
    if (!redisClient.isOpen || !sessionId) {
      return 0;
    }
    try {
      const cleanSession = sessionId.trim().toLowerCase();
      const sessionKeys = await redisClient.sMembers(`cache:session_keys:${cleanSession}`);
      let count = 0;
      if (sessionKeys && sessionKeys.length > 0) {
        await redisClient.del(sessionKeys);
        await redisClient.del(`cache:session_keys:${cleanSession}`);
        count += sessionKeys.length;
      }
      // Invalidate Ghost Battle cached roster and telemetry data for this session
      const ghostBattleKeys = await redisClient.keys(`*ghost_battle*${cleanSession}*`);
      if (ghostBattleKeys && ghostBattleKeys.length > 0) {
        await redisClient.del(ghostBattleKeys);
        count += ghostBattleKeys.length;
      }
      console.log(`[Cache Invalidation] Purged ${count} cached items for session "${cleanSession}".`);
      return count;
    } catch (err) {
      console.warn(`[Cache Warning] Failed to invalidate cache for session ${sessionId}:`, err.message);
      return 0;
    }
  }

  static async clearInvestigationCache() {
    if (!redisClient.isOpen) {
      return;
    }
    try {
      const keys = await redisClient.keys('cache:investigation:*');
      if (keys && keys.length > 0) {
        await redisClient.del(keys);
        console.log(`[Cache Invalidation] Flushed ${keys.length} investigation cache keys.`);
      }
      const sessionIndexKeys = await redisClient.keys('cache:session_keys:*');
      if (sessionIndexKeys && sessionIndexKeys.length > 0) {
        await redisClient.del(sessionIndexKeys);
      }
    } catch (err) {
      console.warn('[Cache Warning] Failed to clear investigation cache:', err.message);
    }
  }
}

module.exports = {
  CacheService
};

