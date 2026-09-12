const rateLimit = require('express-rate-limit');

/**
 * Key generator that keys by authenticated user ID if available,
 * falling back to client IP address.
 */
function userOrIpKeyGenerator(req) {
  if (req.user && req.user.id) {
    return `user_${req.user.id}`;
  }
  return req.ip;
}

/**
 * 1. Auth Rate Limiter
 * Stricter limit on /auth/login and /auth/register to mitigate brute-force
 * and credential-stuffing attacks.
 * Limit: 10 attempts per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    status: 429
  }
});

/**
 * 2. AI Engineering Query Limiter
 * Rate limits expensive LLM/agent pipelines (/engineer/query, /strategy/query).
 * Limit: 30 queries per 15 minutes per user/IP.
 */
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Engineering query rate limit exceeded. Please wait before submitting additional analysis requests.',
    status: 429
  }
});

/**
 * 3. Ghost Battle Telemetry Data Limiter
 * Limits high-throughput telemetry simulation & calculation calls (/ghost-battle/data).
 * Limit: 40 requests per 15 minutes per user/IP.
 */
const ghostBattleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Ghost battle rate limit exceeded. Please wait before requesting additional telemetry comparison data.',
    status_code: 429
  }
});

/**
 * 4. General API Rate Limiter
 * Broad safety net against denial-of-service on general API endpoints.
 * Limit: 150 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    status: 429
  }
});

module.exports = {
  authLimiter,
  queryLimiter,
  ghostBattleLimiter,
  generalLimiter,
  userOrIpKeyGenerator
};
