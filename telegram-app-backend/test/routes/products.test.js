const request = require('supertest');
const express = require('express');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const productRoutes = require('../../routes/products');
  app.use('/api/products', productRoutes);

  return app;
};

describe('Product Routes', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = createTestApp();
  });

  describe('GET /api/products', () => {
    it('returns products with pagination', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Test Product', price: 100, supplier_name: 'Supplier A' },
            { id: 2, name: 'Another Product', price: 200, supplier_name: 'Supplier B' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '10' }]
        });

      const res = await request(app)
        .get('/api/products')
        .query({ cityId: 1, page: 1, limit: 12 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('currentPage');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body.items).toHaveLength(2);
    });

    it('filters products by category', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Medical Item' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/products')
        .query({ cityId: 1, category: 'Medical' });

      expect(res.status).toBe(200);
      expect(global.mockDb.query).toHaveBeenCalled();
    });

    it('filters products by price range', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const res = await request(app)
        .get('/api/products')
        .query({ cityId: 1, minPrice: 50, maxPrice: 150 });

      expect(res.status).toBe(200);
    });

    it('returns 400 for invalid minPrice', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ cityId: 1, minPrice: -10 });

      expect(res.status).toBe(400);
    });

    it('filters products on sale', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, is_on_sale: true }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/products')
        .query({ cityId: 1, onSale: 'true' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/products/categories', () => {
    it('returns category list', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          { category: 'Medical' },
          { category: 'Dental' },
          { category: 'Lab Equipment' }
        ]
      });

      const res = await request(app).get('/api/products/categories');

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(3);
    });
  });

  describe('GET /api/products/batch', () => {
    it('returns products by IDs', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Product 1' },
          { id: 5, name: 'Product 5' }
        ]
      });

      const res = await request(app)
        .get('/api/products/batch')
        .query({ ids: '1,5' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('returns empty array for no IDs', async () => {
      const res = await request(app).get('/api/products/batch');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns product by ID', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test Product', price: 100 }]
      });

      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('returns 404 for non-existent product', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/products/999');

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid product ID', async () => {
      const res = await request(app).get('/api/products/abc');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products/favorite-details/:productId', () => {
    it('returns product with availability status', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Available Product',
          stock_level: 10,
          supplier_is_active: true,
          price: 100
        }]
      });

      const res = await request(app).get('/api/products/favorite-details/1');

      expect(res.status).toBe(200);
      expect(res.body.isAvailable).toBe(true);
      expect(res.body.originalProduct).toBeDefined();
    });

    it('returns alternatives for unavailable product', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Out of Stock',
            stock_level: 0,
            supplier_is_active: true,
            standardized_name_input: 'test product'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2, name: 'Alternative Product', price: 90 }]
        });

      const res = await request(app).get('/api/products/favorite-details/1');

      expect(res.status).toBe(200);
      expect(res.body.isAvailable).toBe(false);
    });
  });
});