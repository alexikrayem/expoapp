// services/queueMonitor.js
// Queue monitoring helpers

const { isQueueEnabled } = require('../config/queue');
const { getNotificationQueue } = require('./notificationQueue');
const { getPricingQueue } = require('./pricingQueue');
const { getLinkingQueue } = require('./linkingQueue');

const getQueueCounts = async (queue) => {
  return queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
};

const getQueueStats = async () => {
  if (!isQueueEnabled()) {
    return { enabled: false, queues: {} };
  }

  const queues = {
    notifications: getNotificationQueue(),
    pricing: getPricingQueue(),
    linking: getLinkingQueue(),
  };

  const result = {};
  for (const [name, queue] of Object.entries(queues)) {
    if (!queue) {
      result[name] = { enabled: false };
      continue;
    }

    const counts = await getQueueCounts(queue);
    let repeatable = 0;
    try {
      const repeatJobs = await queue.getRepeatableJobs();
      repeatable = repeatJobs.length;
    } catch (_) {
      repeatable = 0;
    }

    result[name] = {
      enabled: true,
      counts,
      repeatable,
    };
  }

  return { enabled: true, queues: result };
};

module.exports = {
  getQueueStats,
};
