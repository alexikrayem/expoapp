jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('../../config/opensearch', () => ({
  isOpenSearchEnabled: jest.fn(),
  getOpenSearchClient: jest.fn(),
  getIndexName: jest.fn((suffix) => `test-${suffix}`),
}));

jest.mock('../../services/embeddingService', () => ({
  getEmbedding: jest.fn(),
  isEmbeddingsEnabled: jest.fn(),
}));

const { getRelatedProducts } = require('../../services/relatedProductsService');
const { getRedisClient } = require('../../config/redis');
const { isOpenSearchEnabled } = require('../../config/opensearch');
const { isEmbeddingsEnabled } = require('../../services/embeddingService');

describe('relatedProductsService', () => {
  beforeEach(() => {
    global.mockDb.reset();
    getRedisClient.mockReturnValue(null);
    isOpenSearchEnabled.mockReturnValue(false);
    isEmbeddingsEnabled.mockReturnValue(false);
  });

  it('returns empty when product does not exist', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    const result = await getRelatedProducts(999);

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('returns master-related then trigram fallback without duplicates', async () => {
    global.mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Base Product',
          standardized_name_input: 'Base Product',
          description: 'desc',
          category: 'cat',
          master_product_id: 10,
          supplier_id: 1,
          supplier_is_active: true,
          stock_level: 10,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 2 }, { id: 3 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 3, score: 0.7 }, { id: 4, score: 0.6 }],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 2, name: 'Alt A', supplier_name: 'S1', stock_level: 5 },
          { id: 3, name: 'Alt B', supplier_name: 'S2', stock_level: 5 },
          { id: 4, name: 'Alt C', supplier_name: 'S3', stock_level: 5 },
        ],
      });

    const result = await getRelatedProducts(1, 5);

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.id)).toEqual([2, 3, 4]);
  });
});
