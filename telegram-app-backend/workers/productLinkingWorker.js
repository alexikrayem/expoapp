// workers/productLinkingWorker.js
// Processes product linking jobs

require('dotenv').config();
require('../config/env');

const { Worker } = require('bullmq');
const logger = require('../services/logger');
const { linkProduct } = require('../services/productLinkingService');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');

const connection = getQueueConnection();

if (!isQueueEnabled()) {
  logger.warn('Queue is disabled (REDIS_URL not set). Linking worker will exit.');
  process.exit(0);
}

const start = async () => {
  const worker = new Worker(
    'linking',
    async (job) => {
      if (job.name === 'product-link') {
        const { productId, reason, forceRelink } = job.data || {};
        if (!productId) {
          throw new Error('Missing productId for linking job');
        }
        await linkProduct(productId, { reason, forceRelink });
        return;
      }
      logger.warn(`Unknown linking job type: ${job.name}`);
    },
    { connection, concurrency: Number(process.env.LINKING_WORKER_CONCURRENCY || 2) }
  );

  worker.on('completed', (job) => {
    logger.info('Linking job completed', { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('Linking job failed', error, { jobId: job?.id });
  });

  const shutdown = async (signal) => {
    logger.info(`Linking worker shutdown: ${signal}`);
    try {
      await worker.close();
    } catch (error) {
      logger.error('Linking worker shutdown error', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  logger.error('Linking worker startup failed', error);
  process.exit(1);
});
