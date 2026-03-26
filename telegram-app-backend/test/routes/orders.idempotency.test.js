const request = require('../utils/request');
const express = require('express');

const ordersRoutes = require('../../routes/orders');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { userId: 1, role: 'customer' };
    next();
  });
  app.use('/api/orders', ordersRoutes);
  return app;
};

describe('Orders idempotency enforcement', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('requires Idempotency-Key for POST /api/orders/from-cart', async () => {
    const res = await request(app)
      .post('/api/orders/from-cart')
      .send({ items: [{ product_id: 1, quantity: 1, price_at_time_of_order: 10 }], total_amount: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Idempotency-Key header is required');
  });
});
