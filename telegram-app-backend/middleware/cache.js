// middleware/cache.js
// Simple response cache using Redis (optional).

const { getRedisClient } = require('../config/redis');
const logger = require('../services/logger');

const buildCacheKey = (req, prefix) => {
  const query = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
  return `cache:${prefix}:${req.path}:${query}`;
};

const buildCacheKeySet = (prefix) => `cache:keys:${prefix}`;

const cacheResponse = (ttlSeconds, prefix) => async (req, res, next) => {
  const redis = getRedisClient();
  if (!redis) return next();

  const key = buildCacheKey(req, prefix || 'cache');
  const keySet = buildCacheKeySet(prefix || 'cache');

  try {
    const cached = await redis.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    logger.warn('Cache read failed', { error: error.message });
  }

  res.set('X-Cache', 'MISS');
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redis
        .setEx(key, ttlSeconds, JSON.stringify(body))
        .then(() => redis.sAdd(keySet, key))
        .then(() => redis.expire(keySet, Math.max(ttlSeconds * 2, 60)))
        .catch((error) => {
          logger.warn('Cache write failed', { error: error.message });
        });
    }
    return originalJson(body);
  };

  return next();
};

const invalidateCache = async (prefixes) => {
  const redis = getRedisClient();
  if (!redis) return;

  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];

  for (const prefix of prefixList) {
    const keySet = buildCacheKeySet(prefix);
    try {
      const keys = await redis.sMembers(keySet);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      await redis.del(keySet);
    } catch (error) {
      logger.warn('Cache invalidation failed', { error: error.message, prefix });
    }
  }
};

module.exports = { cacheResponse, invalidateCache };
