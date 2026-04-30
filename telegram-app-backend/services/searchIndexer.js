// services/searchIndexer.js
const db = require('../config/db');
const logger = require('./logger');
const { getEmbedding, isEmbeddingsEnabled } = require('./embeddingService');
const {
  getOpenSearchClient,
  getIndexName,
  isOpenSearchEnabled,
} = require('../config/opensearch');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const shouldRefresh = () => process.env.OPENSEARCH_REFRESH === 'true';

const safeIndex = async (index, id, body) => {
  const client = getOpenSearchClient();
  if (!client) return;
  try {
    await client.index({
      index,
      id: String(id),
      body,
      refresh: shouldRefresh() ? 'wait_for' : false,
    });
  } catch (error) {
    logger.warn('OpenSearch index failed', { index, id, error: error.message });
  }
};

const safeDelete = async (index, id) => {
  const client = getOpenSearchClient();
  if (!client) return;
  try {
    await client.delete({
      index,
      id: String(id),
      refresh: shouldRefresh() ? 'wait_for' : false,
      ignore: [404],
    });
  } catch (error) {
    logger.warn('OpenSearch delete failed', { index, id, error: error.message });
  }
};

const fetchCityIds = async (supplierId) => {
  const result = await db.query(
    'SELECT city_id FROM supplier_cities WHERE supplier_id = $1',
    [supplierId]
  );
  return result.rows.map((row) => row.city_id);
};

const fetchProductRow = async (productId) => {
  const result = await db.query(
    `
      SELECT p.*, s.name as supplier_name, s.is_active as supplier_is_active,
             ${EFFECTIVE_PRICE_SQL} as effective_selling_price
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN master_products mp ON p.master_product_id = mp.id
      WHERE p.id = $1
    `,
    [productId]
  );
  return result.rows[0];
};

const fetchDealRow = async (dealId) => {
  const result = await db.query(
    `
      SELECT d.*, s.name as supplier_name, s.is_active as supplier_is_active,
             p.name as product_name
      FROM deals d
      JOIN suppliers s ON d.supplier_id = s.id
      LEFT JOIN products p ON d.product_id = p.id
      WHERE d.id = $1
    `,
    [dealId]
  );
  return result.rows[0];
};

const fetchSupplierRow = async (supplierId) => {
  const result = await db.query(
    `
      SELECT 
        s.id,
        s.name,
        s.category,
        s.location,
        s.description,
        s.image_url,
        s.rating,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(p.id) as product_count
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.id = $1
      GROUP BY s.id
    `,
    [supplierId]
  );
  return result.rows[0];
};

const fetchMasterProductRow = async (masterProductId) => {
  const result = await db.query(
    `
      SELECT
        id,
        standardized_name_normalized,
        display_name,
        description,
        image_url,
        brand,
        category,
        attributes,
        created_at,
        updated_at
      FROM master_products
      WHERE id = $1
    `,
    [masterProductId]
  );
  return result.rows[0];
};

const mapProductDoc = async (row, providedCityIds = null) => {
  if (!row) return null;
  const cityIds = providedCityIds || await fetchCityIds(row.supplier_id);
  const embeddingText = [
    row.name,
    row.standardized_name_input,
    row.category,
    row.supplier_name,
    row.description,
  ]
    .filter(Boolean)
    .join(' ');
  const embedding = isEmbeddingsEnabled() ? await getEmbedding(embeddingText) : null;
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    supplier_is_active: row.supplier_is_active,
    name: row.name,
    description: row.description,
    category: row.category,
    standardized_name_input: row.standardized_name_input,
    image_url: row.image_url,
    price: row.price,
    discount_price: row.discount_price,
    is_on_sale: row.is_on_sale,
    stock_level: row.stock_level,
    effective_selling_price: row.effective_selling_price,
    master_product_id: row.master_product_id,
    linking_status: row.linking_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    city_ids: cityIds,
    ...(embedding ? { embedding } : {}),
  };
};

const mapDealDoc = async (row, providedCityIds = null) => {
  if (!row) return null;
  const cityIds = providedCityIds || await fetchCityIds(row.supplier_id);
  const embeddingText = [
    row.title,
    row.description,
    row.product_name,
    row.supplier_name,
  ]
    .filter(Boolean)
    .join(' ');
  const embedding = isEmbeddingsEnabled() ? await getEmbedding(embeddingText) : null;
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    supplier_is_active: row.supplier_is_active,
    product_id: row.product_id,
    product_name: row.product_name,
    title: row.title,
    description: row.description,
    discount_percentage: row.discount_percentage,
    start_date: row.start_date,
    end_date: row.end_date,
    image_url: row.image_url,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    city_ids: cityIds,
    ...(embedding ? { embedding } : {}),
  };
};

