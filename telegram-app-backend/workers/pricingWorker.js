// workers/pricingWorker.js
// Processes pricing adjustment jobs

require('dotenv').config();
require('../config/env');

const { Worker } = require('bullmq');
const logger = require('../services/logger');
const { calculateDemandAndAdjustPercentage } = require('../services/pricingEngine');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');

const connection = getQueueConnection();

if (!isQueueEnabled()) {
  logger.warn('Queue is disabled (REDIS_URL not set). Pricing worker will exit.');
  process.exit(0);
}

const start = async () => {
  const worker = new Worker(
    'pricing',
    async (job) => {
      if (job.name === 'pricing-adjustment') {
        await calculateDemandAndAdjustPercentage();
        return;
      }
      logger.warn(`Unknown pricing job type: ${job.name}`);
    },
    { connection, concurrency: 1 }
  );

  worker.on('completed', (job) => {
    logger.info('Pricing job completed', { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('Pricing job failed', error, { jobId: job?.id });
  });

  const shutdown = async (signal) => {
    logger.info(`Pricing worker shutdown: ${signal}`);
    try {
      await worker.close();
    } catch (error) {
      logger.error('Pricing worker shutdown error', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  logger.error('Pricing worker startup failed', error);
  process.exit(1);
});
