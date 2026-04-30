// workers/notificationWorker.js
// Processes order notification jobs

require('dotenv').config();
require('../config/env');

const logger = require('../services/logger');
const telegramBotService = require('../services/telegramBot');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');
const { createManagedWorker } = require('./createWorker');
const { dispatchPendingNotifications } = require('../services/orderNotificationOutbox');

const connection = getQueueConnection();

if (!isQueueEnabled()) {
  logger.warn('Queue is disabled (REDIS_URL not set). Worker will exit.');
  process.exit(0);
}

const start = async () => {
  try {
    if (telegramBotService.initializeBot) {
      await telegramBotService.initializeBot();
    }
  } catch (error) {
    logger.error('Telegram bot initialization failed in worker', error);
  }

  createManagedWorker({
    queueName: 'notifications',
    connection,
    logPrefix: 'Notification worker',
    processor: async (job) => {
      if (job.name === 'order-notification') {
        await telegramBotService.sendOrderNotificationToDeliveryAgent(job.data);
        return;
      }

      logger.warn('Unknown notification job type', { jobName: job.name, jobId: job.id });
      throw new Error(`Unknown notification job type: ${job.name}`);
    },
  });

  const outboxPollIntervalMs = Number(process.env.NOTIFICATION_OUTBOX_POLL_MS || 5000);
  const pollOutbox = async () => {
    try {
      const result = await dispatchPendingNotifications({ limit: 25 });
      if (result.processed > 0) {
        logger.info('Pending notification outbox processed', result);
      }
    } catch (error) {
      logger.error('Pending notification outbox polling failed', error);
    }
  };

  await pollOutbox();
  setInterval(() => {
    void pollOutbox();
  }, outboxPollIntervalMs);
};

start().catch((error) => {
  logger.error('Worker startup failed', error);
  process.exit(1);
});
