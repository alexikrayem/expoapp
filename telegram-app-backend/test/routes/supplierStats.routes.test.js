jest.mock('../../middleware/authSupplier', () =>
  jest.fn((req, _res, next) => {
    req.supplier = { supplierId: 77, role: 'supplier' };
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

jest.mock('../../services/tokenService', () => ({
  revokeAllForSubject: jest.fn(),
}));

jest.mock('../../routes/suppliers.helpers', () => ({
  triggerProductLinking: jest.fn().mockResolvedValue({ status: 'queued' }),
}));

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
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
const supplierStatsRoutes = require('../../routes/suppliers/supplierStats.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/supplier', supplierStatsRoutes);
  return app;
};

describe('supplierStats routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    logger.error.mockReset();
  });

  describe('GET /api/supplier/stats', () => {
    it('returns normalized numeric stat values', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_products: '10',
          in_stock_products: '8',
          out_of_stock_products: '2',
          on_sale_products: '3',
          orders_this_month: '6',
          sales_this_month: '1440.5',
        }],
      });

      const res = await request(app).get('/api/supplier/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total_products: 10,
        in_stock_products: 8,
        out_of_stock_products: 2,
        on_sale_products: 3,
        orders_this_month: 6,
        sales_this_month: 1440.5,
      });
    });

    it('returns 500 when supplier stats query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('stats query fail'));

      const res = await request(app).get('/api/supplier/stats');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch stats' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching supplier stats',
        expect.any(Error)
      );
    });
  });

  describe('GET /api/supplier/orders', () => {
    it('returns paginated supplier orders without explicit status filter', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            order_id: 101,
            order_status: 'pending',
            total_count: '2',
          },
          {
            order_id: 102,
            order_status: 'completed',
            total_count: '2',
          },
        ],
      });

      const res = await request(app)
        .get('/api/supplier/orders')
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [
          { order_id: 101, order_status: 'pending', total_count: '2' },
          { order_id: 102, order_status: 'completed', total_count: '2' },
        ],
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
      });
      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.supplier_id = $1'),
        [77, 20, 0]
      );
    });

    it('applies status filter when provided and not "all"', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ order_id: 201, order_status: 'pending', total_count: '1' }],
      });

      const res = await request(app)
        .get('/api/supplier/orders')
        .query({ page: 2, limit: 10, status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.currentPage).toBe(2);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND o.status = $2'),
        [77, 'pending', 10, 10]
      );
    });

    it('returns 500 when supplier order query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('orders query fail'));

      const res = await request(app).get('/api/supplier/orders');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch orders' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching supplier orders',
        expect.any(Error)
      );
    });
  });
});
