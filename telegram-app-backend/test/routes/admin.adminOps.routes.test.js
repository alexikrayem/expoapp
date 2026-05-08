jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/telegramBot', () => ({
  broadcastToAllUsers: jest.fn(),
  getPlatformStats: jest.fn(),
}));

jest.mock('../../services/queueMonitor', () => ({
  getQueueStats: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('../../middleware/cache', () => ({
  invalidateCache: jest.fn(),
}));

jest.mock('../../routes/admin/adminUtils', () => ({
  validateCreateSupplier: [(_req, _res, next) => next()],
  validateUpdateSupplier: [(_req, _res, next) => next()],
  validateCreateFeaturedItem: [(_req, _res, next) => next()],
  validateUpdateFeaturedItem: [(_req, _res, next) => next()],
  validateCreateFeaturedList: [(_req, _res, next) => next()],
  validateBroadcast: [(_req, _res, next) => next()],
  HTTP: {
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    CREATED: 201,
    INTERNAL_SERVER_ERROR: 500,
  },
  ADMIN_CACHE_KEYS: [],
  FEATURED_CACHE_KEYS: [],
  FEATURED_LIST_CACHE_KEYS: [],
}));

const express = require('express');
const request = require('../utils/request');
const telegramBotService = require('../../services/telegramBot');
const { getQueueStats } = require('../../services/queueMonitor');
const logger = require('../../services/logger');
const { recordAuditEvent } = require('../../services/auditService');
const adminOpsRoutes = require('../../routes/admin/adminOps.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { adminId: 9001, role: 'admin' };
    next();
  });
  app.use('/api/admin', adminOpsRoutes);
  return app;
};

describe('adminOps routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    telegramBotService.broadcastToAllUsers.mockReset();
    telegramBotService.getPlatformStats.mockReset();
    getQueueStats.mockReset();
    logger.error.mockReset();
    recordAuditEvent.mockReset();
  });

  describe('POST /api/admin/broadcast', () => {
    it('returns 400 when message content is blank', async () => {
      const res = await request(app)
        .post('/api/admin/broadcast')
        .send({ message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Message content is required' });
      expect(telegramBotService.broadcastToAllUsers).not.toHaveBeenCalled();
    });

    it('sends broadcast and returns success counters', async () => {
      telegramBotService.broadcastToAllUsers.mockResolvedValueOnce({
        successCount: 12,
        failCount: 2,
      });

      const res = await request(app)
        .post('/api/admin/broadcast')
        .send({ message: '  promo update  ' });

      expect(res.status).toBe(200);
      expect(telegramBotService.broadcastToAllUsers).toHaveBeenCalledWith(
        'promo update',
        9001
      );
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'broadcast_send',
          actorId: 9001,
          targetType: 'broadcast',
        })
      );
      expect(res.body).toEqual({
        message: 'Broadcast sent successfully',
        successCount: 12,
        failCount: 2,
      });
    });

    it('returns 500 when broadcast sending fails', async () => {
      telegramBotService.broadcastToAllUsers.mockRejectedValueOnce(new Error('telegram down'));

      const res = await request(app)
        .post('/api/admin/broadcast')
        .send({ message: 'new message' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to send broadcast message' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error sending broadcast',
        expect.any(Error)
      );
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns platform statistics', async () => {
      telegramBotService.getPlatformStats.mockResolvedValueOnce({
        users: 100,
        active: 45,
      });

      const res = await request(app).get('/api/admin/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ users: 100, active: 45 });
    });

    it('returns 500 when stats retrieval fails', async () => {
      telegramBotService.getPlatformStats.mockRejectedValueOnce(new Error('stats fail'));

      const res = await request(app).get('/api/admin/stats');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch platform statistics' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching platform stats',
        expect.any(Error)
      );
    });
  });

  describe('GET /api/admin/queue-stats', () => {
    it('returns queue statistics', async () => {
      getQueueStats.mockResolvedValueOnce({
        enabled: true,
        queues: { notifications: { enabled: true } },
      });

      const res = await request(app).get('/api/admin/queue-stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        enabled: true,
        queues: { notifications: { enabled: true } },
      });
    });

    it('returns 500 when queue stats retrieval fails', async () => {
      getQueueStats.mockRejectedValueOnce(new Error('queue fail'));

      const res = await request(app).get('/api/admin/queue-stats');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch queue stats' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching queue stats',
        expect.any(Error)
      );
    });
  });
});
