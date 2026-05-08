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

jest.mock('../../services/passwordPolicy', () => ({
  validatePassword: jest.fn(),
}));

jest.mock('../../routes/admin.helpers', () => ({
  revokeSupplierSessions: jest.fn(),
}));

jest.mock('../../services/searchIndexer', () => ({
  indexSupplierById: jest.fn(),
  reindexProductsBySupplierId: jest.fn(),
  reindexDealsBySupplierId: jest.fn(),
  deleteProductsBySupplierId: jest.fn(),
  deleteDealsBySupplierId: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
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
  ADMIN_CACHE_KEYS: ['products:list', 'suppliers:list'],
  FEATURED_CACHE_KEYS: [],
  FEATURED_LIST_CACHE_KEYS: [],
}));

const express = require('express');
const request = require('../utils/request');
const bcrypt = require('bcrypt');
const logger = require('../../services/logger');
const { invalidateCache } = require('../../middleware/cache');
const { recordAuditEvent } = require('../../services/auditService');
const { validatePassword } = require('../../services/passwordPolicy');
const { revokeSupplierSessions } = require('../../routes/admin.helpers');
const {
  indexSupplierById,
  reindexProductsBySupplierId,
  reindexDealsBySupplierId,
  deleteProductsBySupplierId,
  deleteDealsBySupplierId,
} = require('../../services/searchIndexer');
const adminSuppliersRoutes = require('../../routes/admin/adminSuppliers.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { adminId: 500, role: 'admin' };
    next();
  });
  app.use('/api/admin', adminSuppliersRoutes);
  return app;
};

