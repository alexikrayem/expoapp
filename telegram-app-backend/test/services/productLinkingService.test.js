jest.mock('../../services/embeddingService', () => ({
  getEmbedding: jest.fn(),
  isEmbeddingsEnabled: jest.fn(),
}));

jest.mock('../../config/opensearch', () => ({
  isOpenSearchEnabled: jest.fn(),
  getOpenSearchClient: jest.fn(),
  getIndexName: jest.fn((suffix) => `test-${suffix}`),
}));

jest.mock('../../services/searchIndexer', () => ({
  indexProductById: jest.fn(),
  indexMasterProductById: jest.fn(),
}));

jest.mock('../../services/auditService', () => ({
  recordAuditEvent: jest.fn(),
}));

const { linkProduct } = require('../../services/productLinkingService');
const { getEmbedding, isEmbeddingsEnabled } = require('../../services/embeddingService');
const { isOpenSearchEnabled, getOpenSearchClient, getIndexName } = require('../../config/opensearch');
const { indexProductById, indexMasterProductById } = require('../../services/searchIndexer');
const { recordAuditEvent } = require('../../services/auditService');

describe('productLinkingService', () => {
  beforeEach(() => {
    global.mockDb.reset();
    getEmbedding.mockReset();
    isEmbeddingsEnabled.mockReset();
    isOpenSearchEnabled.mockReset();
    getOpenSearchClient.mockReset();
    indexProductById.mockReset();
    indexMasterProductById.mockReset();
    recordAuditEvent.mockReset();
  });

  it('links to existing master product when OpenSearch score is strong', async () => {
    isEmbeddingsEnabled.mockReturnValue(true);
    getEmbedding.mockResolvedValue([0.1, 0.2]);
    isOpenSearchEnabled.mockReturnValue(true);
    getOpenSearchClient.mockReturnValue({
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [{ _source: { id: 42 }, _score: 0.9 }],
        },
      }),
    });

    global.mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Product A',
          standardized_name_input: 'Product A',
          description: 'desc',
          category: 'cat',
          image_url: null,
          price: 10,
          master_product_id: null,
          linking_status: 'pending',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await linkProduct(1, { reason: 'test' });

    expect(result.status).toBe('linked');
    expect(result.masterProductId).toBe(42);
    expect(indexMasterProductById).toHaveBeenCalledWith(42);
    expect(indexProductById).toHaveBeenCalledWith(1);
  });

  it('creates a new master product when similarity is weak', async () => {
    isEmbeddingsEnabled.mockReturnValue(false);
    isOpenSearchEnabled.mockReturnValue(false);

    global.mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 2,
          name: 'Product B',
          standardized_name_input: 'Product B',
          description: 'desc',
          category: 'cat',
          image_url: null,
          price: 20,
          master_product_id: null,
          linking_status: 'pending',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 7, score: 0.4 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 99 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await linkProduct(2, { reason: 'test' });

    expect(result.status).toBe('created');
    expect(result.masterProductId).toBe(99);
    expect(indexMasterProductById).toHaveBeenCalledWith(99);
  });

  it('skips relinking when already linked and forceRelink is false', async () => {
    global.mockDb.query.mockResolvedValueOnce({
      rows: [{
        id: 3,
        name: 'Product C',
        standardized_name_input: 'Product C',
        description: null,
        category: 'cat',
        image_url: null,
        price: 30,
        master_product_id: 55,
        linking_status: 'linked',
      }],
    });

    const result = await linkProduct(3, { reason: 'test' });

    expect(result.status).toBe('skipped');
    expect(result.masterProductId).toBe(55);
    expect(global.mockDb.query).toHaveBeenCalledTimes(1);
  });
});
