const request = require('supertest')
const app = require('../../server')

describe('Orders API', () => {
  beforeEach(() => {
    global.mockDb.reset()
  })

  describe('POST /api/orders/from-cart', () => {
    const mockOrderData = {
      items: [
        { product_id: 1, quantity: 2, price_at_time_of_order: 100 },
        { product_id: 2, quantity: 1, price_at_time_of_order: 200 }
      ],
      total_amount: 400
    }

    const mockTelegramHeaders = {
      'X-Telegram-Init-Data': 'user=%7B%22id%22%3A123456789%7D&hash=test_hash'
    }

    it('should create order successfully', async () => {
      // Mock product verification
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, stock_level: 10, supplier_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, stock_level: 5, supplier_id: 1 }] })
        // Mock user profile
        .mockResolvedValueOnce({ rows: [{ user_id: 123456789, address_line1: 'Test Address' }] })
        // Mock order creation
        .mockResolvedValueOnce({ rows: [{ id: 123 }] })
        // Mock order items creation (2 calls)
        .mockResolvedValue({ rows: [] })

      const response = await request(app)
        .post('/api/orders/from-cart')
        .set(mockTelegramHeaders)
        .send(mockOrderData)
        .expect(201)

      expect(response.body).toEqual({
        orderId: 123,
        message: 'Order created successfully'
      })
    })

    it('should reject order with insufficient stock', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, stock_level: 1, supplier_id: 1 }] }) // Insufficient stock

      await request(app)
        .post('/api/orders/from-cart')
        .set(mockTelegramHeaders)
        .send(mockOrderData)
        .expect(409)
    })

    it('should reject order with missing products', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Product not found

      await request(app)
        .post('/api/orders/from-cart')
        .set(mockTelegramHeaders)
        .send(mockOrderData)
        .expect(400)
    })

    it('should reject order without user profile', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, stock_level: 10, supplier_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, stock_level: 5, supplier_id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // No user profile

      await request(app)
        .post('/api/orders/from-cart')
        .set(mockTelegramHeaders)
        .send(mockOrderData)
        .expect(400)
    })
  })

  describe('GET /api/orders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        { id: 1, total_amount: 100, status: 'pending', items: [] }
      ]
      
      global.mockDb.query.mockResolvedValueOnce({ rows: mockOrders })

      const response = await request(app)
        .get('/api/orders')
        .set('X-Telegram-Init-Data', 'user=%7B%22id%22%3A123456789%7D&hash=test_hash')
        .expect(200)

      expect(response.body).toEqual(mockOrders)
    })
  })

  describe('PUT /api/orders/:orderId/status', () => {
    it('should update order status to cancelled', async () => {
      const mockOrder = { id: 1, user_id: 123456789, status: 'pending' }
      const mockOrderItems = [{ product_id: 1, quantity: 2 }]
      
      global.mockDb.client.query
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Verify order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Get order items
        .mockResolvedValue({ rows: [] }) // Stock updates and status update

      const response = await request(app)
        .put('/api/orders/1/status')
        .set('X-Telegram-Init-Data', 'user=%7B%22id%22%3A123456789%7D&hash=test_hash')
        .send({ status: 'cancelled' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
    })

    it('should reject invalid status updates', async () => {
      await request(app)
        .put('/api/orders/1/status')
        .set('X-Telegram-Init-Data', 'user=%7B%22id%22%3A123456789%7D&hash=test_hash')
        .send({ status: 'invalid_status' })
        .expect(400)
    })
  })
})