// workers/pricingWorker.js
// Processes pricing adjustment jobs

require('dotenv').config();
require('../config/env');

const logger = require('../services/logger');
const { calculateDemandAndAdjustPercentage } = require('../services/pricingEngine');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const { createManagedWorker } = require('./createWorker');

const connection = getQueueConnection();

if (!isQueueEnabled()) {
  logger.warn('Queue is disabled (REDIS_URL not set). Pricing worker will exit.');
  process.exit(0);
}

const start = async () => {
  createManagedWorker({
    queueName: 'pricing',
    connection,
    concurrency: 1,
    logPrefix: 'Pricing worker',
    processor: async (job) => {
      if (job.name === 'pricing-adjustment') {
        await calculateDemandAndAdjustPercentage();
        return;
      }

      logger.warn('Unknown pricing job type', { jobName: job.name, jobId: job.id });
      throw new Error(`Unknown pricing job type: ${job.name}`);
    },
  });
};

start().catch((error) => {
  logger.error('Pricing worker startup failed', error);
  process.exit(1);
});
