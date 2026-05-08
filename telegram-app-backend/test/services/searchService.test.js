const loadSearchService = ({
  openSearchEnabled = true,
  openSearchClient = null,
  embeddingsEnabled = false,
  embeddingVector = [0.11, 0.22, 0.33],
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
  const getOpenSearchClient = jest.fn(() => openSearchClient);
  const getIndexName = jest.fn((name) => `idx_${name}`);
  const isOpenSearchEnabled = jest.fn(() => openSearchEnabled);
  const getEmbedding = jest.fn().mockResolvedValue(embeddingVector);
  const isEmbeddingsEnabled = jest.fn(() => embeddingsEnabled);

  jest.doMock('../../config/db', () => db);
  jest.doMock('../../services/logger', () => logger);
  jest.doMock('../../config/opensearch', () => ({
    getOpenSearchClient,
    getIndexName,
    isOpenSearchEnabled,
  }));
  jest.doMock('../../services/embeddingService', () => ({
    getEmbedding,
    isEmbeddingsEnabled,
  }));
  jest.doMock('../../utils/pricing', () => ({
    EFFECTIVE_PRICE_SQL: 'COALESCE(mp.price, p.price)',
  }));

  const searchService = require('../../services/searchService');
  return {
    searchService,
    db,
    logger,
    getOpenSearchClient,
    getIndexName,
    isOpenSearchEnabled,
    getEmbedding,
    isEmbeddingsEnabled,
  };
};

const createSearchResponse = (sources) => ({
  body: {
    hits: {
      hits: sources.map((source) => ({ _source: source })),
      total: { value: sources.length },
    },
  },
});

describe('searchService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPostgres', () => {
    it('returns empty results for missing or short search terms', async () => {
      const { searchService, db } = loadSearchService();

      await expect(searchService.searchPostgres({ searchTerm: '' })).resolves.toEqual({
        results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] },
      });
      await expect(searchService.searchPostgres({ searchTerm: 'a' })).resolves.toEqual({
        results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] },
      });
      expect(db.query).not.toHaveBeenCalled();
    });

    it('queries products/deals/suppliers and returns formatted results', async () => {
      const { searchService, db } = loadSearchService();
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Product 1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 10, title: 'Deal 10' }] })
        .mockResolvedValueOnce({ rows: [{ id: 100, name: 'Supplier 100' }] });

      const result = await searchService.searchPostgres({
        searchTerm: 'kit',
        cityId: 7,
        limit: 5,
      });

      expect(db.query).toHaveBeenCalledTimes(3);
      const [productsCall, dealsCall, suppliersCall] = db.query.mock.calls;
      expect(productsCall[0]).toContain('supplier_cities WHERE city_id = $2');
      expect(productsCall[1]).toEqual(['kit', 7, 5]);
      expect(dealsCall[0]).toContain('supplier_cities WHERE city_id = $2');
      expect(dealsCall[1]).toEqual(['kit', 7, 5]);
      expect(suppliersCall[0]).toContain('supplier_cities WHERE city_id = $2');
      expect(suppliersCall[1]).toEqual(['kit', 7, 5]);

      expect(result).toEqual({
        results: {
          products: { items: [{ id: 1, name: 'Product 1' }], totalItems: 1 },
          deals: [{ id: 10, title: 'Deal 10' }],
          suppliers: [{ id: 100, name: 'Supplier 100' }],
        },
      });
    });
  });

  describe('searchOpenSearch', () => {
    it('returns empty catalog when normalized query is blank', async () => {
      const searchClient = { search: jest.fn() };
      const { searchService } = loadSearchService({
        openSearchClient: searchClient,
        embeddingsEnabled: false,
      });

      const result = await searchService.searchOpenSearch({ searchTerm: '***@@@' });

      expect(result).toEqual({
        results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] },
      });
      expect(searchClient.search).not.toHaveBeenCalled();
    });

    it('runs lexical OpenSearch query when embeddings are disabled', async () => {
      const searchClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce(createSearchResponse([{ id: 1, name: 'Product A' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 2, title: 'Deal A' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 3, name: 'Supplier A' }])),
      };
      const { searchService, getEmbedding } = loadSearchService({
        openSearchClient: searchClient,
        embeddingsEnabled: false,
      });

      const result = await searchService.searchOpenSearch({
        searchTerm: 'Diagnostic Kit',
        cityId: 4,
        limit: 10,
      });

      expect(searchClient.search).toHaveBeenCalledTimes(3);
      expect(getEmbedding).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: {
          products: { items: [{ id: 1, name: 'Product A' }], totalItems: 1 },
          deals: [{ id: 2, title: 'Deal A' }],
          suppliers: [{ id: 3, name: 'Supplier A' }],
        },
      });
    });

    it('runs lexical+semantic hybrid search when embeddings are available', async () => {
      const searchClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce(createSearchResponse([{ id: 1, name: 'Lex Product' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 10, title: 'Lex Deal' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 20, name: 'Lex Supplier' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 2, name: 'Sem Product' }, { id: 1, name: 'Dup Product' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 11, title: 'Sem Deal' }]))
          .mockResolvedValueOnce(createSearchResponse([{ id: 20, name: 'Dup Supplier' }, { id: 21, name: 'Sem Supplier' }])),
      };
      const { searchService, getEmbedding } = loadSearchService({
        openSearchClient: searchClient,
        embeddingsEnabled: true,
        embeddingVector: [0.8, 0.1, 0.3],
      });

      const result = await searchService.searchOpenSearch({
        searchTerm: 'Cardio monitor',
        cityId: 2,
        limit: 2,
      });

      expect(searchClient.search).toHaveBeenCalledTimes(6);
      expect(getEmbedding).toHaveBeenCalledWith('cardio monitor');
      const productIds = result.results.products.items.map((item) => item.id).sort();
      const dealIds = result.results.deals.map((item) => item.id).sort();
      const supplierIds = result.results.suppliers.map((item) => item.id).sort();
      expect(productIds).toEqual([1, 2]);
      expect(dealIds).toEqual([10, 11]);
      expect(supplierIds).toEqual([20, 21]);
      expect(result.results.products.totalItems).toBe(2);
    });
  });

  describe('searchCatalog', () => {
    it('uses Postgres search when OpenSearch is disabled', async () => {
      const { searchService, db, getOpenSearchClient } = loadSearchService({
        openSearchEnabled: false,
      });
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'P' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await searchService.searchCatalog({
        searchTerm: 'glucometer',
        cityId: 1,
        limit: 5,
      });

      expect(result.results.products.items).toEqual([{ id: 1, name: 'P' }]);
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(getOpenSearchClient).not.toHaveBeenCalled();
    });

    it('returns OpenSearch results when enough matches are found', async () => {
      const searchClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce(createSearchResponse([
            { id: 1, name: 'P1' },
            { id: 2, name: 'P2' },
            { id: 3, name: 'P3' },
          ]))
          .mockResolvedValueOnce(createSearchResponse([]))
          .mockResolvedValueOnce(createSearchResponse([])),
      };
      const { searchService, db } = loadSearchService({
        openSearchEnabled: true,
        openSearchClient: searchClient,
        embeddingsEnabled: false,
      });

      const result = await searchService.searchCatalog({ searchTerm: 'mask' });

      expect(searchClient.search).toHaveBeenCalledTimes(3);
      expect(db.query).not.toHaveBeenCalled();
      expect(result.results.products.totalItems).toBe(3);
    });

    it('falls back to Postgres when OpenSearch results are insufficient', async () => {
      const searchClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce(createSearchResponse([{ id: 1, name: 'Only one' }]))
          .mockResolvedValueOnce(createSearchResponse([]))
          .mockResolvedValueOnce(createSearchResponse([])),
      };
      const { searchService, db } = loadSearchService({
        openSearchEnabled: true,
        openSearchClient: searchClient,
        embeddingsEnabled: false,
      });
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 10, name: 'PG Product' }] })
        .mockResolvedValueOnce({ rows: [{ id: 11, title: 'PG Deal' }] })
        .mockResolvedValueOnce({ rows: [{ id: 12, name: 'PG Supplier' }] });

      const result = await searchService.searchCatalog({
        searchTerm: 'mask',
        cityId: 9,
        limit: 4,
      });

      expect(searchClient.search).toHaveBeenCalledTimes(3);
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        results: {
          products: { items: [{ id: 10, name: 'PG Product' }], totalItems: 1 },
          deals: [{ id: 11, title: 'PG Deal' }],
          suppliers: [{ id: 12, name: 'PG Supplier' }],
        },
      });
    });

    it('falls back to Postgres and logs warning when OpenSearch throws', async () => {
      const searchClient = {
        search: jest.fn().mockRejectedValue(new Error('opensearch timeout')),
      };
      const { searchService, db, logger } = loadSearchService({
        openSearchEnabled: true,
        openSearchClient: searchClient,
      });
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 50, name: 'Fallback Product' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await searchService.searchCatalog({ searchTerm: 'stethoscope' });

      expect(logger.warn).toHaveBeenCalledWith(
        'OpenSearch query failed, falling back to Postgres',
        { error: 'opensearch timeout' }
      );
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(result.results.products.items).toEqual([{ id: 50, name: 'Fallback Product' }]);
    });
  });
});
