jest.mock('../../middleware/authSupplier', () =>
  jest.fn((req, _res, next) => {
    req.supplier = { supplierId: 66, role: 'supplier' };
    next();
  })
);

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

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

jest.mock('../../services/tokenService', () => ({
  revokeAllForSubject: jest.fn(),
}));

jest.mock('../../routes/suppliers.helpers', () => ({
  triggerProductLinking: jest.fn(),
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
const { indexProductById } = require('../../services/searchIndexer');
const { recordAuditEvent } = require('../../services/auditService');
const { triggerProductLinking } = require('../../routes/suppliers.helpers');
const supplierProductsRoutes = require('../../routes/suppliers/supplierProducts.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/supplier', supplierProductsRoutes);
  return app;
};

describe('supplierProducts routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    logger.error.mockReset();
    invalidateCache.mockReset();
    indexProductById.mockReset();
    recordAuditEvent.mockReset();
    triggerProductLinking.mockReset();
    triggerProductLinking.mockResolvedValue({ status: 'queued' });
    if (global.mockDb.pool?.connect?.mockClear) {
      global.mockDb.pool.connect.mockClear();
    }
  });

  describe('GET /api/supplier/products', () => {
    it('returns supplier products', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Product One' }],
      });

      const res = await request(app).get('/api/supplier/products').query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, name: 'Product One' }]);
    });
  });

  describe('POST /api/supplier/products', () => {
    it('creates product successfully when linking is queued', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 10, name: 'Created Product', linking_status: 'pending' }],
      });

      const res = await request(app)
        .post('/api/supplier/products')
        .send({
          name: 'Created Product',
          standardized_name_input: 'created product',
          description: 'desc',
          price: '99.5',
          stock_level: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 10, name: 'Created Product', linking_status: 'pending' });
      expect(triggerProductLinking).toHaveBeenCalledWith(10, { reason: 'product_create' });
      expect(indexProductById).toHaveBeenCalledWith(10);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product_create',
          actorId: 66,
          targetId: 10,
        })
      );
    });

    it('returns linking warning when async linking fails', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 11, name: 'Created Product', linking_status: 'pending' }],
        })
        .mockResolvedValueOnce({}); // UPDATE linking_status failed
      triggerProductLinking.mockResolvedValueOnce({ status: 'failed' });

      const res = await request(app)
        .post('/api/supplier/products')
        .send({
          name: 'Created Product',
          standardized_name_input: 'created product',
          description: 'desc',
          price: '100',
          stock_level: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.linking_status).toBe('failed');
      expect(String(res.body.linking_warning)).toContain('auto-linking failed');
    });
  });

  describe('PUT /api/supplier/products/:id', () => {
    it('returns 404 when product does not belong to supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/supplier/products/99')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Product not found or not owned by you' });
    });

    it('returns 400 when no fields are provided', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 4,
          name: 'P',
          standardized_name_input: 'p',
          category: 'Cat',
          description: 'D',
          linking_status: 'linked',
        }],
      });

      const res = await request(app).put('/api/supplier/products/4').send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No fields to update' });
    });

    it('updates product and returns warning when relinking fails', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 4,
            name: 'Old Name',
            standardized_name_input: 'old',
            category: 'Cat',
            description: 'Desc',
            linking_status: 'linked',
          }],
        }) // verify
        .mockResolvedValueOnce({
          rows: [{ id: 4, name: 'New Name', linking_status: 'pending' }],
        }) // update
        .mockResolvedValueOnce({}); // set failed
      triggerProductLinking.mockResolvedValueOnce({ status: 'failed' });

      const res = await request(app)
        .put('/api/supplier/products/4')
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.linking_status).toBe('failed');
      expect(String(res.body.linking_warning)).toContain('auto-linking failed');
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'product_update',
          targetId: 4,
        })
      );
    });
  });

  describe('DELETE /api/supplier/products/:id', () => {
    it('returns 404 when product is not owned by supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/supplier/products/30');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Product not found or not owned by you' });
    });

    it('deactivates product when historical orders exist', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 30 }] }) // verify
        .mockResolvedValueOnce({ rows: [{ order_count: '3' }] }) // order count
        .mockResolvedValueOnce({ rows: [{ id: 30, is_active: false }] }); // deactivate

      const res = await request(app).delete('/api/supplier/products/30');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Product deactivated (has existing orders)',
        product: { id: 30, is_active: false },
      });
    });

    it('hard deletes product when no orders exist', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 31 }] }) // verify
        .mockResolvedValueOnce({ rows: [{ order_count: '0' }] }) // order count
        .mockResolvedValueOnce({}); // delete

      const res = await request(app).delete('/api/supplier/products/31');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Product deleted successfully' });
      expect(invalidateCache).toHaveBeenCalled();
      expect(indexProductById).toHaveBeenCalledWith('31');
    });
  });

  describe('PUT /api/supplier/products/bulk-stock', () => {
    it('returns 400 when updates array is missing', async () => {
      const res = await request(app)
        .put('/api/supplier/products/bulk-stock')
        .send({ updates: [] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Updates array is required' });
    });

    it('returns 400 when one update has invalid product id', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app)
        .put('/api/supplier/products/bulk-stock')
        .send({ updates: [{ id: 0, stock_level: 4 }] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Each update must include a valid product id',
      });
      expect(global.mockDb.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('returns 404 when some products are not owned by supplier', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // verify only 1 found
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app)
        .put('/api/supplier/products/bulk-stock')
        .send({
          updates: [
            { id: 1, stock_level: 10 },
            { id: 2, stock_level: 20 },
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'Product(s) not found or not owned by you: 2',
      });
    });

    it('bulk updates stock levels and returns updated count', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // verify
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // update
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/supplier/products/bulk-stock')
        .send({
          updates: [
            { id: 1, stock_level: 10 },
            { id: 2, stock_level: 20 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Stock levels updated successfully',
        updated_count: 2,
      });
      expect(indexProductById).toHaveBeenCalledWith(1);
      expect(indexProductById).toHaveBeenCalledWith(2);
    });
  });
});
