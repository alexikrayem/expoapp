jest.mock('../../middleware/authSupplier', () =>
  jest.fn((req, _res, next) => {
    req.supplier = { supplierId: 55, role: 'supplier' };
    next();
  })
);

jest.mock('../../middleware/cache', () => ({
  invalidateCache: jest.fn(),
  cacheResponse: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../../services/searchIndexer', () => ({
  indexProductById: jest.fn(),
  indexSupplierById: jest.fn(),
  reindexProductsBySupplierId: jest.fn(),
  reindexDealsBySupplierId: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/tokenService', () => ({
  revokeAllForSubject: jest.fn(),
}));

jest.mock('../../routes/suppliers.helpers', () => ({
  triggerProductLinking: jest.fn().mockResolvedValue({ status: 'queued' }),
}));

jest.mock('../../routes/suppliers/supplierUtils', () => {
  const noop = [(_req, _res, next) => next()];
  return {
    HTTP: {
      BAD_REQUEST: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      CREATED: 201,
      INTERNAL_SERVER_ERROR: 500,
    },
    VALIDATION_LIMITS: {},
    CACHE_TTL_SECONDS: {},
    validateSupplierCitiesUpdate: noop,
    validateSupplierProductCreate: noop,
    validateSupplierProductUpdate: noop,
    validateSupplierProductIdParam: noop,
    validateSupplierProductsList: noop,
    validateSupplierBulkStockUpdate: noop,
    validateDeliveryAgentCreate: noop,
    validateDeliveryAgentUpdate: noop,
    validateDeliveryAgentIdParam: noop,
    validateSupplierOrdersList: noop,
  };
});

const express = require('express');
const request = require('../utils/request');
const logger = require('../../services/logger');
const { invalidateCache } = require('../../middleware/cache');
const { recordAuditEvent } = require('../../services/auditService');
const {
  indexSupplierById,
  reindexProductsBySupplierId,
  reindexDealsBySupplierId,
} = require('../../services/searchIndexer');
const supplierProfileRoutes = require('../../routes/suppliers/supplierProfile.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/supplier', supplierProfileRoutes);
  return app;
};

describe('supplierProfile routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    logger.error.mockReset();
    invalidateCache.mockReset();
    recordAuditEvent.mockReset();
    indexSupplierById.mockReset();
    reindexProductsBySupplierId.mockReset();
    reindexDealsBySupplierId.mockReset();
    if (global.mockDb.pool?.connect?.mockClear) {
      global.mockDb.pool.connect.mockClear();
    }
  });

  describe('GET /api/supplier/profile', () => {
    it('returns 404 when supplier profile is missing', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/supplier/profile');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Supplier not found' });
    });

    it('returns supplier profile with city aggregates', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 55,
          name: 'Supplier 55',
          city_ids: [1, 2],
          city_names: ['Damascus', 'Aleppo'],
        }],
      });

      const res = await request(app).get('/api/supplier/profile');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 55,
        name: 'Supplier 55',
        city_ids: [1, 2],
        city_names: ['Damascus', 'Aleppo'],
      });
    });
  });

  describe('GET /api/supplier/cities', () => {
    it('returns supplier city associations', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ city_id: 1, city_name: 'Damascus' }],
      });

      const res = await request(app).get('/api/supplier/cities');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ city_id: 1, city_name: 'Damascus' }]);
    });

    it('returns 500 when city query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('cities fail'));

      const res = await request(app).get('/api/supplier/cities');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch cities' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching supplier cities',
        expect.any(Error)
      );
    });
  });

  describe('PUT /api/supplier/cities', () => {
    it('returns 400 when city_ids is not an array', async () => {
      const res = await request(app)
        .put('/api/supplier/cities')
        .send({ city_ids: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'city_ids must be an array' });
    });

    it('replaces supplier city associations and triggers side effects', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE existing
        .mockResolvedValueOnce({}) // INSERT new
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/supplier/cities')
        .send({ city_ids: [3, 4] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Cities updated successfully' });
      expect(global.mockDb.pool.connect).toHaveBeenCalled();
      expect(indexSupplierById).toHaveBeenCalledWith(55);
      expect(reindexProductsBySupplierId).toHaveBeenCalledWith(55);
      expect(reindexDealsBySupplierId).toHaveBeenCalledWith(55);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_cities_update',
          actorId: 55,
        })
      );
    });

    it('rolls back and returns 500 when transactional update fails', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('delete fail'))
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app)
        .put('/api/supplier/cities')
        .send({ city_ids: [1] });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to update cities' });
      expect(global.mockDb.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating supplier cities',
        expect.any(Error)
      );
    });
  });
});
