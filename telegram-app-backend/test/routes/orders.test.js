const request = require('../utils/request');
const express = require('express');

// Mock auth middleware for orders tests
const mockAuthMiddleware = (req, res, next) => {
  req.user = { telegramId: 123456789, userId: 1 };
  next();
};

// Create a test app with mocked order routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const ordersRouter = express.Router();

  ordersRouter.post('/from-cart', mockAuthMiddleware, async (req, res) => {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items required' });
    }

    // Check stock - simulate with mock
    const stockCheck = await global.mockDb.query('stock');
    if (stockCheck.rows[0]?.insufficient) {
      return res.status(409).json({ error: 'Insufficient stock' });
    }

    // Check product exists
    const productCheck = await global.mockDb.query('product');
    if (!productCheck.rows[0]) {
      return res.status(400).json({ error: 'Product not found' });
    }

    // Check user profile
    const profileCheck = await global.mockDb.query('profile');
    if (!profileCheck.rows[0]) {
      return res.status(400).json({ error: 'User profile required' });
    }

    // Create order
    const orderResult = await global.mockDb.query('create');
    res.status(201).json({
      orderId: orderResult.rows[0].id,
      message: 'Order created successfully'
    });
  });

  ordersRouter.get('/', mockAuthMiddleware, async (req, res) => {
    const result = await global.mockDb.query();
    res.json(result.rows);
  });

  ordersRouter.put('/:orderId/status', mockAuthMiddleware, async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await global.mockDb.query();
    res.json({ ...result.rows[0], status });
  });

  app.use('/api/orders', ordersRouter);

  return app;
};

describe('Orders API', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = createTestApp();
  });

  describe('POST /api/orders/from-cart', () => {
    const mockOrderData = {
      items: [
        { product_id: 1, quantity: 2, price_at_time_of_order: 100 },
        { product_id: 2, quantity: 1, price_at_time_of_order: 200 }
      ],
      total_amount: 400
    };

    it('creates order successfully', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ stock_level: 10 }] }) // stock check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // product check
        .mockResolvedValueOnce({ rows: [{ address_line1: 'Test Address' }] }) // profile
        .mockResolvedValueOnce({ rows: [{ id: 123 }] }); // create order

      const response = await request(app)
        .post('/api/orders/from-cart')
        .send(mockOrderData);

      expect(response.status).toBe(201);
      expect(response.body.orderId).toBe(123);
      expect(response.body.message).toBe('Order created successfully');
    });

    it('rejects order with insufficient stock', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ insufficient: true }]
      });

      const response = await request(app)
        .post('/api/orders/from-cart')
        .send(mockOrderData);

      expect(response.status).toBe(409);
    });

    it('rejects order with missing products', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ stock_level: 10 }] })
        .mockResolvedValueOnce({ rows: [] }); // No product

      const response = await request(app)
        .post('/api/orders/from-cart')
        .send(mockOrderData);

      expect(response.status).toBe(400);
    });

    it('rejects order without user profile', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ stock_level: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }); // No profile

      const response = await request(app)
        .post('/api/orders/from-cart')
        .send(mockOrderData);

      expect(response.status).toBe(400);
    });

    it('rejects order with empty items', async () => {
      const response = await request(app)
        .post('/api/orders/from-cart')
        .send({ items: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('returns user orders', async () => {
      const mockOrders = [
        { id: 1, total_amount: 100, status: 'pending', items: [] }
      ];

      global.mockDb.query.mockResolvedValueOnce({ rows: mockOrders });

      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrders);
    });
  });

  describe('PUT /api/orders/:orderId/status', () => {
    it('updates order status to cancelled', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 123456789 }]
      });

      const response = await request(app)
        .put('/api/orders/1/status')
        .send({ status: 'cancelled' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('rejects invalid status updates', async () => {
      const response = await request(app)
        .put('/api/orders/1/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });
});