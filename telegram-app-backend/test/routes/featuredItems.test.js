jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require('express');
const request = require('../utils/request');
const featuredItemsRoutes = require('../../routes/featuredItems');
const logger = require('../../services/logger');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/featured-items', featuredItemsRoutes);
  return app;
};

describe('Featured Items Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    logger.error.mockReset();
  });

  describe('GET /api/featured-items', () => {
    it('returns transformed featured items with fallback defaults', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            item_type: 'product',
            item_id: 41,
            custom_title: null,
            custom_description: null,
            custom_image_url: null,
            original_item_name: 'Diagnostic Kit',
            original_item_description: 'Fast result',
            original_item_image_url: 'https://cdn/image-1.png',
          },
          {
            item_type: 'deal',
            item_id: 99,
            custom_title: 'Limited Offer',
            custom_description: 'Save 20%',
            custom_image_url: 'https://cdn/custom.png',
            original_item_name: 'ignored',
            original_item_description: 'ignored',
            original_item_image_url: 'ignored',
          },
          {
            item_type: 'supplier',
            item_id: 7,
            custom_title: null,
            custom_description: null,
            custom_image_url: null,
            original_item_name: null,
            original_item_description: null,
            original_item_image_url: null,
          },
        ],
      });

      const res = await request(app).get('/api/featured-items');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 41,
          type: 'product',
          title: 'Diagnostic Kit',
          description: 'Fast result',
          imageUrl: 'https://cdn/image-1.png',
        },
        {
          id: 99,
          type: 'deal',
          title: 'Limited Offer',
          description: 'Save 20%',
          imageUrl: 'https://cdn/custom.png',
        },
        {
          id: 7,
          type: 'supplier',
          title: 'Featured Item',
          description: '',
          imageUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      ]);
    });

    it('returns 500 when featured item query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('featured query failed'));

      const res = await request(app).get('/api/featured-items');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch featured items' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching featured items',
        expect.any(Error)
      );
    });
  });

  describe('GET /api/featured-items/list/:listId', () => {
    it('validates list id', async () => {
      const res = await request(app).get('/api/featured-items/list/invalid');

      expect(res.status).toBe(400);
      expect(global.mockDb.query).not.toHaveBeenCalled();
    });

    it('returns transformed featured list items', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            item_type: 'product',
            item_id: 5,
            item_name: 'Antibiotic',
            item_description: 'Broad-spectrum',
            item_image_url: 'https://cdn/product.png',
            item_price: '2500',
            supplier_id: 3,
          },
          {
            item_type: 'deal',
            item_id: 21,
            item_name: 'Deal 21',
            item_description: 'Bundle',
            item_image_url: 'https://cdn/deal.png',
            item_price: '15',
            supplier_id: null,
          },
        ],
      });

      const res = await request(app).get('/api/featured-items/list/8');

      expect(res.status).toBe(200);
      expect(global.mockDb.query).toHaveBeenCalledWith(expect.any(String), ['8']);
      expect(res.body).toEqual([
        {
          id: 5,
          type: 'product',
          name: 'Antibiotic',
          description: 'Broad-spectrum',
          imageUrl: 'https://cdn/product.png',
          price: '2500',
          supplierId: 3,
        },
        {
          id: 21,
          type: 'deal',
          name: 'Deal 21',
          description: 'Bundle',
          imageUrl: 'https://cdn/deal.png',
          price: '15',
          supplierId: null,
        },
      ]);
    });

    it('returns 500 when featured list query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('list query failed'));

      const res = await request(app).get('/api/featured-items/list/8');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch featured list items' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching featured list items',
        expect.any(Error)
      );
    });
  });
});
