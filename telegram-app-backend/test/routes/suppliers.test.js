const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../server')

describe('Suppliers API', () => {
  beforeEach(() => {
    global.mockDb.reset()
  })

  describe('GET /api/suppliers', () => {
    it('should return all active suppliers', async () => {
      const mockSuppliers = [
        { id: 1, name: 'Supplier 1', category: 'Medicine', product_count: 5 },
        { id: 2, name: 'Supplier 2', category: 'Equipment', product_count: 3 }
      ]

      global.mockDb.query.mockResolvedValueOnce({ rows: mockSuppliers })

      const response = await request(app)
        .get('/api/suppliers')
        .expect(200)

      expect(response.body).toEqual(mockSuppliers)
    })

    it('should filter suppliers by city', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      await request(app)
        .get('/api/suppliers?cityId=1')
        .expect(200)

      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('city_id = $1'),
        ['1']
      )
    })
  })

  describe('GET /api/suppliers/:id', () => {
    it('should return supplier with products', async () => {
      const mockSupplier = { id: 1, name: 'Supplier 1', is_active: true }
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100 }
      ]

      global.mockDb.query
        .mockResolvedValueOnce({ rows: [mockSupplier] })
        .mockResolvedValueOnce({ rows: mockProducts })

      const response = await request(app)
        .get('/api/suppliers/1')
        .expect(200)

      expect(response.body.name).toBe('Supplier 1')
      expect(response.body.products).toEqual(mockProducts)
    })

    it('should return 404 for non-existent supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] })

      await request(app)
        .get('/api/suppliers/999')
        .expect(404)
    })
  })

  describe('Authenticated Supplier Routes', () => {
    const supplierToken = jwt.sign(
      { supplierId: 1, email: 'supplier@test.com', role: 'supplier' },
      process.env.JWT_SECRET
    )

    describe('GET /api/supplier/products', () => {
      it('should return supplier products', async () => {
        const mockProducts = [
          { id: 1, name: 'Product 1', supplier_id: 1 }
        ]

        global.mockDb.query.mockResolvedValueOnce({ rows: mockProducts })

        const response = await request(app)
          .get('/api/supplier/products')
          .set('Authorization', `Bearer ${supplierToken}`)
          .expect(200)

        expect(response.body).toEqual(mockProducts)
      })

      it('should reject unauthorized access', async () => {
        await request(app)
          .get('/api/supplier/products')
          .expect(401)
      })
    })

    describe('POST /api/supplier/products', () => {
      const validProductData = {
        name: 'New Product',
        standardized_name_input: 'new-product',
        price: 100,
        category: 'Medicine',
        stock_level: 10
      }

      it('should create product successfully', async () => {
        const mockCreatedProduct = { id: 1, ...validProductData, supplier_id: 1 }
        global.mockDb.query.mockResolvedValueOnce({ rows: [mockCreatedProduct] })

        const response = await request(app)
          .post('/api/supplier/products')
          .set('Authorization', `Bearer ${supplierToken}`)
          .send(validProductData)
          .expect(201)

        expect(response.body).toEqual(mockCreatedProduct)
      })

      it('should reject invalid product data', async () => {
        await request(app)
          .post('/api/supplier/products')
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ name: '' }) // Missing required fields
          .expect(400)
      })
    })

    describe('PUT /api/supplier/products/:id', () => {
      it('should update own product', async () => {
        const updateData = { name: 'Updated Product', price: 150 }
        const mockUpdatedProduct = { id: 1, ...updateData, supplier_id: 1 }

        global.mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Verify ownership
          .mockResolvedValueOnce({ rows: [mockUpdatedProduct] }) // Update result

        const response = await request(app)
          .put('/api/supplier/products/1')
          .set('Authorization', `Bearer ${supplierToken}`)
          .send(updateData)
          .expect(200)

        expect(response.body).toEqual(mockUpdatedProduct)
      })

      it('should reject updating non-owned product', async () => {
        global.mockDb.query.mockResolvedValueOnce({ rows: [] }) // Not found/not owned

        await request(app)
          .put('/api/supplier/products/999')
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ name: 'Updated' })
          .expect(404)
      })
    })
  })
})