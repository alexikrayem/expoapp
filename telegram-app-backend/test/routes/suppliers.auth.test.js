const request = require('../utils/request');
const express = require('express');

const supplierRoutes = require('../../routes/suppliers');
const cityRoutes = require('../../routes/cities');

const buildApp = () => {
  const app = express();
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/cities', cityRoutes);
  return app;
};

describe('Supplier route access and PII minimization', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('blocks non-public supplier endpoints without auth', async () => {
    const res = await request(app).get('/api/suppliers/profile');
    expect(res.status).toBe(401);
  });

  it('does not include sensitive columns in suppliers list query', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/suppliers');
    expect(res.status).toBe(200);

    const sql = global.mockDb.query.mock.calls[0][0];
    expect(sql).not.toMatch(/password_hash/i);
    expect(sql).not.toMatch(/email/i);
  });

  it('does not include sensitive columns in city suppliers query', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/cities/1/suppliers');
    expect(res.status).toBe(200);

    const sql = global.mockDb.query.mock.calls[0][0];
    expect(sql).not.toMatch(/password_hash/i);
    expect(sql).not.toMatch(/email/i);
  });
});
