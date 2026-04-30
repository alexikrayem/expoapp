const { Worker } = require('bullmq');
const logger = require('../services/logger');

const createManagedWorker = ({
  queueName,
  connection,
  processor,
  concurrency,
  logPrefix = 'Worker',
}) => {
  const workerOptions = { connection };
  if (Number.isFinite(concurrency) && concurrency > 0) {
    workerOptions.concurrency = concurrency;
  }

  const worker = new Worker(queueName, processor, workerOptions);

  worker.on('completed', (job) => {
    logger.info(`${logPrefix} job completed`, { jobId: job.id, queueName, jobName: job.name });
  });

  worker.on('failed', (job, error) => {
    logger.error(`${logPrefix} job failed`, error, { jobId: job?.id, queueName, jobName: job?.name });
  });

  const shutdown = async (signal) => {
    logger.info(`${logPrefix} shutdown`, { signal });
    try {
      await worker.close();
    } catch (error) {
      logger.error(`${logPrefix} shutdown error`, error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return worker;
};

module.exports = { createManagedWorker };
