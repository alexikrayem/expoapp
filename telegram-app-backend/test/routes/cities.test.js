jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require('express');
const request = require('../utils/request');
const citiesRoutes = require('../../routes/cities');
const logger = require('../../services/logger');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cities', citiesRoutes);
  return app;
};

describe('Cities Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    logger.error.mockReset();
  });

  describe('GET /api/cities', () => {
    it('returns active cities list', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Damascus' },
          { id: 2, name: 'Aleppo' },
        ],
      });

      const res = await request(app).get('/api/cities');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        'SELECT id, name, created_at, updated_at FROM cities WHERE is_active = true ORDER BY name ASC LIMIT 1000'
      );
    });

    it('returns 500 when city query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('cities query failed'));

      const res = await request(app).get('/api/cities');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch cities' });
      expect(logger.error).toHaveBeenCalledWith('Error fetching cities', expect.any(Error));
    });
  });

  describe('GET /api/cities/:cityId/suppliers', () => {
    it('returns 400 for invalid city id', async () => {
      const res = await request(app).get('/api/cities/not-a-number/suppliers');

      expect(res.status).toBe(400);
      expect(global.mockDb.query).not.toHaveBeenCalled();
    });

    it('returns suppliers for a valid city id', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 10, name: 'Supplier A', product_count: '5' }],
      });

      const res = await request(app).get('/api/cities/7/suppliers');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 10, name: 'Supplier A', product_count: '5' }]);
      expect(global.mockDb.query).toHaveBeenCalledWith(expect.any(String), ['7']);
    });
  });

  describe('GET /api/cities/:cityId/deals', () => {
    it('returns deals for a valid city id', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 101, title: 'Weekly Offer' }],
      });

      const res = await request(app).get('/api/cities/7/deals');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 101, title: 'Weekly Offer' }]);
      expect(global.mockDb.query).toHaveBeenCalledWith(expect.any(String), ['7']);
    });

    it('returns 500 when deals query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('deals query failed'));

      const res = await request(app).get('/api/cities/7/deals');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch deals' });
      expect(logger.error).toHaveBeenCalledWith('Error fetching deals', expect.any(Error));
    });
  });
});
