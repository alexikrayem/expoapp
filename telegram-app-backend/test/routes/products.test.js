const request = require('supertest')
const app = require('../../server')

describe('Products API', () => {
  beforeEach(() => {
    global.mockDb.reset()
  })

  describe('GET /api/products', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100, supplier_name: 'Supplier 1' },
        { id: 2, name: 'Product 2', price: 200, supplier_name: 'Supplier 2' }
      ]
      
      global.mockDb.query
        .mockResolvedValueOnce({ rows: mockProducts }) // Products query
        .mockResolvedValueOnce({ rows: [{ total: 2 }] }) // Count query

      const response = await request(app)
        .get('/api/products')
        .expect(200)

      expect(response.body).toEqual({
        items: mockProducts,
        currentPage: 1,
        totalPages: 1
      })
    })

    it('should filter products by city', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0 }] })

      await request(app)
        .get('/api/products?cityId=1')
        .expect(200)

      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('supplier_cities'),
        expect.arrayContaining(['1'])
      )
    })

    it('should filter products by category', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0 }] })

      await request(app)
        .get('/api/products?category=medicine')
        .expect(200)

      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('p.category = $'),
        expect.arrayContaining(['medicine'])
      )
    })

    it('should handle search terms', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0 }] })

      await request(app)
        .get('/api/products?searchTerm=aspirin')
        .expect(200)

      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%aspirin%'])
      )
    })
  })

  describe('GET /api/products/:id', () => {
    it('should return single product', async () => {
      const mockProduct = { id: 1, name: 'Product 1', price: 100 }
      global.mockDb.query.mockResolvedValueOnce({ rows: [mockProduct] })

      const response = await request(app)
        .get('/api/products/1')
        .expect(200)

      expect(response.body).toEqual(mockProduct)
    })

    it('should return 404 for non-existent product', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      await request(app)
        .get('/api/products/999')
        .expect(404)
    })

    it('should return 400 for invalid product ID', async () => {
      await request(app)
        .get('/api/products/invalid')
        .expect(400)
    })
  })
})