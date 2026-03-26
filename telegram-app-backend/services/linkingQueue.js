// services/linkingQueue.js
// Product linking queue (BullMQ)

const { Queue } = require('bullmq');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const logger = require('./logger');

let linkingQueue = null;

const getLinkingQueue = () => {
  if (!isQueueEnabled()) return null;
  if (!linkingQueue) {
    const connection = getQueueConnection();
    linkingQueue = new Queue('linking', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
  }
  return linkingQueue;
};

const enqueueProductLinking = async (productId, options = {}) => {
  const queue = getLinkingQueue();
  if (!queue) return false;

  try {
    await queue.add(
      'product-link',
      {
        productId: Number(productId),
        reason: options.reason || 'unknown',
        forceRelink: Boolean(options.forceRelink),
      },
      {
        jobId: `product-link:${productId}`,
      }
    );
    return true;
  } catch (error) {
    logger.error('Failed to enqueue product linking job', error, { productId });
    return false;
  }
};

module.exports = {
  getLinkingQueue,
  enqueueProductLinking,
};
