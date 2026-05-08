jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../middleware/cache', () => ({
  invalidateCache: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  recordAuditEvent: jest.fn(),
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
  FEATURED_CACHE_KEYS: ['featured:items', 'featured:list'],
  FEATURED_LIST_CACHE_KEYS: ['featured:list', 'featured:items'],
}));

const express = require('express');
const request = require('../utils/request');
const logger = require('../../services/logger');
const { invalidateCache } = require('../../middleware/cache');
const { recordAuditEvent } = require('../../services/auditService');
const adminFeaturedRoutes = require('../../routes/admin/adminFeatured.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { adminId: 123, role: 'admin' };
    next();
  });
  app.use('/api/admin', adminFeaturedRoutes);
  return app;
};

describe('adminFeatured routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    if (global.mockDb.pool?.connect?.mockClear) {
      global.mockDb.pool.connect.mockClear();
    }
    logger.error.mockReset();
    invalidateCache.mockReset();
    recordAuditEvent.mockReset();
  });

  describe('GET /api/admin/featured-items-definitions', () => {
    it('returns featured item definitions', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, item_type: 'product', item_id: 3, original_item_name: 'Kit' }],
      });

      const res = await request(app).get('/api/admin/featured-items-definitions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [{ id: 1, item_type: 'product', item_id: 3, original_item_name: 'Kit' }],
      });
    });

    it('returns 500 when definition lookup fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('featured defs failed'));

      const res = await request(app).get('/api/admin/featured-items-definitions');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch featured items definitions' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching featured items definitions',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/admin/featured-items', () => {
    it('returns 400 when item type or id is missing', async () => {
      const res = await request(app)
        .post('/api/admin/featured-items')
        .send({ item_type: 'product' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Item type and item ID are required' });
    });

    it('returns 400 when referenced entity does not exist', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/admin/featured-items')
        .send({ item_type: 'product', item_id: 999 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Referenced product does not exist' });
    });

    it('creates featured item and triggers cache/audit side effects', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 5 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 11, item_type: 'product', item_id: 5, display_order: 0 }],
        });

      const res = await request(app)
        .post('/api/admin/featured-items')
        .send({ item_type: 'product', item_id: 5, display_order: 0 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 11, item_type: 'product', item_id: 5, display_order: 0 });
      expect(invalidateCache).toHaveBeenCalled();
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'featured_item_create',
          targetId: 11,
        })
      );
    });
  });

  describe('PUT /api/admin/featured-items-definitions/:id', () => {
    it('returns 404 when featured item does not exist', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/admin/featured-items-definitions/77')
        .send({ custom_title: 'New title' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Featured item not found' });
    });

    it('returns 400 when next referenced entity does not exist', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ item_type: 'product', item_id: 12 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/admin/featured-items-definitions/77')
        .send({ item_type: 'deal', item_id: 404 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Referenced deal does not exist' });
    });

    it('returns 400 when there are no update fields', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ item_type: 'product', item_id: 12 }] })
        .mockResolvedValueOnce({ rows: [{ id: 12 }] });

      const res = await request(app)
        .put('/api/admin/featured-items-definitions/77')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No fields to update' });
    });

    it('updates featured item definition', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ item_type: 'product', item_id: 12 }] })
        .mockResolvedValueOnce({ rows: [{ id: 12 }] })
        .mockResolvedValueOnce({ rows: [{ id: 77, custom_title: 'Updated' }] });

      const res = await request(app)
        .put('/api/admin/featured-items-definitions/77')
        .send({ custom_title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 77, custom_title: 'Updated' });
      expect(invalidateCache).toHaveBeenCalled();
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'featured_item_update',
          targetId: 77,
        })
      );
    });
  });

  describe('DELETE /api/admin/featured-items-definitions/:id', () => {
    it('returns 404 when featured item delete target is missing', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/admin/featured-items-definitions/70');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Featured item not found' });
    });

    it('deletes featured item definition successfully', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 70 }] });

      const res = await request(app).delete('/api/admin/featured-items-definitions/70');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Featured item deleted successfully' });
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'featured_item_delete',
          targetId: 70,
        })
      );
    });
  });

  describe('Featured list management', () => {
    it('creates featured list with transaction and list items', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // insert featured list
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // bulk exists products
        .mockResolvedValueOnce({}) // insert items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/admin/featured-lists')
        .send({
          list_name: 'Top picks',
          list_type: 'products',
          items: [{ item_type: 'product', item_id: 5 }],
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 100,
        message: 'Featured list created successfully',
      });
      expect(global.mockDb.pool.connect).toHaveBeenCalled();
      expect(global.mockDb.client.release).toHaveBeenCalled();
    });

    it('returns 400 when creating list with invalid item type for list', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // insert featured list
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app)
        .post('/api/admin/featured-lists')
        .send({
          list_name: 'Invalid',
          list_type: 'products',
          items: [{ item_type: 'deal', item_id: 9 }],
        });

      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('not allowed for list type');
      expect(global.mockDb.client.release).toHaveBeenCalled();
    });

    it('updates featured list metadata and items in a transaction', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ list_type: 'products' }] }) // select existing list
        .mockResolvedValueOnce({}) // update metadata
        .mockResolvedValueOnce({ rows: [{ id: 55 }] }) // bulk exists products
        .mockResolvedValueOnce({}) // delete existing items
        .mockResolvedValueOnce({}) // insert replacement items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .put('/api/admin/featured-lists/200')
        .send({
          list_name: 'Refreshed',
          items: [{ item_type: 'product', item_id: 55 }],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Featured list updated successfully' });
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'featured_list_update',
          targetId: 200,
        })
      );
    });

    it('returns 400 when adding list item with invalid type for list', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ list_type: 'deals' }] });

      const res = await request(app)
        .post('/api/admin/featured-lists/3/items')
        .send({ item_type: 'product', item_id: 1 });

      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('not allowed for list type');
    });

    it('adds list item successfully and returns 201', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ list_type: 'products' }] }) // select list
        .mockResolvedValueOnce({ rows: [{ id: 88 }] }) // ensure entity exists
        .mockResolvedValueOnce({
          rows: [{ id: 300, featured_list_id: 3, item_type: 'product', item_id: 88 }],
        });

      const res = await request(app)
        .post('/api/admin/featured-lists/3/items')
        .send({ item_type: 'product', item_id: 88, display_order: 2 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 300,
        featured_list_id: 3,
        item_type: 'product',
        item_id: 88,
      });
    });
  });
});