describe('adminSuppliers routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    bcrypt.hash.mockReset();
    validatePassword.mockReset();
    revokeSupplierSessions.mockReset();
    indexSupplierById.mockReset();
    reindexProductsBySupplierId.mockReset();
    reindexDealsBySupplierId.mockReset();
    deleteProductsBySupplierId.mockReset();
    deleteDealsBySupplierId.mockReset();
    invalidateCache.mockReset();
    recordAuditEvent.mockReset();
    logger.error.mockReset();

    validatePassword.mockReturnValue([]);
    bcrypt.hash.mockResolvedValue('hashed-password');
  });

  describe('GET /api/admin/suppliers', () => {
    it('returns supplier items list', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Supplier A', product_count: '2', pending_orders: '1' }],
      });

      const res = await request(app).get('/api/admin/suppliers');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [{ id: 1, name: 'Supplier A', product_count: '2', pending_orders: '1' }],
      });
    });

    it('returns 500 when listing suppliers fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('supplier query failed'));

      const res = await request(app).get('/api/admin/suppliers');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch suppliers' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching suppliers for admin',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/admin/suppliers', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/admin/suppliers')
        .send({ email: 'missing-fields@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Name, email, password, and category are required',
      });
    });

    it('returns 400 when password policy fails', async () => {
      validatePassword.mockReturnValueOnce(['Password must include a symbol']);

      const res = await request(app)
        .post('/api/admin/suppliers')
        .send({
          name: 'Supplier',
          email: 'supplier@example.com',
          password: 'weakpass',
          category: 'Medical',
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Password does not meet requirements',
        details: ['Password must include a symbol'],
      });
    });

    it('returns 409 when supplier email already exists', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 33 }] });

      const res = await request(app)
        .post('/api/admin/suppliers')
        .send({
          name: 'Supplier',
          email: 'supplier@example.com',
          password: 'ValidPass1!',
          category: 'Medical',
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Email already exists' });
    });

    it('creates supplier, removes password hash from response, and triggers side effects', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 77,
            name: 'Supplier Z',
            email: 'supplierz@example.com',
            password_hash: 'secret',
            is_active: true,
          }],
        });

      const res = await request(app)
        .post('/api/admin/suppliers')
        .send({
          name: 'Supplier Z',
          email: 'SupplierZ@example.com',
          password: 'ValidPass1!',
          category: 'Medical',
          location: 'Damascus',
        });

      expect(res.status).toBe(201);
      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPass1!', expect.any(Number));
      expect(res.body.password_hash).toBeUndefined();
      expect(res.body.email).toBe('supplierz@example.com');
      expect(invalidateCache).toHaveBeenCalled();
      expect(indexSupplierById).toHaveBeenCalledWith(77);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_create',
          actorId: 500,
          targetId: 77,
        })
      );
      expect(revokeSupplierSessions).not.toHaveBeenCalled();
    });

    it('revokes sessions when newly created supplier is inactive', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 88,
            name: 'Supplier Inactive',
            email: 'inactive@example.com',
            password_hash: 'secret',
            is_active: false,
          }],
        });

      const res = await request(app)
        .post('/api/admin/suppliers')
        .send({
          name: 'Supplier Inactive',
          email: 'inactive@example.com',
          password: 'ValidPass1!',
          category: 'Medical',
          is_active: false,
        });

      expect(res.status).toBe(201);
      expect(revokeSupplierSessions).toHaveBeenCalledWith(88);
    });
  });

  describe('PUT /api/admin/suppliers/:id', () => {
    it('returns 400 when no update fields are provided', async () => {
      const res = await request(app)
        .put('/api/admin/suppliers/10')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No fields to update' });
    });

    it('returns 404 when supplier to update is not found', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/admin/suppliers/10')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Supplier not found' });
    });

    it('updates supplier and triggers reindex/audit side effects', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 10,
          name: 'Updated Name',
          email: 'updated@example.com',
          is_active: false,
          password_hash: 'secret',
        }],
      });

      const res = await request(app)
        .put('/api/admin/suppliers/10')
        .send({ name: 'Updated Name', is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.password_hash).toBeUndefined();
      expect(indexSupplierById).toHaveBeenCalledWith(10);
      expect(reindexProductsBySupplierId).toHaveBeenCalledWith(10);
      expect(reindexDealsBySupplierId).toHaveBeenCalledWith(10);
      expect(revokeSupplierSessions).toHaveBeenCalledWith(10);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_update',
          targetId: 10,
        })
      );
    });
  });

  describe('PUT /api/admin/suppliers/:id/toggle-active', () => {
    it('returns 404 when supplier is missing', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).put('/api/admin/suppliers/5/toggle-active');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Supplier not found' });
    });

    it('toggles active status and returns supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 5,
          name: 'Supplier',
          is_active: false,
          password_hash: 'secret',
        }],
      });

      const res = await request(app).put('/api/admin/suppliers/5/toggle-active');

      expect(res.status).toBe(200);
      expect(res.body.password_hash).toBeUndefined();
      expect(indexSupplierById).toHaveBeenCalledWith(5);
      expect(reindexProductsBySupplierId).toHaveBeenCalledWith(5);
      expect(reindexDealsBySupplierId).toHaveBeenCalledWith(5);
    });
  });

  describe('DELETE /api/admin/suppliers/:id', () => {
    it('returns 400 when supplier has existing products/orders', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ product_count: '1', order_count: '0' }],
      });

      const res = await request(app).delete('/api/admin/suppliers/7');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot delete supplier');
    });

    it('returns 404 when supplier delete target does not exist', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ product_count: '0', order_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/admin/suppliers/7');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Supplier not found' });
    });

    it('deletes supplier and runs cleanup/indexing side effects', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ product_count: '0', order_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 7 }] });

      const res = await request(app).delete('/api/admin/suppliers/7');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Supplier deleted successfully' });
      expect(revokeSupplierSessions).toHaveBeenCalledWith('7');
      expect(indexSupplierById).toHaveBeenCalledWith('7');
      expect(deleteProductsBySupplierId).toHaveBeenCalledWith('7');
      expect(deleteDealsBySupplierId).toHaveBeenCalledWith('7');
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_delete',
          targetId: 7,
        })
      );
    });

    it('returns 500 when supplier deletion throws', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('delete query failed'));

      const res = await request(app).delete('/api/admin/suppliers/7');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to delete supplier' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting supplier',
        expect.any(Error)
      );
    });
  });
});
