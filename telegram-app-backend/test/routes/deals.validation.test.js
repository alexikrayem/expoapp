const request = require('../utils/request');
const express = require('express');

const dealsRoutes = require('../../routes/deals');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/deals', dealsRoutes);
  return app;
};

describe('Deals route validation', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects invalid cityId in deals list filter', async () => {
    const res = await request(app)
      .get('/api/deals')
      .query({ cityId: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('rejects invalid deal id', async () => {
    const res = await request(app).get('/api/deals/abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('accepts valid cityId and runs parameterized query', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/deals')
      .query({ cityId: 12 });

    expect(res.status).toBe(200);
    expect(global.mockDb.query).toHaveBeenCalledTimes(1);
    expect(global.mockDb.query.mock.calls[0][1]).toEqual([12]);
  });
});
