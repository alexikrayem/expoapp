// workers/notificationWorker.js
// Processes order notification jobs

require('dotenv').config();
require('../config/env');

const { Worker } = require('bullmq');
const logger = require('../services/logger');
const telegramBotService = require('../services/telegramBot');
const { isQueueEnabled, getQueueConnection } = require('../config/queue');

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

  const worker = new Worker(
    'notifications',
    async (job) => {
      if (job.name === 'order-notification') {
        await telegramBotService.sendOrderNotificationToDeliveryAgent(job.data);
        return;
      }
      logger.warn(`Unknown job type: ${job.name}`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    logger.info('Notification job completed', { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('Notification job failed', error, { jobId: job?.id });
  });

  const shutdown = async (signal) => {
    logger.info(`Worker shutdown: ${signal}`);
    try {
      await worker.close();
    } catch (error) {
      logger.error('Worker shutdown error', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  logger.error('Worker startup failed', error);
  process.exit(1);
});
