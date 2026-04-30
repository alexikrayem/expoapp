// scripts/opensearch_setup.js
require('dotenv').config();
const { getOpenSearchClient, getIndexName, isOpenSearchEnabled } = require('../config/opensearch');

const buildAnalysis = () => {
  const synonymsRaw = process.env.OPENSEARCH_SYNONYMS || '';
  const synonyms = synonymsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const filters = ['lowercase', 'asciifolding', 'arabic_normalization', 'arabic_stemmer', 'english_stemmer'];
  const analysis = {
    filter: {
      arabic_stemmer: { type: 'stemmer', language: 'arabic' },
      english_stemmer: { type: 'stemmer', language: 'english' },
    },
    analyzer: {
      multilang: {
        type: 'custom',
        tokenizer: 'standard',
        filter: filters,
      },
    },
  };

  if (synonyms.length > 0) {
    analysis.filter.synonym_filter = {
      type: 'synonym_graph',
      synonyms,
    };
    analysis.analyzer.multilang.filter = [...filters, 'synonym_filter'];
  }

  return analysis;
};

const baseTextField = { type: 'text', analyzer: 'multilang', fields: { keyword: { type: 'keyword' } } };

const getEmbeddingConfig = () => {
  const embeddingDim = Number(process.env.EMBEDDINGS_DIM || 768);
  return {
    embeddingDim,
    knnMethod: {
      engine: process.env.OPENSEARCH_KNN_ENGINE || 'nmslib',
      space_type: process.env.OPENSEARCH_KNN_SPACE || 'cosinesimil',
      name: process.env.OPENSEARCH_KNN_METHOD || 'hnsw',
      parameters: {
        ef_construction: Number(process.env.OPENSEARCH_KNN_EF_CONSTRUCTION || 128),
        m: Number(process.env.OPENSEARCH_KNN_M || 16),
      },
    },
  };
};

const buildEmbeddingField = ({ embeddingDim, knnMethod }) => ({
  type: 'knn_vector',
  dimension: embeddingDim,
  method: knnMethod,
});

const buildCommonIndexBody = () => ({
  settings: {
    number_of_shards: Number(process.env.OPENSEARCH_SHARDS || 1),
    number_of_replicas: Number(process.env.OPENSEARCH_REPLICAS || 1),
    index: { knn: true },
    analysis: buildAnalysis(),
  },
});

const buildProductProperties = (embeddingField) => ({
  id: { type: 'integer' },
  supplier_id: { type: 'integer' },
  supplier_name: baseTextField,
  supplier_is_active: { type: 'boolean' },
  name: baseTextField,
  description: baseTextField,
  category: baseTextField,
  standardized_name_input: baseTextField,
  image_url: { type: 'keyword' },
  price: { type: 'double' },
  discount_price: { type: 'double' },
  effective_selling_price: { type: 'double' },
  is_on_sale: { type: 'boolean' },
  stock_level: { type: 'integer' },
  master_product_id: { type: 'integer' },
  linking_status: { type: 'keyword' },
  created_at: { type: 'date' },
  updated_at: { type: 'date' },
  city_ids: { type: 'integer' },
  embedding: embeddingField,
});

const buildDealProperties = (embeddingField) => ({
  id: { type: 'integer' },
  supplier_id: { type: 'integer' },
  supplier_name: baseTextField,
  supplier_is_active: { type: 'boolean' },
  product_id: { type: 'integer' },
  product_name: baseTextField,
  title: baseTextField,
  description: baseTextField,
  discount_percentage: { type: 'double' },
  start_date: { type: 'date' },
  end_date: { type: 'date' },
  image_url: { type: 'keyword' },
  is_active: { type: 'boolean' },
  created_at: { type: 'date' },
  updated_at: { type: 'date' },
  city_ids: { type: 'integer' },
  embedding: embeddingField,
});

const buildMasterProductProperties = (embeddingField) => ({
  id: { type: 'integer' },
  standardized_name_normalized: baseTextField,
  display_name: baseTextField,
  description: baseTextField,
  image_url: { type: 'keyword' },
  brand: baseTextField,
  category: baseTextField,
  attributes: { type: 'object', enabled: false },
  created_at: { type: 'date' },
  updated_at: { type: 'date' },
  embedding: embeddingField,
});

const buildSupplierProperties = (embeddingField) => ({
  id: { type: 'integer' },
  name: baseTextField,
  category: baseTextField,
  location: baseTextField,
  description: baseTextField,
  image_url: { type: 'keyword' },
  rating: { type: 'double' },
  is_active: { type: 'boolean' },
  product_count: { type: 'integer' },
  created_at: { type: 'date' },
  updated_at: { type: 'date' },
  city_ids: { type: 'integer' },
  embedding: embeddingField,
});

const INDEX_PROPERTY_BUILDERS = Object.freeze({
  products: buildProductProperties,
  deals: buildDealProperties,
  'master-products': buildMasterProductProperties,
  suppliers: buildSupplierProperties,
});

const buildIndexBody = (type) => {
  const embeddingConfig = getEmbeddingConfig();
  const embeddingField = buildEmbeddingField(embeddingConfig);
  const common = buildCommonIndexBody();

  const builder = INDEX_PROPERTY_BUILDERS[type] || INDEX_PROPERTY_BUILDERS.suppliers;
  return {
    ...common,
    mappings: {
      properties: builder(embeddingField),
    },
  };
};

const ensureIndex = async (client, name, body) => {
  const exists = await client.indices.exists({ index: name });
  const existsValue = exists.body ?? exists;
  if (existsValue) {
    console.log(`[OpenSearch] Index exists: ${name}`);
    return;
  }
  await client.indices.create({ index: name, body });
  console.log(`[OpenSearch] Created index: ${name}`);
};

const run = async () => {
  if (!isOpenSearchEnabled()) {
    throw new Error('OPENSEARCH_URL is not set.');
  }
  const client = getOpenSearchClient();
  await ensureIndex(client, getIndexName('products'), buildIndexBody('products'));
  await ensureIndex(client, getIndexName('deals'), buildIndexBody('deals'));
  await ensureIndex(client, getIndexName('suppliers'), buildIndexBody('suppliers'));
  await ensureIndex(client, getIndexName('master-products'), buildIndexBody('master-products'));
};

run()
  .then(() => {
    console.log('[OpenSearch] setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[OpenSearch] setup failed', error.message);
    process.exit(1);
  });
