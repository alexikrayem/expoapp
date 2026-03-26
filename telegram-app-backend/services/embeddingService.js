// services/embeddingService.js
const logger = require('./logger');

const EMBEDDINGS_URL = process.env.EMBEDDINGS_URL;
const EMBEDDINGS_API_KEY = process.env.EMBEDDINGS_API_KEY;
const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL;
const EMBEDDINGS_DIM = process.env.EMBEDDINGS_DIM ? Number(process.env.EMBEDDINGS_DIM) : null;
const EMBEDDINGS_TIMEOUT_MS = Number(process.env.EMBEDDINGS_TIMEOUT_MS || 8000);
const EMBEDDINGS_CACHE_SIZE = Number(process.env.EMBEDDINGS_CACHE_SIZE || 500);

const isEmbeddingsEnabled = () => Boolean(EMBEDDINGS_URL);

const cache = new Map();

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const getFromCache = (key) => {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
};

const setCache = (key, value) => {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  if (cache.size > EMBEDDINGS_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

const fetchEmbedding = async (text) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMBEDDINGS_TIMEOUT_MS);

  try {
    const payload = { input: text };
    if (EMBEDDINGS_MODEL) payload.model = EMBEDDINGS_MODEL;
    if (EMBEDDINGS_DIM) payload.dimensions = EMBEDDINGS_DIM;

    const response = await fetch(EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EMBEDDINGS_API_KEY ? { Authorization: `Bearer ${EMBEDDINGS_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const textBody = await response.text().catch(() => '');
      throw new Error(`Embedding request failed (${response.status}): ${textBody}`);
    }

    const data = await response.json();
    const embedding =
      data?.data?.[0]?.embedding ||
      data?.embedding ||
      data?.vector ||
      null;

    if (!Array.isArray(embedding)) {
      throw new Error('Embedding response missing vector');
    }

    return embedding;
  } finally {
    clearTimeout(timeout);
  }
};

const getEmbedding = async (text) => {
  if (!isEmbeddingsEnabled()) return null;
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const cached = getFromCache(normalized);
  if (cached) return cached;

  try {
    const embedding = await fetchEmbedding(normalized);
    setCache(normalized, embedding);
    return embedding;
  } catch (error) {
    logger.warn('Embedding generation failed', { error: error.message });
    return null;
  }
};

module.exports = {
  isEmbeddingsEnabled,
  getEmbedding,
};
