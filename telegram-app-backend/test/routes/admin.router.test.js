jest.mock('../../middleware/authAdmin', () => jest.fn((req, _res, next) => next()));

jest.mock('../../routes/admin/adminSuppliers.routes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/mock-suppliers', (_req, res) => res.json({ source: 'suppliers' }));
  return router;
});

jest.mock('../../routes/admin/adminFeatured.routes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/mock-featured', (_req, res) => res.json({ source: 'featured' }));
  return router;
});

jest.mock('../../routes/admin/adminOps.routes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/mock-ops', (_req, res) => res.json({ source: 'ops' }));
  return router;
});

const express = require('express');
const request = require('../utils/request');
const authAdmin = require('../../middleware/authAdmin');
const adminRoutes = require('../../routes/admin');

const createApp = () => {
  const app = express();
  app.use('/api/admin', adminRoutes);
  return app;
};

describe('Admin router composition', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    authAdmin.mockClear();
    authAdmin.mockImplementation((req, _res, next) => next());
  });

  it('applies admin auth middleware to child routes', async () => {
    const suppliersRes = await request(app).get('/api/admin/mock-suppliers');
    const featuredRes = await request(app).get('/api/admin/mock-featured');
    const opsRes = await request(app).get('/api/admin/mock-ops');

    expect(suppliersRes.status).toBe(200);
    expect(featuredRes.status).toBe(200);
    expect(opsRes.status).toBe(200);
    expect(authAdmin).toHaveBeenCalledTimes(3);
  });

  it('short-circuits requests when auth middleware rejects', async () => {
    authAdmin.mockImplementationOnce((_req, res) => res.status(401).json({ error: 'blocked' }));

    const res = await request(app).get('/api/admin/mock-suppliers');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'blocked' });
  });
});
