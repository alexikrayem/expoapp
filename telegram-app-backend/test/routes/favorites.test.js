jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require('express');
const request = require('../utils/request');
const favoritesRoutes = require('../../routes/favorites');
const logger = require('../../services/logger');

const createApp = (user) => {
  const app = express();
  app.use(express.json());
  if (user !== undefined) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.use('/api/favorites', favoritesRoutes);
  return app;
};

describe('Favorites Routes', () => {
  beforeEach(() => {
    global.mockDb.reset();
    logger.error.mockReset();
  });

  it('returns 401 when user is not authenticated', async () => {
    const app = createApp(undefined);

    const res = await request(app).get('/api/favorites');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required.');
  });

  it('returns 403 when authenticated user is not a customer', async () => {
    const app = createApp({ userId: 7, role: 'supplier' });

    const res = await request(app).get('/api/favorites');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden: invalid user role.');
  });

  describe('GET /api/favorites', () => {
    it('returns product ids for the current user', async () => {
      const app = createApp({ userId: 22, role: 'customer' });
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ product_id: 5 }, { product_id: 12 }],
      });

      const res = await request(app).get('/api/favorites');

      expect(res.status).toBe(200);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        'SELECT product_id FROM user_favorites WHERE user_id = $1',
        [22]
      );
      expect(res.body).toEqual({ favorite_ids: [5, 12] });
    });

    it('returns 500 when database query fails', async () => {
      const app = createApp({ userId: 22, role: 'customer' });
      global.mockDb.query.mockRejectedValueOnce(new Error('db read failed'));

      const res = await request(app).get('/api/favorites');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch favorites' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching favorites',
        expect.any(Error)
      );
    });
  });

  describe('POST /api/favorites', () => {
    it('validates product id payload', async () => {
      const app = createApp({ userId: 88, role: 'customer' });

      const res = await request(app)
        .post('/api/favorites')
        .send({ productId: -3 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(global.mockDb.query).not.toHaveBeenCalled();
    });

    it('adds item to favorites with idempotent insert', async () => {
      const app = createApp({ userId: 88, role: 'customer' });
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/favorites')
        .send({ productId: 123 });

      expect(res.status).toBe(201);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO user_favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING',
        [88, 123]
      );
      expect(res.body).toEqual({ message: 'Added to favorites successfully' });
    });

    it('returns 500 when add-to-favorites query fails', async () => {
      const app = createApp({ userId: 88, role: 'customer' });
      global.mockDb.query.mockRejectedValueOnce(new Error('db insert failed'));

      const res = await request(app)
        .post('/api/favorites')
        .send({ productId: 123 });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to add to favorites' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error adding to favorites',
        expect.any(Error)
      );
    });
  });

  describe('DELETE /api/favorites/:productId', () => {
    it('validates delete params', async () => {
      const app = createApp({ userId: 3, role: 'customer' });

      const res = await request(app).delete('/api/favorites/not-a-number');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(global.mockDb.query).not.toHaveBeenCalled();
    });

    it('deletes favorite and returns 204', async () => {
      const app = createApp({ userId: 3, role: 'customer' });
      global.mockDb.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app).delete('/api/favorites/77');

      expect(res.status).toBe(204);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_favorites WHERE user_id = $1 AND product_id = $2',
        [3, '77']
      );
    });

    it('returns 500 when deletion fails', async () => {
      const app = createApp({ userId: 3, role: 'customer' });
      global.mockDb.query.mockRejectedValueOnce(new Error('db delete failed'));

      const res = await request(app).delete('/api/favorites/77');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to remove from favorites' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error removing from favorites',
        expect.any(Error)
      );
    });
  });
});
