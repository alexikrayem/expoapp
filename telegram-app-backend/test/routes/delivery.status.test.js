const request = require('../utils/request');
const express = require('express');

const deliveryRoutes = require('../../routes/delivery');
const { signJwt } = require('../../services/jwtService');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/delivery', deliveryRoutes);
  return app;
};

describe('Delivery route status validation', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_DELIVERY_SECRET = 'test_delivery_secret';
  });

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects invalid delivery status updates', async () => {
    const token = signJwt(
      { deliveryAgentId: 33, role: 'delivery_agent', type: 'access' },
      process.env.JWT_DELIVERY_SECRET
    );

    global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: true }] });

    const res = await request(app)
      .put('/api/delivery/order-items/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ newStatus: 'not-a-status' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});
