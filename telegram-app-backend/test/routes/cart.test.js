const request = require('supertest')
const app = require('../../server')

describe('Cart API (Legacy - Should be Deprecated)', () => {
  const mockTelegramHeaders = {
    'X-Telegram-Init-Data': 'user=%7B%22id%22%3A123456789%7D&hash=test_hash'
  }

  beforeEach(() => {
    global.mockDb.reset()
  })

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .get('/api/cart')
        .set(mockTelegramHeaders)
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should return cart items with product details', async () => {
      const mockCartItems = [
        {
          product_id: 1,
          quantity: 2,
          name: 'Product 1',
          price: 100,
          effective_selling_price: 100,
          supplier_name: 'Supplier 1'
        }
      ]

      global.mockDb.query.mockResolvedValueOnce({ rows: mockCartItems })

      const response = await request(app)
        .get('/api/cart')
        .set(mockTelegramHeaders)
        .expect(200)

      expect(response.body).toEqual(mockCartItems)
    })
  })

  describe('POST /api/cart/items', () => {
    it('should add new item to cart', async () => {
      const mockCartItem = { product_id: 1, quantity: 1 }
      global.mockDb.query.mockResolvedValueOnce({ rows: [mockCartItem] })

      const response = await request(app)
        .post('/api/cart/items')
        .set(mockTelegramHeaders)
        .send({ productId: 1, quantity: 1 })
        .expect(200)

      expect(response.body).toEqual(mockCartItem)
    })

    it('should reject missing product ID', async () => {
      await request(app)
        .post('/api/cart/items')
        .set(mockTelegramHeaders)
        .send({})
        .expect(400)
    })
  })

  describe('DELETE /api/cart/items/:productId', () => {
    it('should remove item from cart', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      await request(app)
        .delete('/api/cart/items/1')
        .set(mockTelegramHeaders)
        .expect(204)
    })
  })
})