const loadPricingQueueModule = ({ queueEnabled = true, addImplementation } = {}) => {
  jest.resetModules();

  const add = jest.fn(addImplementation);
  const queueInstance = { add };
  const Queue = jest.fn(() => queueInstance);

  const isQueueEnabled = jest.fn(() => queueEnabled);
  const getQueueConnection = jest.fn(() => ({ url: 'redis://test' }));
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  jest.doMock('bullmq', () => ({ Queue }));
  jest.doMock('../../config/queue', () => ({
    isQueueEnabled,
    getQueueConnection,
  }));
  jest.doMock('../../services/logger', () => logger);

  const pricingQueue = require('../../services/pricingQueue');
  return { pricingQueue, Queue, add, isQueueEnabled, getQueueConnection, logger };
};

describe('pricingQueue service', () => {
  const originalCron = process.env.PRICING_ADJUSTMENT_CRON;

  afterEach(() => {
    process.env.PRICING_ADJUSTMENT_CRON = originalCron;
    jest.clearAllMocks();
  });

  it('returns null when queue is disabled', () => {
    const { pricingQueue, Queue } = loadPricingQueueModule({ queueEnabled: false });

    expect(pricingQueue.getPricingQueue()).toBeNull();
    expect(Queue).not.toHaveBeenCalled();
  });

  it('lazily creates and reuses a single queue instance', () => {
    const { pricingQueue, Queue, getQueueConnection } = loadPricingQueueModule({ queueEnabled: true });

    const first = pricingQueue.getPricingQueue();
    const second = pricingQueue.getPricingQueue();

    expect(first).toBe(second);
    expect(Queue).toHaveBeenCalledTimes(1);
    expect(getQueueConnection).toHaveBeenCalledTimes(1);
    expect(Queue).toHaveBeenCalledWith('pricing', expect.objectContaining({
      connection: { url: 'redis://test' },
    }));
  });

  it('returns false when scheduling while queue is disabled', async () => {
    const { pricingQueue, add } = loadPricingQueueModule({ queueEnabled: false });

    await expect(pricingQueue.schedulePricingAdjustment()).resolves.toBe(false);
    expect(add).not.toHaveBeenCalled();
  });

  it('schedules recurring pricing job with default cron', async () => {
    delete process.env.PRICING_ADJUSTMENT_CRON;
    const { pricingQueue, add, logger } = loadPricingQueueModule({ queueEnabled: true });

    await expect(pricingQueue.schedulePricingAdjustment()).resolves.toBe(true);

    expect(add).toHaveBeenCalledWith(
      'pricing-adjustment',
      {},
      {
        repeat: { cron: '0 */6 * * *' },
        jobId: 'pricing-adjustment',
      }
    );
    expect(logger.info).toHaveBeenCalledWith('Scheduled pricing adjustment job', { cron: '0 */6 * * *' });
  });

  it('uses custom cron expression from environment', async () => {
    process.env.PRICING_ADJUSTMENT_CRON = '*/5 * * * *';
    const { pricingQueue, add } = loadPricingQueueModule({ queueEnabled: true });

    await pricingQueue.schedulePricingAdjustment();

    expect(add).toHaveBeenCalledWith(
      'pricing-adjustment',
      {},
      {
        repeat: { cron: '*/5 * * * *' },
        jobId: 'pricing-adjustment',
      }
    );
  });

  it('returns false and logs error when queue scheduling fails', async () => {
    const { pricingQueue, logger } = loadPricingQueueModule({
      queueEnabled: true,
      addImplementation: () => Promise.reject(new Error('queue add failed')),
    });

    await expect(pricingQueue.schedulePricingAdjustment()).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to schedule pricing adjustment job',
      expect.any(Error)
    );
  });
});
