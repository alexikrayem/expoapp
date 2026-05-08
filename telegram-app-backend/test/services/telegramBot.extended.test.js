jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../../config/db');
const telegramBotService = require('../../services/telegramBot');

describe('telegramBotService extended behaviors', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBroadcastRetries = process.env.TELEGRAM_BROADCAST_RETRY_ATTEMPTS;
  const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();

    telegramBotService.bot = null;
    telegramBotService.isInitialized = false;
    telegramBotService.useWebhook = false;
    telegramBotService.webhookUrl = null;
    telegramBotService.webhookSecret = null;

    process.env.TELEGRAM_BROADCAST_RETRY_ATTEMPTS = '1';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.TELEGRAM_BROADCAST_RETRY_ATTEMPTS = originalBroadcastRetries;
    process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
  });

  describe('isValidWebhookSecret', () => {
    it('returns true when no secret is required', () => {
      telegramBotService.useWebhook = false;
      telegramBotService.webhookUrl = null;
      telegramBotService.webhookSecret = null;

      expect(telegramBotService.isValidWebhookSecret({ headers: {} })).toBe(true);
    });

    it('returns false when webhook secret is required but missing', () => {
      telegramBotService.useWebhook = true;
      telegramBotService.webhookUrl = 'https://example.com';
      telegramBotService.webhookSecret = null;

      expect(telegramBotService.isValidWebhookSecret({ headers: {} })).toBe(false);
    });

    it('returns false when provided secret does not match expected length/value', () => {
      telegramBotService.webhookSecret = 'expected-secret';

      const req = {
        headers: { 'x-telegram-bot-api-secret-token': 'short' },
        get: jest.fn().mockReturnValue('short'),
      };
      expect(telegramBotService.isValidWebhookSecret(req)).toBe(false);
    });

    it('returns true when provided secret matches', () => {
      telegramBotService.webhookSecret = 'expected-secret';
      const req = {
        headers: { 'x-telegram-bot-api-secret-token': 'expected-secret' },
        get: jest.fn().mockReturnValue('expected-secret'),
      };

      expect(telegramBotService.isValidWebhookSecret(req)).toBe(true);
    });
  });

  describe('handleWebhookUpdate', () => {
    const createRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    });

    it('returns 503 when bot is not initialized', () => {
      const res = createRes();

      telegramBotService.handleWebhookUpdate({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bot not initialized' });
    });

    it('returns 500 when processUpdate throws', () => {
      const res = createRes();
      telegramBotService.bot = {
        processUpdate: jest.fn(() => {
          throw new Error('update failed');
        }),
      };
      telegramBotService.webhookSecret = 'secret';

      telegramBotService.handleWebhookUpdate(
        {
          body: { update_id: 22 },
          headers: { 'x-telegram-bot-api-secret-token': 'secret' },
          get: jest.fn().mockReturnValue('secret'),
        },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing failed' });
    });
  });

  describe('sendOrderNotificationToDeliveryAgent', () => {
    const baseOrder = {
      orderId: 321,
      supplierId: 5,
      total_amount: 200,
      items: [{ product_name: 'Bandage', quantity: 2, price_at_time_of_order: 100 }],
      customerInfo: {
        name: 'Alice',
        phone: '0500000000',
        address1: 'Street 1',
        address2: '',
        city: 'Dubai',
      },
      orderDate: '2026-01-01T10:00:00.000Z',
    };

    it('returns false when bot is not initialized', async () => {
      telegramBotService.isInitialized = false;
      telegramBotService.bot = null;

      await expect(
        telegramBotService.sendOrderNotificationToDeliveryAgent(baseOrder)
      ).resolves.toBe(false);
    });

    it('returns false when there is no active delivery agent', async () => {
      telegramBotService.isInitialized = true;
      telegramBotService.bot = { sendMessage: jest.fn() };
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        telegramBotService.sendOrderNotificationToDeliveryAgent(baseOrder)
      ).resolves.toBe(false);
    });

    it('sends notification successfully to matched delivery agent', async () => {
      telegramBotService.isInitialized = true;
      telegramBotService.bot = { sendMessage: jest.fn().mockResolvedValue(true) };
      db.query.mockResolvedValueOnce({
        rows: [{
          telegram_user_id: '998877',
          full_name: 'Agent X',
          supplier_name: 'Supplier X',
        }],
      });

      await expect(
        telegramBotService.sendOrderNotificationToDeliveryAgent(baseOrder)
      ).resolves.toBe(true);

      expect(telegramBotService.bot.sendMessage).toHaveBeenCalledWith(
        '998877',
        expect.stringContaining('طلب توصيل جديد'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });
  });

  describe('broadcastToAllUsers', () => {
    it('returns zero counts when bot is not initialized', async () => {
      telegramBotService.isInitialized = false;
      telegramBotService.bot = null;

      await expect(
        telegramBotService.broadcastToAllUsers('hello world', 1)
      ).resolves.toEqual({ successCount: 0, failCount: 0 });
    });

    it('tracks success and failed broadcast sends', async () => {
      telegramBotService.isInitialized = true;
      telegramBotService.bot = {
        sendMessage: jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockRejectedValueOnce(new Error('send failed')),
      };
      db.query.mockResolvedValueOnce({
        rows: [
          { telegram_user_id: '100' },
          { telegram_user_id: '200' },
        ],
      });

      const result = await telegramBotService.broadcastToAllUsers('promo text', 9);

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.pausedByRateLimitCount).toBe(0);
      expect(telegramBotService.bot.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPlatformStats/testDeliveryNotification/shutdown', () => {
    it('returns default stats payload when stats query fails', async () => {
      db.query.mockRejectedValueOnce(new Error('stats unavailable'));

      const stats = await telegramBotService.getPlatformStats();

      expect(stats).toEqual({
        total_users: 0,
        total_suppliers: 0,
        total_agents: 0,
        orders_today: 0,
        sales_this_month: 0,
      });
    });

    it('returns false for testDeliveryNotification outside development', async () => {
      process.env.NODE_ENV = 'production';

      await expect(telegramBotService.testDeliveryNotification()).resolves.toBe(false);
    });

    it('delegates testDeliveryNotification to sendOrderNotification in development', async () => {
      process.env.NODE_ENV = 'development';
      const sendSpy = jest
        .spyOn(telegramBotService, 'sendOrderNotificationToDeliveryAgent')
        .mockResolvedValueOnce(true);

      await expect(telegramBotService.testDeliveryNotification()).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      sendSpy.mockRestore();
    });

    it('shutdown stops polling and removes webhook when configured', async () => {
      telegramBotService.useWebhook = true;
      telegramBotService.isInitialized = true;
      telegramBotService.bot = {
        isPolling: jest.fn().mockReturnValue(true),
        stopPolling: jest.fn().mockResolvedValue(true),
        deleteWebHook: jest.fn().mockResolvedValue(true),
      };

      await telegramBotService.shutdown();

      expect(telegramBotService.bot).toBeNull();
      expect(telegramBotService.isInitialized).toBe(false);
    });
  });
});
