const loadLinkingQueueModule = ({ queueEnabled = true, addImplementation } = {}) => {
  jest.resetModules();

  const add = jest.fn(addImplementation);
  const queueInstance = { add };
  const Queue = jest.fn(() => queueInstance);

  const isQueueEnabled = jest.fn(() => queueEnabled);
  const getQueueConnection = jest.fn(() => ({ url: 'redis://test' }));
  const logger = {
    error: jest.fn(),
  };

  jest.doMock('bullmq', () => ({ Queue }));
  jest.doMock('../../config/queue', () => ({
    isQueueEnabled,
    getQueueConnection,
  }));
  jest.doMock('../../services/logger', () => logger);

  const linkingQueue = require('../../services/linkingQueue');
  return { linkingQueue, Queue, add, logger };
};

describe('linkingQueue service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null queue instance when queues are disabled', () => {
    const { linkingQueue, Queue } = loadLinkingQueueModule({ queueEnabled: false });

    expect(linkingQueue.getLinkingQueue()).toBeNull();
    expect(Queue).not.toHaveBeenCalled();
  });

  it('creates a queue once and reuses it for subsequent calls', () => {
    const { linkingQueue, Queue } = loadLinkingQueueModule({ queueEnabled: true });

    const first = linkingQueue.getLinkingQueue();
    const second = linkingQueue.getLinkingQueue();

    expect(first).toBe(second);
    expect(Queue).toHaveBeenCalledTimes(1);
    expect(Queue).toHaveBeenCalledWith('linking', expect.objectContaining({
      connection: { url: 'redis://test' },
    }));
  });

  it('enqueues a linking job with normalized payload', async () => {
    const { linkingQueue, add } = loadLinkingQueueModule({ queueEnabled: true });

    await expect(
      linkingQueue.enqueueProductLinking('42', { reason: 'manual', forceRelink: 1 })
    ).resolves.toBe(true);

    expect(add).toHaveBeenCalledWith(
      'product-link',
      {
        productId: 42,
        reason: 'manual',
        forceRelink: true,
      },
      {
        jobId: 'product-link:42',
      }
    );
  });

  it('uses default reason and false forceRelink when options are omitted', async () => {
    const { linkingQueue, add } = loadLinkingQueueModule({ queueEnabled: true });

    await linkingQueue.enqueueProductLinking(99);

    expect(add).toHaveBeenCalledWith(
      'product-link',
      {
        productId: 99,
        reason: 'unknown',
        forceRelink: false,
      },
      {
        jobId: 'product-link:99',
      }
    );
  });

  it('returns false and logs when queue add fails', async () => {
    const { linkingQueue, logger } = loadLinkingQueueModule({
      queueEnabled: true,
      addImplementation: () => Promise.reject(new Error('queue failure')),
    });

    await expect(linkingQueue.enqueueProductLinking(7)).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to enqueue product linking job',
      expect.any(Error),
      { productId: 7 }
    );
  });
});
