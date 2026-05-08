jest.mock('../../middleware/authSupplier', () =>
  jest.fn((req, _res, next) => {
    req.supplier = { supplierId: 88, role: 'supplier' };
    next();
  })
);

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/passwordPolicy', () => ({
  validatePassword: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('../../services/tokenService', () => ({
  revokeAllForSubject: jest.fn(),
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
const bcrypt = require('bcrypt');
const { validatePassword } = require('../../services/passwordPolicy');
const { revokeAllForSubject } = require('../../services/tokenService');
const { recordAuditEvent } = require('../../services/auditService');
const logger = require('../../services/logger');
const supplierAgentsRoutes = require('../../routes/suppliers/supplierAgents.routes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/supplier', supplierAgentsRoutes);
  return app;
};

describe('supplierAgents routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    validatePassword.mockReset();
    validatePassword.mockReturnValue([]);
    bcrypt.hash.mockReset();
    bcrypt.hash.mockResolvedValue('hashed-agent-password');
    revokeAllForSubject.mockReset();
    recordAuditEvent.mockReset();
    logger.error.mockReset();
  });

  describe('GET /api/supplier/delivery-agents', () => {
    it('returns supplier delivery agents', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, full_name: 'Agent One' }],
      });

      const res = await request(app).get('/api/supplier/delivery-agents');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [{ id: 1, full_name: 'Agent One' }] });
    });
  });

  describe('POST /api/supplier/delivery-agents', () => {
    it('returns 400 for password policy failures', async () => {
      validatePassword.mockReturnValueOnce(['Password must include a symbol']);

      const res = await request(app)
        .post('/api/supplier/delivery-agents')
        .send({
          full_name: 'Agent Two',
          phone_number: '+963912000000',
          password: 'weakpass',
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Password does not meet requirements',
        details: ['Password must include a symbol'],
      });
    });

    it('returns 409 when phone number already exists', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 3 }] });

      const res = await request(app)
        .post('/api/supplier/delivery-agents')
        .send({
          full_name: 'Agent Two',
          phone_number: '+963912000000',
          password: 'ValidPass1!',
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Phone number already exists' });
    });

    it('creates a delivery agent and emits audit event', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 4, full_name: 'Agent Four', phone_number: '+963911111111' }],
        });

      const res = await request(app)
        .post('/api/supplier/delivery-agents')
        .send({
          full_name: 'Agent Four',
          phone_number: '+963911111111',
          password: 'ValidPass1!',
          is_active: true,
        });

      expect(res.status).toBe(201);
      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPass1!', expect.any(Number));
      expect(res.body).toEqual({
        id: 4,
        full_name: 'Agent Four',
        phone_number: '+963911111111',
      });
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delivery_agent_create',
          actorId: 88,
          targetId: 4,
        })
      );
    });
  });

  describe('PUT /api/supplier/delivery-agents/:id', () => {
    it('returns 404 when agent is not owned by supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/supplier/delivery-agents/12')
        .send({ full_name: 'Renamed' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Delivery agent not found or not owned by you' });
    });

    it('returns 400 when there are no fields to update', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 12 }] });

      const res = await request(app)
        .put('/api/supplier/delivery-agents/12')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No fields to update' });
    });

    it('updates agent and revokes sessions when deactivated', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 12 }] }) // verify
        .mockResolvedValueOnce({
          rows: [{ id: 12, full_name: 'Updated Agent', is_active: false }],
        }); // update

      const res = await request(app)
        .put('/api/supplier/delivery-agents/12')
        .send({ full_name: 'Updated Agent', is_active: false });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 12, full_name: 'Updated Agent', is_active: false });
      expect(revokeAllForSubject).toHaveBeenCalledWith(12, 'delivery_agent');
    });
  });

  describe('DELETE /api/supplier/delivery-agents/:id', () => {
    it('returns 400 when agent has active deliveries', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 8 }] }) // verify
        .mockResolvedValueOnce({ rows: [{ active_count: '2' }] }); // active deliveries

      const res = await request(app).delete('/api/supplier/delivery-agents/8');

      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('Cannot delete agent with active deliveries');
    });

    it('deletes agent and revokes subject sessions', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 8 }] }) // verify
        .mockResolvedValueOnce({ rows: [{ active_count: '0' }] }) // active deliveries
        .mockResolvedValueOnce({}); // delete

      const res = await request(app).delete('/api/supplier/delivery-agents/8');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Delivery agent deleted successfully' });
      expect(revokeAllForSubject).toHaveBeenCalledWith(8, 'delivery_agent');
    });
  });

  describe('PUT /api/supplier/delivery-agents/:id/toggle-active', () => {
    it('toggles active status and revokes when toggled inactive', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 6, is_active: true }] }) // verify
        .mockResolvedValueOnce({
          rows: [{ id: 6, full_name: 'Agent Six', is_active: false }],
        }); // update

      const res = await request(app).put('/api/supplier/delivery-agents/6/toggle-active');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 6, full_name: 'Agent Six', is_active: false });
      expect(revokeAllForSubject).toHaveBeenCalledWith(6, 'delivery_agent');
    });

    it('returns 500 when toggle query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('toggle failed'));

      const res = await request(app).put('/api/supplier/delivery-agents/6/toggle-active');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to toggle agent status' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error toggling delivery agent status',
        expect.any(Error)
      );
    });
  });
});
