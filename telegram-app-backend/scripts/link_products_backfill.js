// scripts/link_products_backfill.js
// Backfill product linking for existing products.

require('dotenv').config();
require('../config/env');

const db = require('../config/db');
const logger = require('../services/logger');
const { enqueueProductLinking } = require('../services/linkingQueue');
const { linkProduct } = require('../services/productLinkingService');
const { isQueueEnabled } = require('../config/queue');

const BATCH_SIZE = Number(process.env.LINK_BACKFILL_BATCH || 500);
const CONCURRENCY = Number(process.env.LINK_BACKFILL_CONCURRENCY || 3);

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

const fetchBatch = async (lastId) => {
  const result = await db.query(
    `
      SELECT id
      FROM products
      WHERE (linking_status IS NULL OR linking_status = 'pending')
        AND id > $1
      ORDER BY id
      LIMIT $2
    `,
    [Number(lastId) || 0, BATCH_SIZE]
  );
  return result.rows.map((row) => Number(row.id));
};

const run = async () => {
  let lastId = 0;
  let total = 0;
  const useQueue = isQueueEnabled();

  logger.info('[LinkBackfill] Starting backfill', { batchSize: BATCH_SIZE, useQueue });

  // Process in id-ordered batches to avoid skipping.
  while (true) {
    const batch = await fetchBatch(lastId);
    if (batch.length === 0) break;

    lastId = batch[batch.length - 1];
    total += batch.length;

    if (useQueue) {
      for (const productId of batch) {
        await enqueueProductLinking(productId, { reason: 'backfill', forceRelink: true });
      }
    } else {
      await mapWithConcurrency(batch, CONCURRENCY, (productId) =>
        linkProduct(productId, { reason: 'backfill', forceRelink: true })
      );
    }

    logger.info('[LinkBackfill] Processed batch', { lastId, batchSize: batch.length });
  }

  logger.info('[LinkBackfill] Completed', { totalProcessed: total });
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('[LinkBackfill] Failed', error);
    process.exit(1);
  });
