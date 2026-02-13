const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a test app without starting the server
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const supplierRoutes = require('../../routes/suppliers');
  app.use('/api/suppliers', supplierRoutes);

  return app;
};

describe('Suppliers API', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = createTestApp();
  });

  describe('GET /api/suppliers', () => {
    it('returns all active suppliers', async () => {
      const mockSuppliers = [
        { id: 1, name: 'Supplier 1', category: 'Medicine', product_count: 5 },
        { id: 2, name: 'Supplier 2', category: 'Equipment', product_count: 3 }
      ];

      global.mockDb.query.mockResolvedValueOnce({ rows: mockSuppliers });

      const response = await request(app)
        .get('/api/suppliers')
        .query({ cityId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSuppliers);
    });

    it('filters suppliers by city', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers')
        .query({ cityId: 1 });

      expect(response.status).toBe(200);
      expect(global.mockDb.query).toHaveBeenCalled();
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('returns supplier with products', async () => {
      const mockSupplier = { id: 1, name: 'Supplier 1', is_active: true };
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100 }
      ];

      global.mockDb.query
        .mockResolvedValueOnce({ rows: [mockSupplier] })
        .mockResolvedValueOnce({ rows: mockProducts });

      const response = await request(app).get('/api/suppliers/1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Supplier 1');
    });

    it('returns 404 for non-existent supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/suppliers/999');

      expect(response.status).toBe(404);
    });
  });
});