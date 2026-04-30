// services/productLinkingService.js
// Automatic product linking to master products.

const db = require('../config/db');
const logger = require('./logger');
const { getEmbedding, isEmbeddingsEnabled } = require('./embeddingService');
const { getOpenSearchClient, getIndexName, isOpenSearchEnabled } = require('../config/opensearch');
const { indexProductById, indexMasterProductById } = require('./searchIndexer');
const { normalizeText } = require('../utils/textNormalize');
const { recordAuditEvent } = require('./auditService');

const OS_MIN_SCORE = Number(process.env.PRODUCT_LINK_OS_MIN_SCORE || 0.8);
const TRGM_MIN_SCORE = Number(process.env.PRODUCT_LINK_TRGM_MIN_SCORE || 0.55);
const OS_K = Number(process.env.PRODUCT_LINK_OS_K || 20);

const buildLinkingText = (product) => {
  return [
    product.standardized_name_input,
    product.name,
    product.category,
    product.description,
  ]
    .filter(Boolean)
    .join(' ');
};

const fetchProduct = async (productId) => {
  const result = await db.query(
    `
      SELECT
        p.id,
        p.name,
        p.standardized_name_input,
        p.description,
        p.category,
        p.image_url,
        p.price,
        p.master_product_id,
        p.linking_status
      FROM products p
      WHERE p.id = $1
    `,
    [Number(productId)]
  );
  return result.rows[0];
};

const buildOpenSearchFilter = (category) => {
  if (!category) return undefined;

  return {
    bool: {
      filter: [{ term: { 'category.keyword': category } }],
    },
  };
};

const buildOpenSearchQuery = ({ embedding, category }) => {
  const query = {
    knn: {
      embedding: {
        vector: embedding,
        k: OS_K,
      },
    },
  };

  const filter = buildOpenSearchFilter(category);
  if (filter) {
    query.knn.embedding.filter = filter;
  }

  return query;
};

const getTopSearchHit = (response) => {
  const hits = response.body?.hits?.hits || response.hits?.hits || [];
  return hits[0] || null;
};

const parseSearchHit = (hit) => {
  if (!hit) return null;

  const id = Number(hit._source?.id || hit._id);
  const score = Number(hit._score);
  if (!Number.isFinite(id) || !Number.isFinite(score)) return null;

  return { id, score, method: 'opensearch' };
};

const findBestMasterProductOpenSearch = async ({ embedding, category }) => {
  if (!isOpenSearchEnabled() || !embedding) return null;
  const client = getOpenSearchClient();
  if (!client) return null;
  const query = buildOpenSearchQuery({ embedding, category });

  try {
    const response = await client.search({
      index: getIndexName('master-products'),
      size: 1,
      track_total_hits: false,
      query,
    });

    return parseSearchHit(getTopSearchHit(response));
  } catch (error) {
    logger.warn('Master product OpenSearch lookup failed', { error: error.message });
    return null;
  }
};

const findBestMasterProductTrgm = async (normalizedName) => {
  if (!normalizedName) return null;
  const result = await db.query(
    `
      SELECT id, similarity(standardized_name_normalized, $1) as score
      FROM master_products
      WHERE standardized_name_normalized % $1
      ORDER BY score DESC
      LIMIT 1
    `,
    [normalizedName]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: Number(row.id), score: Number(row.score), method: 'trgm' };
};

const findBestMasterProduct = async ({ product, normalizedName, embedding }) => {
  const osResult = await findBestMasterProductOpenSearch({
    embedding,
    category: product.category,
  });
  if (osResult) return osResult;
  return findBestMasterProductTrgm(normalizedName);
};

const createMasterProduct = async ({ product, normalizedName }) => {
  const displayName = product.standardized_name_input || product.name || normalizedName;
  const description = product.description || null;
  const imageUrl = product.image_url || null;
  const category = product.category || null;
  const initialSeedPrice = product.price || null;

  const result = await db.query(
    `
      INSERT INTO master_products (
        standardized_name_normalized,
        display_name,
        description,
        image_url,
        category,
        initial_seed_price,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (standardized_name_normalized)
      DO UPDATE SET
        display_name = COALESCE(master_products.display_name, EXCLUDED.display_name),
        description = COALESCE(master_products.description, EXCLUDED.description),
        image_url = COALESCE(master_products.image_url, EXCLUDED.image_url),
        category = COALESCE(master_products.category, EXCLUDED.category),
        updated_at = NOW()
      RETURNING *
    `,
    [
      normalizedName,
      displayName,
      description,
      imageUrl,
      category,
      initialSeedPrice,
    ]
  );
  return result.rows[0];
};

