import { redisClient } from '../config/redis';
import crypto from 'crypto';

export class CacheService {
  private static DEFAULT_TTL = 86400; // 24 hours in seconds

  private static generateCacheKey(question: string, session?: string): string {
    const cleanQuestion = question.trim().toLowerCase();
    const cleanSession = (session || 'global').trim().toLowerCase();
    const hash = crypto
      .createHash('sha256')
      .update(`${cleanSession}:${cleanQuestion}`)
      .digest('hex');
    return `cache:investigation:${hash}`;
  }

  static async getCachedResponse(question: string, session?: string): Promise<any | null> {
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
    } catch (err: any) {
      console.warn('[Cache Warning] Failed to read from Redis:', err.message);
    }
    return null;
  }

  static async setCachedResponse(
    question: string,
    response: any,
    session?: string,
    ttl: number = CacheService.DEFAULT_TTL
  ): Promise<void> {
    if (!redisClient.isOpen) {
      return;
    }

    try {
      const key = this.generateCacheKey(question, session);
      await redisClient.set(key, JSON.stringify(response), {
        EX: ttl,
      });
      console.log(`[Cache Set] Cached response for question: "${question.substring(0, 50)}..." (TTL: ${ttl}s)`);
    } catch (err: any) {
      console.warn('[Cache Warning] Failed to set Redis cache:', err.message);
    }
  }
}
