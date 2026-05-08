const loadSearchIndexer = ({
  openSearchEnabled = true,
  openSearchClient = null,
  embeddingsEnabled = false,
  embeddingVector = [0.1, 0.2, 0.3],
} = {}) => {
  jest.resetModules();

  const db = {
    query: jest.fn(),
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    request: jest.fn(),
    query: jest.fn(),
  };
  const getEmbedding = jest.fn().mockResolvedValue(embeddingVector);
  const isEmbeddingsEnabled = jest.fn(() => embeddingsEnabled);
  const getOpenSearchClient = jest.fn(() => openSearchClient);
  const getIndexName = jest.fn((name) => `idx_${name}`);
  const isOpenSearchEnabled = jest.fn(() => openSearchEnabled);

  jest.doMock('../../config/db', () => db);
  jest.doMock('../../services/logger', () => logger);
  jest.doMock('../../services/embeddingService', () => ({
    getEmbedding,
    isEmbeddingsEnabled,
  }));
  jest.doMock('../../config/opensearch', () => ({
    getOpenSearchClient,
    getIndexName,
    isOpenSearchEnabled,
  }));
  jest.doMock('../../utils/pricing', () => ({
    EFFECTIVE_PRICE_SQL: 'COALESCE(mp.price, p.price)',
  }));

  const searchIndexer = require('../../services/searchIndexer');
  return {
    searchIndexer,
    db,
    logger,
    getEmbedding,
    isEmbeddingsEnabled,
    getOpenSearchClient,
    getIndexName,
    isOpenSearchEnabled,
  };
};

