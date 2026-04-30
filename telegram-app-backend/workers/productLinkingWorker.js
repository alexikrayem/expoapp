// workers/productLinkingWorker.js
// Processes product linking jobs

require('dotenv').config();
require('../config/env');

const logger = require('../services/logger');
const { linkProduct } = require('../services/productLinkingService');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const { createManagedWorker } = require('./createWorker');

const connection = getQueueConnection();

if (!isQueueEnabled()) {
  logger.warn('Queue is disabled (REDIS_URL not set). Linking worker will exit.');
  process.exit(0);
}

const start = async () => {
  createManagedWorker({
    queueName: 'linking',
    connection,
    concurrency: Number(process.env.LINKING_WORKER_CONCURRENCY || 2),
    logPrefix: 'Linking worker',
    processor: async (job) => {
      if (job.name === 'product-link') {
        const { productId, reason, forceRelink } = job.data || {};
        if (!productId) {
          throw new Error('Missing productId for linking job');
        }
        await linkProduct(productId, { reason, forceRelink });
        return;
      }

      logger.warn('Unknown linking job type', { jobName: job.name, jobId: job.id });
      throw new Error(`Unknown linking job type: ${job.name}`);
    },
  });
};

start().catch((error) => {
  logger.error('Linking worker startup failed', error);
  process.exit(1);
});
