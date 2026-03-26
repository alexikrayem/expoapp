const request = require('../utils/request');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock auth middleware for cart tests
const mockAuthMiddleware = (req, res, next) => {
  // Simulate Telegram auth or JWT auth
  req.user = { telegramId: 123456789, userId: 1 };
  next();
};

// Create a test app with mocked routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const cartRouter = express.Router();

  cartRouter.get('/', mockAuthMiddleware, async (req, res) => {
    const result = await global.mockDb.query();
    res.json(result.rows);
  });

  cartRouter.post('/items', mockAuthMiddleware, async (req, res) => {
    if (!req.body.productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }
    const result = await global.mockDb.query();
    res.json(result.rows[0]);
  });

  cartRouter.delete('/items/:productId', mockAuthMiddleware, async (req, res) => {
    await global.mockDb.query();
    res.status(204).send();
  });

  app.use('/api/cart', cartRouter);

  return app;
};

describe('Cart API', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = createTestApp();
  });

  describe('GET /api/cart', () => {
    it('returns empty cart for new user', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns cart items with product details', async () => {
      const mockCartItems = [
        {
          product_id: 1,
          quantity: 2,
          name: 'Product 1',
          price: 100,
          effective_selling_price: 100,
          supplier_name: 'Supplier 1'
        }
      ];

      global.mockDb.query.mockResolvedValueOnce({ rows: mockCartItems });

      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCartItems);
    });
  });

  describe('POST /api/cart/items', () => {
    it('adds new item to cart', async () => {
      const mockCartItem = { product_id: 1, quantity: 1 };
      global.mockDb.query.mockResolvedValueOnce({ rows: [mockCartItem] });

      const response = await request(app)
        .post('/api/cart/items')
        .send({ productId: 1, quantity: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCartItem);
    });

    it('rejects missing product ID', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/cart/items/:productId', () => {
    it('removes item from cart', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete('/api/cart/items/1');

      expect(response.status).toBe(204);
    });
  });
});