describe('searchIndexer service', () => {
  const originalRefresh = process.env.OPENSEARCH_REFRESH;

  beforeEach(() => {
    process.env.OPENSEARCH_REFRESH = 'false';
  });

  afterEach(() => {
    process.env.OPENSEARCH_REFRESH = originalRefresh;
    jest.clearAllMocks();
  });

  describe('indexProductById', () => {
    it('returns early when OpenSearch is disabled', async () => {
      const { searchIndexer, db } = loadSearchIndexer({ openSearchEnabled: false });

      await searchIndexer.indexProductById(11);

      expect(db.query).not.toHaveBeenCalled();
    });

    it('deletes product doc when source product no longer exists', async () => {
      const client = { delete: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query.mockResolvedValueOnce({ rows: [] });

      await searchIndexer.indexProductById(22);

      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'idx_products',
          id: '22',
          ignore: [404],
        })
      );
    });

    it('indexes product documents with fetched city ids', async () => {
      const client = { index: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db, getEmbedding } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
        embeddingsEnabled: false,
      });
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 33,
            supplier_id: 9,
            supplier_name: 'Supplier X',
            supplier_is_active: true,
            name: 'Thermometer',
            description: 'Infrared model',
            category: 'Diagnostics',
            standardized_name_input: 'thermometer',
            image_url: 'https://img',
            price: 15,
            discount_price: null,
            is_on_sale: false,
            stock_level: 20,
            effective_selling_price: 15,
            master_product_id: null,
            linking_status: 'linked',
            created_at: '2026-01-01',
            updated_at: '2026-01-02',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ city_id: 1 }, { city_id: 2 }],
        });

      await searchIndexer.indexProductById(33);

      expect(getEmbedding).not.toHaveBeenCalled();
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'idx_products',
          id: '33',
          body: expect.objectContaining({
            id: 33,
            supplier_id: 9,
            city_ids: [1, 2],
          }),
        })
      );
    });

    it('uses provided city ids without querying supplier cities', async () => {
      const client = { index: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 44,
          supplier_id: 7,
          supplier_name: 'Supplier Y',
          supplier_is_active: true,
          name: 'Mask',
          description: 'N95',
        }],
      });

      await searchIndexer.indexProductById(44, [5, 6]);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ city_ids: [5, 6] }),
        })
      );
    });

    it('logs warning when indexing fails', async () => {
      const client = { index: jest.fn().mockRejectedValue(new Error('index failed')) };
      const { searchIndexer, db, logger } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 55, supplier_id: 1, supplier_name: 'S', name: 'Gauze' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await searchIndexer.indexProductById(55);

      expect(logger.warn).toHaveBeenCalledWith('OpenSearch index failed', {
        index: 'idx_products',
        id: 55,
        error: 'index failed',
      });
    });
  });

  describe('indexDealById/indexSupplierById/indexMasterProductById', () => {
    it('indexes deals with semantic embedding when enabled', async () => {
      const client = { index: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db, getEmbedding } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
        embeddingsEnabled: true,
      });
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 11,
            supplier_id: 5,
            supplier_name: 'Supplier',
            supplier_is_active: true,
            product_name: 'Thermometer',
            title: 'Promo',
            description: '20% off',
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ city_id: 9 }] });

      await searchIndexer.indexDealById(11);

      expect(getEmbedding).toHaveBeenCalled();
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'idx_deals',
          id: '11',
          body: expect.objectContaining({
            id: 11,
            city_ids: [9],
            embedding: [0.1, 0.2, 0.3],
          }),
        })
      );
    });

    it('deletes supplier index when supplier row is missing', async () => {
      const client = { delete: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query.mockResolvedValueOnce({ rows: [] });

      await searchIndexer.indexSupplierById(99);

      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'idx_suppliers',
          id: '99',
        })
      );
    });

    it('indexes master product document', async () => {
      const client = { index: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 6,
          standardized_name_normalized: 'sterile gloves',
          display_name: 'Sterile Gloves',
          category: 'PPE',
        }],
      });

      await searchIndexer.indexMasterProductById(6);

      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'idx_master-products',
          id: '6',
          body: expect.objectContaining({ id: 6, display_name: 'Sterile Gloves' }),
        })
      );
    });
  });

  describe('supplier-level reindexing and deleteByQuery', () => {
    it('reindexes all products for supplier with shared city ids', async () => {
      const client = { index: jest.fn().mockResolvedValue({}) };
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }) // product ids
        .mockResolvedValueOnce({ rows: [{ city_id: 3 }, { city_id: 4 }] }) // city ids
        .mockResolvedValueOnce({ rows: [{ id: 1, supplier_id: 8, supplier_name: 'S', name: 'P1' }] }) // fetch product 1
        .mockResolvedValueOnce({ rows: [{ id: 2, supplier_id: 8, supplier_name: 'S', name: 'P2' }] }); // fetch product 2

      await searchIndexer.reindexProductsBySupplierId(8);

      expect(client.index).toHaveBeenCalledTimes(2);
      expect(client.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: '1',
          body: expect.objectContaining({ city_ids: [3, 4] }),
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: '2',
          body: expect.objectContaining({ city_ids: [3, 4] }),
        })
      );
    });

    it('returns early when supplier has no products/deals to reindex', async () => {
      const { searchIndexer, db } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: { index: jest.fn() },
      });
      db.query
        .mockResolvedValueOnce({ rows: [] }) // no products
        .mockResolvedValueOnce({ rows: [] }); // no deals

      await searchIndexer.reindexProductsBySupplierId(8);
      await searchIndexer.reindexDealsBySupplierId(8);

      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('deletes products by supplier using deleteByQuery', async () => {
      process.env.OPENSEARCH_REFRESH = 'true';
      const client = { deleteByQuery: jest.fn().mockResolvedValue({ deleted: 2 }) };
      const { searchIndexer } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });

      await searchIndexer.deleteProductsBySupplierId('17');

      expect(client.deleteByQuery).toHaveBeenCalledWith({
        index: 'idx_products',
        body: { query: { term: { supplier_id: 17 } } },
        refresh: 'wait_for',
      });
    });

    it('logs warning when deleteByQuery fails', async () => {
      const client = { deleteByQuery: jest.fn().mockRejectedValue(new Error('delete failed')) };
      const { searchIndexer, logger } = loadSearchIndexer({
        openSearchEnabled: true,
        openSearchClient: client,
      });

      await searchIndexer.deleteDealsBySupplierId(22);

      expect(logger.warn).toHaveBeenCalledWith('OpenSearch deleteByQuery failed', {
        error: 'delete failed',
      });
    });
  });
});
