const request = require('../utils/request');
const express = require('express');

const authSupplier = require('../../middleware/authSupplier');
const authDeliveryAgent = require('../../middleware/authDeliveryAgent');
const { signJwt } = require('../../services/jwtService');

const buildApp = (middleware) => {
  const app = express();
  app.get('/test', middleware, (req, res) => res.json({ ok: true }));
  return app;
};

describe('Auth middleware account status enforcement', () => {
  beforeAll(() => {
    process.env.JWT_SUPPLIER_SECRET = 'test_supplier_secret';
    process.env.JWT_DELIVERY_SECRET = 'test_delivery_secret';
  });

  beforeEach(() => {
    global.mockDb.reset();
  });

  describe('authSupplier', () => {
    it('blocks inactive supplier accounts', async () => {
      const token = signJwt(
        { supplierId: 11, role: 'supplier', type: 'access' },
        process.env.JWT_SUPPLIER_SECRET
      );

      global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: false }] });

      const app = buildApp(authSupplier);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Supplier account is inactive.');
    });

    it('allows active supplier accounts', async () => {
      const token = signJwt(
        { supplierId: 12, role: 'supplier', type: 'access' },
        process.env.JWT_SUPPLIER_SECRET
      );

      global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: true }] });

      const app = buildApp(authSupplier);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('authDeliveryAgent', () => {
    it('blocks inactive delivery agents', async () => {
      const token = signJwt(
        { deliveryAgentId: 21, role: 'delivery_agent', type: 'access' },
        process.env.JWT_DELIVERY_SECRET
      );

      global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: false }] });

      const app = buildApp(authDeliveryAgent);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Delivery agent account is inactive.');
    });

    it('allows active delivery agents', async () => {
      const token = signJwt(
        { deliveryAgentId: 22, role: 'delivery_agent', type: 'access' },
        process.env.JWT_DELIVERY_SECRET
      );

      global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: true }] });

      const app = buildApp(authDeliveryAgent);
      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
