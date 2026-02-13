// config/redis.js
// Lazy Redis client setup. If REDIS_URL is not set, Redis features are disabled.

const { createClient } = require('redis');
const logger = require('../services/logger');

const REDIS_URL = process.env.REDIS_URL;

let redisClient = null;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (error) => {
    logger.error('Redis client error', error);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  redisClient.connect().catch((error) => {
    logger.error('Redis connection failed', error);
  });
}

const getRedisClient = () => redisClient;
const isRedisEnabled = () => Boolean(redisClient);
const closeRedis = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (error) {
    logger.error('Redis shutdown failed', error);
  }
};

module.exports = {
  getRedisClient,
  isRedisEnabled,
  closeRedis,
};
