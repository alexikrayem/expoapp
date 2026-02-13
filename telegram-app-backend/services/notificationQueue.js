// services/notificationQueue.js
// Order notification queue (BullMQ)

const { Queue } = require('bullmq');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const logger = require('./logger');

let notificationQueue = null;

const getNotificationQueue = () => {
  if (!isQueueEnabled()) return null;
  if (!notificationQueue) {
    const connection = getQueueConnection();
    notificationQueue = new Queue('notifications', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
  }
  return notificationQueue;
};

const enqueueOrderNotification = async (orderData) => {
  const queue = getNotificationQueue();
  if (!queue) return false;

  try {
    await queue.add('order-notification', orderData, {
      jobId: `order:${orderData.orderId}`,
    });
    return true;
  } catch (error) {
    logger.error('Failed to enqueue order notification', error);
    return false;
  }
};

module.exports = {
  getNotificationQueue,
  enqueueOrderNotification,
};
