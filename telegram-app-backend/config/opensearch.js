// config/opensearch.js
const { Client } = require('@opensearch-project/opensearch');

const OPENSEARCH_URL = process.env.OPENSEARCH_URL;
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME;
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD;
const OPENSEARCH_SSL_REJECT_UNAUTHORIZED =
  process.env.OPENSEARCH_SSL_REJECT_UNAUTHORIZED !== 'false';

const INDEX_PREFIX = process.env.OPENSEARCH_INDEX_PREFIX || 'tma';

let client = null;

const isOpenSearchEnabled = () => Boolean(OPENSEARCH_URL);

const getIndexName = (suffix) => `${INDEX_PREFIX}-${suffix}`;

const getOpenSearchClient = () => {
  if (!isOpenSearchEnabled()) return null;
  if (!client) {
    const options = {
      node: OPENSEARCH_URL,
    };
    if (OPENSEARCH_USERNAME && OPENSEARCH_PASSWORD) {
      options.auth = {
        username: OPENSEARCH_USERNAME,
        password: OPENSEARCH_PASSWORD,
      };
    }
    if (OPENSEARCH_URL.startsWith('https')) {
      options.ssl = { rejectUnauthorized: OPENSEARCH_SSL_REJECT_UNAUTHORIZED };
    }
    client = new Client(options);
  }
  return client;
};

module.exports = {
  OPENSEARCH_URL,
  OPENSEARCH_USERNAME,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_SSL_REJECT_UNAUTHORIZED,
  INDEX_PREFIX,
  isOpenSearchEnabled,
  getIndexName,
  getOpenSearchClient,
};
