// services/relatedProductsService.js
// Related products retrieval with OpenSearch + Postgres fallback + Redis cache.

const db = require('../config/db');
const logger = require('./logger');
const { getRedisClient } = require('../config/redis');
const { getEmbedding, isEmbeddingsEnabled } = require('./embeddingService');
const { getOpenSearchClient, getIndexName, isOpenSearchEnabled } = require('../config/opensearch');
const { normalizeText } = require('../utils/textNormalize');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const DEFAULT_LIMIT = Number(process.env.RELATED_PRODUCTS_LIMIT || 20);
const MAX_LIMIT = Number.parseInt('50', 10);
const DEFAULT_CACHE_TTL_SECONDS = Number.parseInt('900', 10);
const OPEN_SEARCH_DEFAULT_K = Number.parseInt('50', 10);
const OPEN_SEARCH_SIZE_CAP = Number.parseInt('100', 10);
const CACHE_TTL = Number(process.env.RELATED_PRODUCTS_TTL || DEFAULT_CACHE_TTL_SECONDS);

const fetchProductBase = async function (productId) {
  const result = await db.query(
    `
      SELECT p.*, s.is_active as supplier_is_active
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `,
    [Number(productId)]
  );
  return result.rows[0];
};

const fetchProductsByIds = async function (ids) {
  if (ids.length === 0) return [];
  const result = await db.query(
    `
      SELECT p.*, s.name as supplier_name, s.is_active as supplier_is_active,
             ${EFFECTIVE_PRICE_SQL} as effective_selling_price
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN master_products mp ON p.master_product_id = mp.id
      WHERE p.id = ANY($1::int[]) AND s.is_active = true AND p.stock_level > 0
    `,
    [ids]
  );
  return result.rows;
};

const getRelatedByMaster = async function ({ masterProductId, productId, limit }) {
  if (!masterProductId) return [];
  const result = await db.query(
    `
      SELECT p.id
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.master_product_id = $1
        AND p.id != $2
        AND s.is_active = true
        AND p.stock_level > 0
      ORDER BY p.price ASC NULLS LAST, p.created_at DESC
      LIMIT $3
    `,
    [Number(masterProductId), Number(productId), Number(limit)]
  );
  return result.rows.map((row, index) => ({
    id: Number(row.id),
    score: 1 - index * 0.001,
    source: 'master',
  }));
};

const getRelatedByOpenSearch = async function ({ product, limit, excludeIds }) {
  if (!isOpenSearchEnabled() || !isEmbeddingsEnabled()) return [];
  const client = getOpenSearchClient();
  if (!client) return [];

  const embeddingText = [
    product.standardized_name_input,
    product.name,
    product.category,
    product.description,
  ]
    .filter(Boolean)
    .join(' ');
  const embedding = await getEmbedding(embeddingText);
  if (!embedding) return [];

  const filter = {
    bool: {
      filter: [
        { term: { supplier_is_active: true } },
        { range: { stock_level: { gt: 0 } } },
      ],
      must_not: [
        { term: { id: Number(product.id) } },
      ],
    },
  };

  if (excludeIds && excludeIds.length > 0) {
    filter.bool.must_not.push({
      terms: { id: excludeIds.map((id) => Number(id)) },
    });
  }

  const k = Math.max(Number(process.env.RELATED_PRODUCTS_OS_K || OPEN_SEARCH_DEFAULT_K), limit * 3);

  try {
    const response = await client.search({
      index: getIndexName('products'),
      size: Math.min(k, OPEN_SEARCH_SIZE_CAP),
      track_total_hits: false,
      query: {
        knn: {
          embedding: {
            vector: embedding,
            k,
            filter,
          },
        },
      },
    });

    const hits = response.body?.hits?.hits || response.hits?.hits || [];
    return hits
      .map((hit) => ({
        id: Number(hit._source?.id || hit._id),
        score: Number(hit._score),
        source: 'opensearch',
      }))
      .filter((item) => Number.isFinite(item.id));
  } catch (error) {
    logger.warn('Related products OpenSearch lookup failed', { error: error.message });
    return [];
  }
};

const getRelatedByTrgm = async function ({ product, limit, excludeIds }) {
  const normalized = normalizeText(product.standardized_name_input || product.name || '');
  if (!normalized) return [];

  const params = [normalized, Number(product.id)];
  let paramIndex = 3;

  let query = `
    SELECT p.id,
           GREATEST(
             COALESCE(similarity(p.standardized_name_input, $1), 0),
             COALESCE(similarity(p.name, $1), 0)
           ) as score
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id != $2
      AND s.is_active = true
      AND p.stock_level > 0
      AND (p.standardized_name_input % $1 OR p.name % $1)
  `;

  if (product.category) {
    query += ` AND p.category = $${paramIndex++}`;
    params.push(product.category);
  }

  if (excludeIds && excludeIds.length > 0) {
    query += ` AND p.id <> ALL($${paramIndex++}::int[])`;
    params.push(excludeIds.map((id) => Number(id)));
  }

  query += ` ORDER BY score DESC, p.created_at DESC LIMIT $${paramIndex}`;
  params.push(Number(limit));

  const result = await db.query(query, params);
  return result.rows.map((row) => ({
    id: Number(row.id),
    score: Number(row.score),
    source: 'trgm',
  }));
};

const getRelatedProducts = async function (productId, limit = DEFAULT_LIMIT) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const redis = getRedisClient();
  const cacheKey = `related:product:${productId}:limit:${safeLimit}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Related cache read failed', { error: error.message });
    }
  }

  const product = await fetchProductBase(productId);
  if (!product) return { items: [], total: 0 };

  const candidates = [];

  const masterCandidates = await getRelatedByMaster({
    masterProductId: product.master_product_id,
    productId,
    limit: safeLimit,
  });
  candidates.push(...masterCandidates);

  const missingAfterMaster = Math.max(safeLimit - candidates.length, 0);
  if (missingAfterMaster > 0) {
    const osCandidates = await getRelatedByOpenSearch({
      product,
      limit: missingAfterMaster,
      excludeIds: candidates.map((item) => item.id),
    });
    candidates.push(...osCandidates);
  }

  const uniqueIds = new Set();
  const ordered = [];
  for (const item of candidates) {
    if (!Number.isFinite(item.id)) continue;
    if (uniqueIds.has(item.id)) continue;
    uniqueIds.add(item.id);
    ordered.push(item);
    if (ordered.length >= safeLimit) break;
  }

  const missingAfterOs = Math.max(safeLimit - ordered.length, 0);
  if (missingAfterOs > 0) {
    const trgmCandidates = await getRelatedByTrgm({
      product,
      limit: missingAfterOs,
      excludeIds: ordered.map((item) => item.id),
    });
    for (const item of trgmCandidates) {
      if (!uniqueIds.has(item.id)) {
        uniqueIds.add(item.id);
        ordered.push(item);
        if (ordered.length >= safeLimit) break;
      }
    }
  }

  const details = await fetchProductsByIds(ordered.map((item) => item.id));
  const detailMap = new Map(details.map((row) => [Number(row.id), row]));

  const items = ordered
    .map((item) => {
      const row = detailMap.get(item.id);
      if (!row) return null;
      return { ...row, score: item.score, source: item.source };
    })
    .filter(Boolean);

  const response = { items, total: items.length };

  if (redis) {
    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (error) {
      logger.warn('Related cache write failed', { error: error.message });
    }
  }

  return response;
};

module.exports = {
  getRelatedProducts,
};
