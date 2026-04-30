const request = require('../utils/request');
const express = require('express');
const jwt = require('jsonwebtoken');

const { validateTelegramAuth } = require('../../middleware/authMiddleware');
const cartRoutes = require('../../routes/cart');

const createProtectedApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', validateTelegramAuth, cartRoutes);
  return app;
};

describe('Cart auth middleware integration', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_CUSTOMER_SECRET = '';
    app = createProtectedApp();
  });

  it('rejects requests without an access token', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Access token required.');
  });

  it('rejects refresh tokens on protected customer routes', async () => {
    const refreshToken = jwt.sign(
      { userId: 77, role: 'customer', type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('invalid token type');
  });

  it('rejects non-customer roles before reaching cart handlers', async () => {
    const adminAccessToken = jwt.sign(
      { adminId: 1, role: 'admin', type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('invalid token role');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('allows valid customer access tokens through validateTelegramAuth + requireCustomer stack', async () => {
    const accessToken = jwt.sign(
      { userId: 42, role: 'customer', type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(global.mockDb.query).toHaveBeenCalledTimes(1);
    expect(global.mockDb.query.mock.calls[0][1]).toEqual([42]);
  });
});
