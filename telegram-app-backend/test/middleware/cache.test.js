const express = require('express');
const request = require('../utils/request');

const loadCacheModule = ({ redisClient } = {}) => {
  jest.resetModules();

  const getRedisClient = jest.fn(() => redisClient || null);
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    request: jest.fn(),
    query: jest.fn(),
  };

  jest.doMock('../../config/redis', () => ({
    getRedisClient,
  }));
  jest.doMock('../../services/logger', () => logger);

  const cache = require('../../middleware/cache');
  return { ...cache, getRedisClient, logger };
};

describe('cache middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes through when redis is unavailable', async () => {
    const { cacheResponse } = loadCacheModule({ redisClient: null });
    const app = express();
    app.get('/items', cacheResponse(120, 'items'), (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['x-cache']).toBeUndefined();
  });

  it('returns cached payload with X-Cache=HIT and skips downstream handler', async () => {
    const redisClient = {
      get: jest.fn().mockResolvedValue(JSON.stringify({ cached: true })),
      setEx: jest.fn(),
      sAdd: jest.fn(),
      expire: jest.fn(),
      sMembers: jest.fn(),
      del: jest.fn(),
    };
    const { cacheResponse } = loadCacheModule({ redisClient });

    const handlerSpy = jest.fn((_req, res) => {
      res.json({ fresh: true });
    });

    const app = express();
    app.get('/items', cacheResponse(120, 'items'), handlerSpy);

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cached: true });
    expect(res.headers['x-cache']).toBe('HIT');
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('marks misses and stores successful responses in redis', async () => {
    const redisClient = {
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
      sAdd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn(),
      del: jest.fn(),
    };
    const { cacheResponse } = loadCacheModule({ redisClient });

    const app = express();
    app.get('/items', cacheResponse(180, 'items'), (_req, res) => {
      res.json({ fresh: true });
    });

    const res = await request(app).get('/items').query({ page: 1 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fresh: true });
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.headers['cache-control']).toBe('public, max-age=180');

    expect(redisClient.setEx).toHaveBeenCalledWith(
      'cache:items:/items:page=1',
      180,
      JSON.stringify({ fresh: true })
    );
    expect(redisClient.sAdd).toHaveBeenCalledWith('cache:keys:items', 'cache:items:/items:page=1');
    expect(redisClient.expire).toHaveBeenCalledWith('cache:keys:items', 360);
  });

  it('does not cache non-2xx responses', async () => {
    const redisClient = {
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn(),
      sAdd: jest.fn(),
      expire: jest.fn(),
      sMembers: jest.fn(),
      del: jest.fn(),
    };
    const { cacheResponse } = loadCacheModule({ redisClient });

    const app = express();
    app.get('/items', cacheResponse(60, 'items'), (_req, res) => {
      res.status(500).json({ error: 'boom' });
    });

    const res = await request(app).get('/items');
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(500);
    expect(redisClient.setEx).not.toHaveBeenCalled();
    expect(redisClient.sAdd).not.toHaveBeenCalled();
    expect(redisClient.expire).not.toHaveBeenCalled();
  });

  it('invalidates cached keys for the provided prefixes', async () => {
    const redisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      sAdd: jest.fn(),
      expire: jest.fn(),
      sMembers: jest
        .fn()
        .mockResolvedValueOnce(['cache:products:/api/products:city=1'])
        .mockResolvedValueOnce([]),
      del: jest.fn().mockResolvedValue(1),
    };
    const { invalidateCache } = loadCacheModule({ redisClient });

    await invalidateCache(['products', 'deals']);

    expect(redisClient.sMembers).toHaveBeenCalledWith('cache:keys:products');
    expect(redisClient.del).toHaveBeenCalledWith(['cache:products:/api/products:city=1']);
    expect(redisClient.del).toHaveBeenCalledWith('cache:keys:products');
    expect(redisClient.sMembers).toHaveBeenCalledWith('cache:keys:deals');
    expect(redisClient.del).toHaveBeenCalledWith('cache:keys:deals');
  });

  it('logs warning when cache invalidation fails', async () => {
    const redisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      sAdd: jest.fn(),
      expire: jest.fn(),
      sMembers: jest.fn().mockRejectedValue(new Error('redis failure')),
      del: jest.fn(),
    };
    const { invalidateCache, logger } = loadCacheModule({ redisClient });

    await invalidateCache('products');

    expect(logger.warn).toHaveBeenCalledWith('Cache invalidation failed', {
      error: 'redis failure',
      prefix: 'products',
    });
  });
});