const mapSupplierDoc = async (row) => {
  if (!row) return null;
  const cityIds = await fetchCityIds(row.id);
  const embeddingText = [
    row.name,
    row.category,
    row.location,
    row.description,
  ]
    .filter(Boolean)
    .join(' ');
  const embedding = isEmbeddingsEnabled() ? await getEmbedding(embeddingText) : null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    description: row.description,
    image_url: row.image_url,
    rating: row.rating,
    is_active: row.is_active,
    product_count: Number.parseInt(row.product_count || 0, 10),
    created_at: row.created_at,
    updated_at: row.updated_at,
    city_ids: cityIds,
    ...(embedding ? { embedding } : {}),
  };
};

const mapMasterProductDoc = async (row) => {
  if (!row) return null;
  const embeddingText = [
    row.display_name,
    row.standardized_name_normalized,
    row.category,
    row.brand,
    row.description,
  ]
    .filter(Boolean)
    .join(' ');
  const embedding = isEmbeddingsEnabled() ? await getEmbedding(embeddingText) : null;
  return {
    id: row.id,
    standardized_name_normalized: row.standardized_name_normalized,
    display_name: row.display_name,
    description: row.description,
    image_url: row.image_url,
    brand: row.brand,
    category: row.category,
    attributes: row.attributes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...(embedding ? { embedding } : {}),
  };
};

const indexProductById = async (productId, providedCityIds = null) => {
  if (!isOpenSearchEnabled()) return;
  const row = await fetchProductRow(productId);
  if (!row) {
    await safeDelete(getIndexName('products'), productId);
    return;
  }
  const doc = await mapProductDoc(row, providedCityIds);
  if (!doc) return;
  await safeIndex(getIndexName('products'), productId, doc);
};

const indexDealById = async (dealId, providedCityIds = null) => {
  if (!isOpenSearchEnabled()) return;
  const row = await fetchDealRow(dealId);
  if (!row) {
    await safeDelete(getIndexName('deals'), dealId);
    return;
  }
  const doc = await mapDealDoc(row, providedCityIds);
  if (!doc) return;
  await safeIndex(getIndexName('deals'), dealId, doc);
};

const indexSupplierById = async (supplierId) => {
  if (!isOpenSearchEnabled()) return;
  const row = await fetchSupplierRow(supplierId);
  if (!row) {
    await safeDelete(getIndexName('suppliers'), supplierId);
    return;
  }
  const doc = await mapSupplierDoc(row);
  if (!doc) return;
  await safeIndex(getIndexName('suppliers'), supplierId, doc);
};

const indexMasterProductById = async (masterProductId) => {
  if (!isOpenSearchEnabled()) return;
  const row = await fetchMasterProductRow(masterProductId);
  if (!row) {
    await safeDelete(getIndexName('master-products'), masterProductId);
    return;
  }
  const doc = await mapMasterProductDoc(row);
  if (!doc) return;
  await safeIndex(getIndexName('master-products'), masterProductId, doc);
};

const reindexProductsBySupplierId = async (supplierId) => {
  if (!isOpenSearchEnabled()) return;
  const result = await db.query('SELECT id FROM products WHERE supplier_id = $1', [
    supplierId,
  ]);
  if (result.rows.length === 0) return;
  const cityIds = await fetchCityIds(supplierId);
  await Promise.all(result.rows.map((row) => indexProductById(row.id, cityIds)));
};

const reindexDealsBySupplierId = async (supplierId) => {
  if (!isOpenSearchEnabled()) return;
  const result = await db.query('SELECT id FROM deals WHERE supplier_id = $1', [
    supplierId,
  ]);
  if (result.rows.length === 0) return;
  const cityIds = await fetchCityIds(supplierId);
  await Promise.all(result.rows.map((row) => indexDealById(row.id, cityIds)));
};

const deleteProductsBySupplierId = async (supplierId) => {
  const client = getOpenSearchClient();
  if (!client) return;
  try {
    await client.deleteByQuery({
      index: getIndexName('products'),
      body: { query: { term: { supplier_id: Number(supplierId) } } },
      refresh: shouldRefresh() ? 'wait_for' : false,
    });
  } catch (error) {
    logger.warn('OpenSearch deleteByQuery failed', { error: error.message });
  }
};

const deleteDealsBySupplierId = async (supplierId) => {
  const client = getOpenSearchClient();
  if (!client) return;
  try {
    await client.deleteByQuery({
      index: getIndexName('deals'),
      body: { query: { term: { supplier_id: Number(supplierId) } } },
      refresh: shouldRefresh() ? 'wait_for' : false,
    });
  } catch (error) {
    logger.warn('OpenSearch deleteByQuery failed', { error: error.message });
  }
};

module.exports = {
  indexProductById,
  indexDealById,
  indexSupplierById,
  indexMasterProductById,
  reindexProductsBySupplierId,
  reindexDealsBySupplierId,
  deleteProductsBySupplierId,
  deleteDealsBySupplierId,
};
