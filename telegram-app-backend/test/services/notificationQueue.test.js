const loadNotificationQueueModule = ({ queueEnabled = true, addImplementation } = {}) => {
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

  const notificationQueue = require('../../services/notificationQueue');
  return { notificationQueue, Queue, add, logger };
};

describe('notificationQueue service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null queue instance when queues are disabled', () => {
    const { notificationQueue, Queue } = loadNotificationQueueModule({ queueEnabled: false });

    expect(notificationQueue.getNotificationQueue()).toBeNull();
    expect(Queue).not.toHaveBeenCalled();
  });

  it('creates a queue lazily and reuses it', () => {
    const { notificationQueue, Queue } = loadNotificationQueueModule({ queueEnabled: true });

    const first = notificationQueue.getNotificationQueue();
    const second = notificationQueue.getNotificationQueue();

    expect(first).toBe(second);
    expect(Queue).toHaveBeenCalledTimes(1);
    expect(Queue).toHaveBeenCalledWith('notifications', expect.objectContaining({
      connection: { url: 'redis://test' },
    }));
  });

  it('enqueues order notifications with stable job id', async () => {
    const { notificationQueue, add } = loadNotificationQueueModule({ queueEnabled: true });
    const orderData = {
      orderId: 123,
      supplierId: 45,
      message: 'New order',
    };

    await expect(notificationQueue.enqueueOrderNotification(orderData)).resolves.toBe(true);

    expect(add).toHaveBeenCalledWith('order-notification', orderData, {
      jobId: 'order:123',
    });
  });

  it('returns false and logs when enqueue fails', async () => {
    const { notificationQueue, logger } = loadNotificationQueueModule({
      queueEnabled: true,
      addImplementation: () => Promise.reject(new Error('queue failure')),
    });

    await expect(
      notificationQueue.enqueueOrderNotification({ orderId: 11 })
    ).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to enqueue order notification',
      expect.any(Error)
    );
  });
});