const shouldSkipLinking = ({ product, forceRelink }) =>
  !forceRelink && product.master_product_id && product.linking_status !== 'pending';

const getNormalizedProductName = (product) =>
  normalizeText(product.standardized_name_input || product.name || '');

const markProductNeedsReview = async (productId) => {
  await db.query('UPDATE products SET linking_status = $1 WHERE id = $2', [
    'needs_review',
    productId,
  ]);
};

const resolveEmbedding = async (product) => {
  if (!isEmbeddingsEnabled()) return null;
  return getEmbedding(buildLinkingText(product));
};

const getLinkCandidate = (bestMatch) => {
  if (!bestMatch || !Number.isFinite(bestMatch.score)) {
    return { masterProductId: null, score: null, method: bestMatch?.method || 'none' };
  }

  const threshold = bestMatch.method === 'opensearch' ? OS_MIN_SCORE : TRGM_MIN_SCORE;
  if (bestMatch.score >= threshold) {
    return {
      masterProductId: bestMatch.id,
      score: bestMatch.score,
      method: bestMatch.method,
    };
  }

  return { masterProductId: null, score: bestMatch.score, method: bestMatch.method };
};

const persistLinkingDecision = async ({ productId, masterProductId, decision }) => {
  if (!masterProductId) {
    await markProductNeedsReview(productId);
    return;
  }

  await db.query(
    `
      UPDATE products
      SET master_product_id = $1,
          linking_status = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
    [masterProductId, decision, productId]
  );
  await indexMasterProductById(masterProductId);
};

const recordLinkingAuditEvent = async ({
  productId,
  decision,
  method,
  score,
  masterProductId,
  reason,
}) => {
  await recordAuditEvent({
    req: null,
    action: 'product_auto_link',
    actorRole: 'system',
    actorId: null,
    targetType: 'product',
    targetId: productId,
    metadata: {
      method: decision === 'created' ? 'create' : method,
      score,
      master_product_id: masterProductId,
      reason,
    },
  });
};

const resolveLinkDecision = async ({ product, normalizedName, bestMatch }) => {
  const candidate = getLinkCandidate(bestMatch);
  if (candidate.masterProductId) {
    return {
      masterProductId: candidate.masterProductId,
      decision: 'linked',
      score: candidate.score,
      method: candidate.method,
    };
  }

  const created = await createMasterProduct({ product, normalizedName });
  return {
    masterProductId: created?.id || null,
    decision: 'created',
    score: candidate.score,
    method: 'create',
  };
};

const linkFoundProduct = async ({ productId, product, normalizedName, reason }) => {
  const embedding = await resolveEmbedding(product);
  const best = await findBestMasterProduct({ product, normalizedName, embedding });
  const decision = await resolveLinkDecision({ product, normalizedName, bestMatch: best });

  await persistLinkingDecision({
    productId,
    masterProductId: decision.masterProductId,
    decision: decision.decision,
  });
  await indexProductById(productId);
  await recordLinkingAuditEvent({
    productId,
    decision: decision.decision,
    method: decision.method,
    score: decision.score,
    masterProductId: decision.masterProductId,
    reason,
  });

  return decision;
};

const linkProduct = async (productId, options = {}) => {
  const { reason = 'unknown', forceRelink = false } = options;

  const product = await fetchProduct(productId);
  if (!product) {
    return { status: 'not_found' };
  }

  if (shouldSkipLinking({ product, forceRelink })) {
    return { status: 'skipped', masterProductId: product.master_product_id };
  }

  const normalizedName = getNormalizedProductName(product);

  if (!normalizedName) {
    await markProductNeedsReview(productId);
    return { status: 'needs_review' };
  }

  const decision = await linkFoundProduct({
    productId,
    product,
    normalizedName,
    reason,
  });

  return {
    status: decision.decision,
    masterProductId: decision.masterProductId,
    score: decision.score,
    method: decision.method,
  };
};

module.exports = {
  linkProduct,
  findBestMasterProduct,
  createMasterProduct,
};
