// scripts/opensearch_reindex.js
require('dotenv').config();
const db = require('../config/db');
const { getOpenSearchClient, getIndexName, isOpenSearchEnabled } = require('../config/opensearch');
const { getEmbedding, isEmbeddingsEnabled } = require('../services/embeddingService');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const BATCH_SIZE = Number(process.env.OPENSEARCH_REINDEX_BATCH || 500);
const EMBEDDINGS_CONCURRENCY = Number(process.env.EMBEDDINGS_CONCURRENCY || 3);

const PRODUCTS_QUERY = `
  SELECT p.*, s.name as supplier_name, s.is_active as supplier_is_active,
         ${EFFECTIVE_PRICE_SQL} as effective_selling_price,
         ARRAY_REMOVE(ARRAY_AGG(sc.city_id), NULL) as city_ids
  FROM products p
  JOIN suppliers s ON p.supplier_id = s.id
  LEFT JOIN master_products mp ON p.master_product_id = mp.id
  LEFT JOIN supplier_cities sc ON sc.supplier_id = s.id
  GROUP BY p.id, s.id, mp.id
`;

const DEALS_QUERY = `
  SELECT d.*, s.name as supplier_name, s.is_active as supplier_is_active,
         p.name as product_name,
         ARRAY_REMOVE(ARRAY_AGG(sc.city_id), NULL) as city_ids
  FROM deals d
  JOIN suppliers s ON d.supplier_id = s.id
  LEFT JOIN products p ON d.product_id = p.id
  LEFT JOIN supplier_cities sc ON sc.supplier_id = s.id
  GROUP BY d.id, s.id, p.id
`;

const SUPPLIERS_QUERY = `
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
         COUNT(p.id) as product_count,
         ARRAY_REMOVE(ARRAY_AGG(sc.city_id), NULL) as city_ids
  FROM suppliers s
  LEFT JOIN products p ON s.id = p.supplier_id
  LEFT JOIN supplier_cities sc ON sc.supplier_id = s.id
  GROUP BY s.id
`;

const MASTER_PRODUCTS_QUERY = `
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
`;

const withFallbackCityIds = (cityIds) => cityIds || [];

const mapProductRow = (row) => ({
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
  city_ids: withFallbackCityIds(row.city_ids),
});

const mapDealRow = (row) => ({
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
  city_ids: withFallbackCityIds(row.city_ids),
});

const mapSupplierRow = (row) => ({
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
  city_ids: withFallbackCityIds(row.city_ids),
});

const mapMasterProductRow = (row) => ({
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
});

const mapWithConcurrency = async (items, concurrency, iterator) => {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await iterator(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
};

const attachEmbeddings = async (rows, buildEmbeddingParts) => {
  if (!isEmbeddingsEnabled()) return rows;

  return mapWithConcurrency(rows, EMBEDDINGS_CONCURRENCY, async (row) => {
    const embeddingText = buildEmbeddingParts(row).filter(Boolean).join(' ');
    if (!embeddingText) return row;

    const embedding = await getEmbedding(embeddingText);
    return { ...row, ...(embedding ? { embedding } : {}) };
  });
};

const fetchProducts = async () => {
  const result = await db.query(PRODUCTS_QUERY);
  const rows = result.rows.map(mapProductRow);
  return attachEmbeddings(rows, (row) => [
    row.name,
    row.standardized_name_input,
    row.category,
    row.supplier_name,
    row.description,
  ]);
};

const fetchDeals = async () => {
  const result = await db.query(DEALS_QUERY);
  const rows = result.rows.map(mapDealRow);
  return attachEmbeddings(rows, (row) => [
    row.title,
    row.description,
    row.product_name,
    row.supplier_name,
  ]);
};

const fetchSuppliers = async () => {
  const result = await db.query(SUPPLIERS_QUERY);
  const rows = result.rows.map(mapSupplierRow);
  return attachEmbeddings(rows, (row) => [
    row.name,
    row.category,
    row.location,
    row.description,
  ]);
};

const fetchMasterProducts = async () => {
  const result = await db.query(MASTER_PRODUCTS_QUERY);
  const rows = result.rows.map(mapMasterProductRow);
  return attachEmbeddings(rows, (row) => [
    row.display_name,
    row.standardized_name_normalized,
    row.category,
    row.brand,
    row.description,
  ]);
};

async function bulkIndex(client, indexName, docs) {
  if (docs.length === 0) return;

  const body = [];
  for (const doc of docs) {
    body.push({ index: { _index: indexName, _id: String(doc.id) } });
    body.push(doc);
  }

  await client.bulk({ refresh: false, body });
}

const chunk = (items, size) => {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const run = async () => {
  if (!isOpenSearchEnabled()) {
    throw new Error('OPENSEARCH_URL is not set.');
  }
  const client = getOpenSearchClient();

  const [products, deals, suppliers, masterProducts] = await Promise.all([
    fetchProducts(),
    fetchDeals(),
    fetchSuppliers(),
    fetchMasterProducts(),
  ]);

  for (const batch of chunk(products, BATCH_SIZE)) {
    await bulkIndex(client, getIndexName('products'), batch);
  }
  for (const batch of chunk(deals, BATCH_SIZE)) {
    await bulkIndex(client, getIndexName('deals'), batch);
  }
  for (const batch of chunk(suppliers, BATCH_SIZE)) {
    await bulkIndex(client, getIndexName('suppliers'), batch);
  }
  for (const batch of chunk(masterProducts, BATCH_SIZE)) {
    await bulkIndex(client, getIndexName('master-products'), batch);
  }
};

run()
  .then(() => {
    console.log('[OpenSearch] reindex complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[OpenSearch] reindex failed', error.message);
    process.exit(1);
  });
