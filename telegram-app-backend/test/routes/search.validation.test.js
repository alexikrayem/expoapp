const request = require('../utils/request');
const express = require('express');

jest.mock('../../services/searchService', () => ({
  searchCatalog: jest.fn().mockResolvedValue({
    results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] }
  })
}));

const searchRoutes = require('../../routes/search');

const buildApp = () => {
  const app = express();
  app.use('/api/search', searchRoutes);
  return app;
};

describe('Search route validation', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects invalid limit values', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ searchTerm: 'mask', limit: 200 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('accepts valid search parameters', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ searchTerm: 'mask', limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.results.products.totalItems).toBe(0);
  });
});
