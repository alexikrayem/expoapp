const loadOutboxService = ({
  clientQueryImpl,
  enqueueOrderNotificationImpl,
  sendOrderNotificationImpl,
} = {}) => {
  jest.resetModules();

  const client = {
    query: jest.fn(clientQueryImpl),
    release: jest.fn(),
  };
  const connect = jest.fn().mockResolvedValue(client);

  const db = {
    pool: { connect },
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    request: jest.fn(),
    query: jest.fn(),
  };
  const enqueueOrderNotification = jest
    .fn(enqueueOrderNotificationImpl)
    .mockResolvedValue(true);
  const telegramBotService = {
    sendOrderNotificationToDeliveryAgent: jest
      .fn(sendOrderNotificationImpl)
      .mockResolvedValue(true),
  };

  jest.doMock('../../config/db', () => db);
  jest.doMock('../../services/logger', () => logger);
  jest.doMock('../../services/notificationQueue', () => ({
    enqueueOrderNotification,
  }));
  jest.doMock('../../services/telegramBot', () => telegramBotService);

  const outbox = require('../../services/orderNotificationOutbox');
  return {
    outbox,
    db,
    connect,
    client,
    logger,
    enqueueOrderNotification,
    telegramBotService,
  };
};

describe('orderNotificationOutbox service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueuePendingOrderNotifications', () => {
    it('returns 0 when input is missing/invalid', async () => {
      const { outbox } = loadOutboxService();

      await expect(outbox.enqueuePendingOrderNotifications(null, [])).resolves.toBe(0);
      await expect(outbox.enqueuePendingOrderNotifications({}, null)).resolves.toBe(0);
      await expect(outbox.enqueuePendingOrderNotifications({}, [])).resolves.toBe(0);
    });

    it('inserts only valid pending notifications', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({}),
      };
      const { outbox } = loadOutboxService();

      const inserted = await outbox.enqueuePendingOrderNotifications(client, [
        { orderId: 101, supplierId: 5, text: 'valid 1' },
        { orderId: 'bad', supplierId: 5, text: 'invalid' },
        { orderId: 102, supplierId: 6, text: 'valid 2' },
      ]);

      expect(inserted).toBe(2);
      expect(client.query).toHaveBeenCalledTimes(2);
      expect(client.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO pending_notifications'),
        ['order-notification', 101, 5, expect.any(String), 'pending']
      );
    });

    it('logs warning and returns 0 when insert fails', async () => {
      const failingClient = {
        query: jest.fn().mockRejectedValue(new Error('insert failed')),
      };
      const { outbox, logger } = loadOutboxService();

      const inserted = await outbox.enqueuePendingOrderNotifications(failingClient, [
        { orderId: 101, supplierId: 5 },
      ]);

      expect(inserted).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unable to enqueue pending order notifications in outbox, falling back to immediate dispatch',
        { error: 'insert failed' }
      );
    });
  });

  describe('dispatchPendingNotifications', () => {
    it('processes pending notifications and marks them sent when queue accepts delivery', async () => {
      const { outbox, client, enqueueOrderNotification } = loadOutboxService({
        clientQueryImpl: (sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
          if (sql.includes('SELECT id, payload, attempts')) {
            return Promise.resolve({
              rows: [{ id: 1, payload: { orderId: 10, supplierId: 2 }, attempts: 0 }],
            });
          }
          if (sql.includes('SET status = $2')) {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      });

      const result = await outbox.dispatchPendingNotifications();

      expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
      expect(enqueueOrderNotification).toHaveBeenCalledWith({ orderId: 10, supplierId: 2 });
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $2'),
        [1, 'sent']
      );
      expect(client.release).toHaveBeenCalled();
    });

    it('falls back to immediate telegram send when queue enqueue returns false', async () => {
      const { outbox, enqueueOrderNotification, telegramBotService } = loadOutboxService({
        clientQueryImpl: (sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
          if (sql.includes('SELECT id, payload, attempts')) {
            return Promise.resolve({
              rows: [{ id: 2, payload: { orderId: 11, supplierId: 3 }, attempts: 0 }],
            });
          }
          return Promise.resolve({});
        },
      });
      enqueueOrderNotification.mockResolvedValueOnce(false);

      const result = await outbox.dispatchPendingNotifications();

      expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
      expect(telegramBotService.sendOrderNotificationToDeliveryAgent).toHaveBeenCalledWith({
        orderId: 11,
        supplierId: 3,
      });
    });

    it('marks retries and logs errors when delivery fails', async () => {
      const { outbox, enqueueOrderNotification, logger, client } = loadOutboxService({
        clientQueryImpl: (sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
          if (sql.includes('SELECT id, payload, attempts')) {
            return Promise.resolve({
              rows: [{ id: 3, payload: { orderId: 12 }, attempts: 2 }],
            });
          }
          if (sql.includes('SET attempts = attempts + 1')) {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      });
      enqueueOrderNotification.mockRejectedValueOnce(new Error('queue unavailable'));

      const result = await outbox.dispatchPendingNotifications();

      expect(result).toEqual({ processed: 1, sent: 0, failed: 1 });
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('SET attempts = attempts + 1'),
        [3, 'queue unavailable', '4']
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Pending order notification dispatch failed',
        expect.any(Error),
        expect.objectContaining({ pendingNotificationId: 3, retryDelayMinutes: 4 })
      );
    });

    it('rolls back and rethrows when dispatch transaction fails', async () => {
      const { outbox, client } = loadOutboxService({
        clientQueryImpl: (sql) => {
          if (sql === 'BEGIN') return Promise.resolve({});
          if (sql.includes('SELECT id, payload, attempts')) {
            return Promise.reject(new Error('select failed'));
          }
          if (sql === 'ROLLBACK') return Promise.resolve({});
          return Promise.resolve({});
        },
      });

      await expect(outbox.dispatchPendingNotifications()).rejects.toThrow('select failed');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('supports order-specific dispatch window', async () => {
      const { outbox, client } = loadOutboxService({
        clientQueryImpl: (sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
          if (sql.includes('SELECT id, payload, attempts')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({});
        },
      });

      const result = await outbox.dispatchPendingNotificationsForOrder('88');

      expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
      const selectCall = client.query.mock.calls.find((call) =>
        String(call[0]).includes('AND order_id = $2')
      );
      expect(selectCall).toBeTruthy();
      expect(selectCall[1]).toEqual(['pending', 88, 50]);
    });
  });
});
