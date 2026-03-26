// services/searchService.js
const db = require('../config/db');
const logger = require('./logger');
const {
  getOpenSearchClient,
  getIndexName,
  isOpenSearchEnabled,
} = require('../config/opensearch');
const { getEmbedding, isEmbeddingsEnabled } = require('./embeddingService');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const DEFAULT_LIMIT = 20;
const OPENSEARCH_MIN_RESULTS = Number(process.env.OPENSEARCH_MIN_RESULTS || 3);
const SEMANTIC_K = Number(process.env.OPENSEARCH_SEMANTIC_K || 50);
const RRF_K = Number(process.env.SEARCH_RRF_K || 60);

const normalizeQuery = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // Arabic diacritics
    .replace(/[^\p{L}\p{N}\s%.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildOpenSearchQuery = ({ term, cityId }) => {
  const should = [
    {
      multi_match: {
        query: term,
        fields: [
          'name^5',
          'title^5',
          'standardized_name_input^4',
          'supplier_name^3',
          'product_name^3',
          'description^2',
          'category^2',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
        prefix_length: 2,
        minimum_should_match: '2<75%',
      },
    },
    {
      match_phrase_prefix: {
        name: { query: term, boost: 2 },
      },
    },
    {
      match_phrase_prefix: {
        title: { query: term, boost: 2 },
      },
    },
  ];

  const filter = [];
  if (cityId) {
    filter.push({ term: { city_ids: Number(cityId) } });
  }

  return {
    bool: {
      filter,
      should,
      minimum_should_match: 1,
    },
  };
};

const buildSemanticKnnQuery = ({ field, vector, filter }) => {
  const knn = {
    [field]: {
      vector,
      k: SEMANTIC_K,
    },
  };

  if (filter) {
    knn[field].filter = filter;
  }

  return { knn };
};

const toId = (item) => String(item?.id ?? item?._id ?? '');

const mergeRrf = (lists) => {
  const scores = new Map();

  lists.forEach((list) => {
    list.forEach((item, index) => {
      const id = toId(item);
      if (!id) return;
      const previous = scores.get(id) || { item, score: 0 };
      const addedScore = 1 / (RRF_K + index + 1);
      scores.set(id, { item: previous.item || item, score: previous.score + addedScore });
    });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
};

const buildDealAvailabilityFilter = (nowIso) => ({
  bool: {
    must: [
      { term: { is_active: true } },
      {
        bool: {
          should: [
            { range: { start_date: { lte: nowIso } } },
            { bool: { must_not: { exists: { field: 'start_date' } } } },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          should: [
            { range: { end_date: { gte: nowIso } } },
            { bool: { must_not: { exists: { field: 'end_date' } } } },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

const searchOpenSearchIndex = async ({ index, term, cityId, limit, extraFilters = [], sort = [] }) => {
  const client = getOpenSearchClient();
  if (!client) return { items: [], total: 0 };

  const query = buildOpenSearchQuery({ term, cityId });
  if (extraFilters.length > 0) {
    query.bool.filter = query.bool.filter || [];
    extraFilters.forEach((filter) => query.bool.filter.push(filter));
  }

  const response = await client.search({
    index,
    size: limit,
    track_total_hits: true,
    query,
    sort: sort.length > 0 ? sort : [{ _score: 'desc' }],
  });

  const hits = response.body?.hits?.hits || response.hits?.hits || [];
  const total = response.body?.hits?.total?.value ?? response.hits?.total?.value ?? hits.length;

  return {
    items: hits.map((hit) => hit._source || {}),
    total,
  };
};

const searchOpenSearchSemanticIndex = async ({ index, vector, limit, filter }) => {
  const client = getOpenSearchClient();
  if (!client || !vector) return { items: [], total: 0 };

  const response = await client.search({
    index,
    size: limit,
    track_total_hits: true,
    query: buildSemanticKnnQuery({ field: 'embedding', vector, filter }),
  });

  const hits = response.body?.hits?.hits || response.hits?.hits || [];
  const total = response.body?.hits?.total?.value ?? response.hits?.total?.value ?? hits.length;

  return {
    items: hits.map((hit) => hit._source || {}),
    total,
  };
};

const searchOpenSearch = async ({ searchTerm, cityId, limit }) => {
  const term = normalizeQuery(searchTerm);
  const size = Number(limit) || DEFAULT_LIMIT;
  if (!term) {
    return {
      results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] },
    };
  }

  const nowIso = new Date().toISOString();
  const lexicalFilters = {
    products: [{ term: { supplier_is_active: true } }],
    deals: [
      buildDealAvailabilityFilter(nowIso),
      { term: { supplier_is_active: true } },
    ],
    suppliers: [{ term: { is_active: true } }],
  };

  const embeddingText = term;
  const embedding = isEmbeddingsEnabled() ? await getEmbedding(embeddingText) : null;

  const [productsLex, dealsLex, suppliersLex] = await Promise.all([
    searchOpenSearchIndex({
      index: getIndexName('products'),
      term,
      cityId,
      limit: size,
      extraFilters: lexicalFilters.products,
      sort: [{ _score: 'desc' }, { 'name.keyword': 'asc' }],
    }),
    searchOpenSearchIndex({
      index: getIndexName('deals'),
      term,
      cityId,
      limit: size,
      extraFilters: lexicalFilters.deals,
      sort: [{ _score: 'desc' }, { created_at: 'desc' }],
    }),
    searchOpenSearchIndex({
      index: getIndexName('suppliers'),
      term,
      cityId,
      limit: size,
      extraFilters: lexicalFilters.suppliers,
      sort: [{ _score: 'desc' }, { 'name.keyword': 'asc' }],
    }),
  ]);

  let products = productsLex;
  let deals = dealsLex;
  let suppliers = suppliersLex;

  if (embedding) {
    const [productsSem, dealsSem, suppliersSem] = await Promise.all([
      searchOpenSearchSemanticIndex({
        index: getIndexName('products'),
        vector: embedding,
        limit: size,
        filter: { bool: { filter: lexicalFilters.products } },
      }),
      searchOpenSearchSemanticIndex({
        index: getIndexName('deals'),
        vector: embedding,
        limit: size,
        filter: { bool: { filter: lexicalFilters.deals } },
      }),
      searchOpenSearchSemanticIndex({
        index: getIndexName('suppliers'),
        vector: embedding,
        limit: size,
        filter: { bool: { filter: lexicalFilters.suppliers } },
      }),
    ]);

    products = {
      items: mergeRrf([productsLex.items, productsSem.items]).slice(0, size),
      total: productsLex.total + productsSem.total,
    };
    deals = {
      items: mergeRrf([dealsLex.items, dealsSem.items]).slice(0, size),
      total: dealsLex.total + dealsSem.total,
    };
    suppliers = {
      items: mergeRrf([suppliersLex.items, suppliersSem.items]).slice(0, size),
      total: suppliersLex.total + suppliersSem.total,
    };
  }

  return {
    results: {
      products: { items: products.items, totalItems: products.items.length },
      deals: deals.items,
      suppliers: suppliers.items,
    },
  };
};

const searchPostgres = async ({ searchTerm, cityId, limit }) => {
  const term = String(searchTerm || '').trim();
  if (!term || term.length < 2) {
    return {
      results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] },
    };
  }

  const searchLimit = parseInt(limit, 10) || DEFAULT_LIMIT;

  let productsQuery = `
      SELECT p.*, s.name as supplier_name,
             similarity(p.name, $1) as score,
             ${EFFECTIVE_PRICE_SQL} as effective_selling_price
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN master_products mp ON p.master_product_id = mp.id
      WHERE s.is_active = true
      AND (
          p.name % $1 OR 
          p.description % $1 OR 
          p.standardized_name_input % $1 OR 
          s.name % $1
      )
  `;
  const queryParams = [term];
  let paramIndex = 2;
  if (cityId) {
    productsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${paramIndex++})`;
    queryParams.push(cityId);
  }
  productsQuery += ` ORDER BY score DESC, p.name ASC LIMIT $${paramIndex}`;
  queryParams.push(searchLimit);

  let dealsQuery = `
      SELECT d.*, s.name as supplier_name, p.name as product_name,
             GREATEST(similarity(d.title, $1), similarity(d.description, $1)) as score
      FROM deals d
      JOIN suppliers s ON d.supplier_id = s.id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE d.is_active = true AND s.is_active = true
      AND (d.title % $1 OR d.description % $1 OR s.name % $1)
      AND (d.start_date IS NULL OR d.start_date <= NOW())
      AND (d.end_date IS NULL OR d.end_date >= NOW())
  `;
  const dealsParams = [term];
  let dealsParamIndex = 2;
  if (cityId) {
    dealsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${dealsParamIndex++})`;
    dealsParams.push(cityId);
  }
  dealsQuery += ` ORDER BY score DESC, d.created_at DESC LIMIT $${dealsParamIndex}`;
  dealsParams.push(searchLimit);

  let suppliersQuery = `
      SELECT 
             s.id,
             s.name,
             s.category,
             s.location,
             s.rating,
             s.image_url,
             s.description,
             s.is_active,
             s.created_at,
             s.updated_at,
             COUNT(p.id) as product_count,
             similarity(s.name, $1) as score
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.is_active = true
      AND (s.name % $1 OR s.category % $1)
  `;
  const suppliersParams = [term];
  let suppliersParamIndex = 2;
  if (cityId) {
    suppliersQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${suppliersParamIndex++})`;
    suppliersParams.push(cityId);
  }
  suppliersQuery += ` GROUP BY s.id ORDER BY score DESC, s.name ASC LIMIT $${suppliersParamIndex}`;
  suppliersParams.push(searchLimit);

  const [productsResult, dealsResult, suppliersResult] = await Promise.all([
    db.query(productsQuery, queryParams),
    db.query(dealsQuery, dealsParams),
    db.query(suppliersQuery, suppliersParams),
  ]);

  return {
    results: {
      products: {
        items: productsResult.rows,
        totalItems: productsResult.rows.length,
      },
      deals: dealsResult.rows,
      suppliers: suppliersResult.rows,
    },
  };
};

const searchCatalog = async ({ searchTerm, cityId, limit }) => {
  if (!isOpenSearchEnabled()) {
    return searchPostgres({ searchTerm, cityId, limit });
  }

  try {
    const openSearchResult = await searchOpenSearch({ searchTerm, cityId, limit });
    const totalMatches =
      openSearchResult.results.products.items.length +
      openSearchResult.results.deals.length +
      openSearchResult.results.suppliers.length;
    const hasEnough =
      openSearchResult.results.products.items.length >= OPENSEARCH_MIN_RESULTS ||
      openSearchResult.results.deals.length >= OPENSEARCH_MIN_RESULTS ||
      openSearchResult.results.suppliers.length >= OPENSEARCH_MIN_RESULTS ||
      totalMatches >= OPENSEARCH_MIN_RESULTS;

    if (!hasEnough) {
      return searchPostgres({ searchTerm, cityId, limit });
    }
    return openSearchResult;
  } catch (error) {
    logger.warn('OpenSearch query failed, falling back to Postgres', {
      error: error.message,
    });
    return searchPostgres({ searchTerm, cityId, limit });
  }
};

module.exports = {
  searchCatalog,
  searchPostgres,
  searchOpenSearch,
};
