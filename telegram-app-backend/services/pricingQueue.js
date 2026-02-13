// services/pricingQueue.js
// Pricing adjustment queue scheduling (BullMQ)

const { Queue } = require('bullmq');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const logger = require('./logger');

let pricingQueue = null;

const getPricingQueue = () => {
  if (!isQueueEnabled()) return null;
  if (!pricingQueue) {
    const connection = getQueueConnection();
    pricingQueue = new Queue('pricing', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return pricingQueue;
};

const schedulePricingAdjustment = async () => {
  const queue = getPricingQueue();
  if (!queue) return false;

  const cron = process.env.PRICING_ADJUSTMENT_CRON || '0 */6 * * *';

  try {
    await queue.add(
      'pricing-adjustment',
      {},
      {
        repeat: { cron },
        jobId: 'pricing-adjustment',
      }
    );
    logger.info('Scheduled pricing adjustment job', { cron });
    return true;
  } catch (error) {
    logger.error('Failed to schedule pricing adjustment job', error);
    return false;
  }
};

module.exports = {
  schedulePricingAdjustment,
  getPricingQueue,
};
