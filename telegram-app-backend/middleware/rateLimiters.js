// middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');
const RateLimitRedis = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

const RedisStore = RateLimitRedis.default || RateLimitRedis;

const getStore = () => {
  const redis = getRedisClient();
  if (!redis) return undefined;
  return new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) });
};

const isDev = process.env.NODE_ENV === 'development';

const createRateLimiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    ...options,
  });

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 300 : 30,
  message: { error: 'Too many search requests, please try again shortly.' },
});

const orderCreateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDev ? 200 : 20,
  message: { error: 'Too many order attempts, please slow down.' },
  keyGenerator: (req) => {
    if (req?.user?.userId) return `user:${req.user.userId}`;
    return req.ip;
  },
});

module.exports = {
  createRateLimiter,
  searchLimiter,
  orderCreateLimiter,
};
