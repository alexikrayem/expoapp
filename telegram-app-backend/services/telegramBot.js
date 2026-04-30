// telegram-app-backend/services/telegramBot.js - Production-ready webhook implementation
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const db = require('../config/db');

const HTTP = Object.freeze({
  OK: Number.parseInt('200', 10),
  UNAUTHORIZED: Number.parseInt('401', 10),
  INTERNAL_SERVER_ERROR: Number.parseInt('500', 10),
  SERVICE_UNAVAILABLE: Number.parseInt('503', 10),
});

const TIMING = Object.freeze({
  WEBHOOK_RESET_DELAY_MS: Number.parseInt('1000', 10),
  POLLING_RESET_DELAY_MS: Number.parseInt('1000', 10),
  POLLING_INTERVAL_MS: Number.parseInt('2000', 10),
  CONFLICT_CLEANUP_DELAY_MS: Number.parseInt('5000', 10),
  CONFLICT_RETRY_DELAY_MS: Number.parseInt('10000', 10),
  BROADCAST_SEND_DELAY_MS: Number.parseInt('100', 10),
});

const TEST_ORDER_VALUES = Object.freeze({
  ORDER_ID: Number.parseInt('999', 10),
});

const TELEGRAM_BROADCAST_DEFAULT_RETRY_ATTEMPTS = Number.parseInt('3', 10);

const getTelegramStatusCode = function (error) {
  const responseStatus = Number(error?.response?.statusCode);
  if (Number.isFinite(responseStatus) && responseStatus > 0) {
    return responseStatus;
  }

  const fallbackCode = Number(error?.code);
  if (Number.isFinite(fallbackCode) && fallbackCode > 0) {
    return fallbackCode;
  }

  return 0;
};

const getRetryAfterSeconds = function (error) {
  const retryAfter = Number(
    error?.response?.body?.parameters?.retry_after ??
      error?.response?.parameters?.retry_after ??
      0
  );

  if (!Number.isFinite(retryAfter) || retryAfter < 1) {
    return 1;
  }

  return retryAfter;
};

const isConflictError = function (error) {
  const message = String(error?.message || '');
  return message.includes('409') || message.includes('Conflict');
};

const sendWithBackpressure = async function ({
  bot,
  chatId,
  text,
  options,
  maxAttempts,
  onRateLimitPause,
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await bot.sendMessage(chatId, text, options);
      return true;
    } catch (error) {
      const statusCode = getTelegramStatusCode(error);
      const shouldRetry = statusCode === 429 && attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      const waitSeconds = getRetryAfterSeconds(error);
      if (typeof onRateLimitPause === 'function') {
        onRateLimitPause(waitSeconds);
      }

      console.warn(
        `⚠️ Telegram 429 received. Pausing broadcast for ${waitSeconds}s before retrying...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    }
  }

  return false;
};

const telegramBotService = {
  bot: null,
  isInitialized: false,
  isInitializing: false,
  initializationPromise: null,
  useWebhook: process.env.NODE_ENV === 'production',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  webhookPath: '/api/telegram/webhook',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || null,

  async initializeBot() {
    if (this.isInitializing) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.isInitializing = true;
    this.initializationPromise = this._doInitialize();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
    }

    return this.initializationPromise;
  },

  async _doInitialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.warn(
        '⚠️ TELEGRAM_BOT_TOKEN not found - Telegram features will be disabled'
      );
      return;
    }

    try {
      const senderOnly = process.env.TELEGRAM_SENDER_ONLY === 'true';

      if (this.useWebhook && this.webhookUrl && !this.webhookSecret) {
        console.warn(
          '⚠️ TELEGRAM_WEBHOOK_SECRET is not set. Webhook requests are not origin-verified.'
        );
      }

      this.bot = new TelegramBot(token, {
        polling: false,
        webHook: false,
      });

      const botInfo = await this.bot.getMe();
      console.log(`✅ Telegram Bot connected: @${botInfo.username}`);

      if (!senderOnly) {
        if (this.useWebhook && this.webhookUrl) {
          await this.initializeWebhook();
        } else {
          await this.initializePolling();
        }

        this.setupBotHandlers();
      } else {
        console.log('✅ Telegram Bot initialized in sender-only mode');
      }

      this.isInitialized = true;
      console.log(
        `✅ Telegram Bot fully initialized (${this.useWebhook ? 'webhook' : 'polling'} mode)`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Telegram Bot:', error.message);

      if (isConflictError(error)) {
        console.log('🔄 Attempting to resolve bot conflict...');
        await this.handleBotConflict();
      }

      this.bot = null;
      this.isInitialized = false;
    }
  },

  async initializeWebhook() {
    if (!this.bot || !this.webhookUrl) {
      throw new Error('Bot or webhook URL not available');
    }

    try {
      await this.bot.deleteWebHook();
      console.log('🔄 Cleared existing webhook');

      await new Promise((resolve) =>
        setTimeout(resolve, TIMING.WEBHOOK_RESET_DELAY_MS)
      );

      const webhookFullUrl = `${this.webhookUrl}${this.webhookPath}`;
      const webhookOptions = {
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      };

      if (this.webhookSecret) {
        webhookOptions.secret_token = this.webhookSecret;
      }

      await this.bot.setWebHook(webhookFullUrl, webhookOptions);
      console.log(`✅ Webhook set successfully: ${webhookFullUrl}`);

      const webhookInfo = await this.bot.getWebHookInfo();
      console.log('📡 Webhook info:', {
        url: webhookInfo.url,
        pending_update_count: webhookInfo.pending_update_count,
        last_error_date: webhookInfo.last_error_date,
      });
    } catch (error) {
      console.error('❌ Failed to set webhook:', error.message);
      throw error;
    }
  },

  async initializePolling() {
    if (!this.bot) return;

    try {
      await this.bot.deleteWebHook();
      console.log('🔄 Cleared webhook for polling mode');

      await new Promise((resolve) =>
        setTimeout(resolve, TIMING.POLLING_RESET_DELAY_MS)
      );

      await this.bot.startPolling({
        restart: false,
        polling: {
          interval: TIMING.POLLING_INTERVAL_MS,
          autoStart: false,
          params: {
            timeout: 10,
            allowed_updates: ['message', 'callback_query'],
          },
        },
      });

      console.log('✅ Telegram Bot polling started successfully');
    } catch (error) {
      console.error('❌ Failed to start polling:', error.message);

      if (isConflictError(error)) {
        await this.handleBotConflict();
        return;
      }

      throw error;
    }
  },

  async handleBotConflict() {
    try {
      console.log('🔄 Resolving bot conflict...');

      if (!this.bot) {
        return;
      }

      if (typeof this.bot.isPolling === 'function' && this.bot.isPolling()) {
        await this.bot.stopPolling();
        console.log('🛑 Stopped existing polling');
      }

      await this.bot.deleteWebHook();
      console.log('🗑️ Deleted webhook');

      await new Promise((resolve) =>
        setTimeout(resolve, TIMING.CONFLICT_CLEANUP_DELAY_MS)
      );

      if (this.useWebhook && this.webhookUrl) {
        await this.initializeWebhook();
      } else {
        await this.initializePolling();
      }
    } catch (error) {
      console.error('❌ Failed to resolve bot conflict:', error.message);
    }
  },

  isValidWebhookSecret(req) {
    const secretRequired = this.useWebhook && Boolean(this.webhookUrl);
    if (!this.webhookSecret) {
      return !secretRequired;
    }

    const providedSecret =
      req?.get?.('x-telegram-bot-api-secret-token') ||
      req?.headers?.['x-telegram-bot-api-secret-token'];
    if (typeof providedSecret !== 'string') return false;

    const expectedBuffer = Buffer.from(this.webhookSecret);
    const providedBuffer = Buffer.from(providedSecret);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  },

  handleWebhookUpdate(req, res) {
    if (!this.bot) {
      return res
        .status(HTTP.SERVICE_UNAVAILABLE)
        .json({ error: 'Bot not initialized' });
    }

    if (this.useWebhook && this.webhookUrl && !this.webhookSecret) {
      return res
        .status(HTTP.SERVICE_UNAVAILABLE)
        .json({ error: 'Webhook secret is not configured' });
    }

    if (!this.isValidWebhookSecret(req)) {
      return res
        .status(HTTP.UNAUTHORIZED)
        .json({ error: 'Unauthorized webhook request' });
    }

    try {
      this.bot.processUpdate(req.body);
      return res.status(HTTP.OK).json({ ok: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res
        .status(HTTP.INTERNAL_SERVER_ERROR)
        .json({ error: 'Webhook processing failed' });
    }
  },

  setupBotHandlers() {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        await this.bot.sendMessage(
          chatId,
          `
🏥 *مرحباً بك في منصة المستلزمات الطبية*

أنا بوت إشعارات المنصة. سأقوم بإرسال:
• إشعارات الطلبات الجديدة للمندوبين
• تحديثات مهمة من إدارة المنصة

للمندوبين: تأكد من ربط حسابك مع المورد الخاص بك
للإدارة: استخدم /admin للوصول لأوامر الإدارة
                `,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error sending start message:', error);
      }
    });

    this.bot.onText(/\/admin/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        await this.bot.sendMessage(
          chatId,
          `
🔧 *أوامر الإدارة*

/broadcast <message> - إرسال رسالة جماعية
/stats - إحصائيات المنصة
/help - المساعدة
                `,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error sending admin message:', error);
      }
    });

    if (!this.useWebhook) {
      this.bot.on('polling_error', (error) => {
        console.error('Telegram Bot polling error:', error.message);

        if (isConflictError(error)) {
          console.log('🔄 Detected bot conflict, attempting restart...');
          setTimeout(() => {
            void this.handleBotConflict();
          }, TIMING.CONFLICT_RETRY_DELAY_MS);
        }
      });
    }

    this.bot.on('error', (error) => {
      console.error('Telegram Bot error:', error.message);
    });
  },

  async sendOrderNotificationToDeliveryAgent(orderData) {
    if (!this.isInitialized || !this.bot) {
      console.warn('⚠️ Bot not initialized, skipping order notification');
      return false;
    }

    try {
      const agentQuery = `
                SELECT da.*, s.name as supplier_name
                FROM delivery_agents da
                JOIN suppliers s ON da.supplier_id = s.id
                WHERE da.supplier_id = $1 AND da.is_active = true AND da.telegram_user_id IS NOT NULL
                LIMIT 1
            `;

      const agentResult = await db.query(agentQuery, [orderData.supplierId]);

      if (agentResult.rows.length === 0) {
        console.log(
          `⚠️ No active delivery agent with Telegram ID found for supplier ${orderData.supplierId}`
        );
        return false;
      }

      const agent = agentResult.rows[0];
      const chatId = agent.telegram_user_id;
      const orderMessage = this.formatOrderMessage(orderData, agent.supplier_name);

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ قبول الطلب', callback_data: `accept_order_${orderData.orderId}` },
            { text: '❌ رفض الطلب', callback_data: `reject_order_${orderData.orderId}` },
          ],
          [{ text: '📍 عرض الموقع', callback_data: `view_location_${orderData.orderId}` }],
        ],
      };

      await this.bot.sendMessage(chatId, orderMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      console.log(`✅ Order notification sent to delivery agent ${agent.full_name}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending order notification:', error.message);
      return false;
    }
  },

  formatOrderMessage(orderData, supplierName) {
    const items = orderData.items
      .map(
        (item) =>
          `• ${item.product_name} × ${item.quantity} (${item.price_at_time_of_order} د.إ)`
      )
      .join('\n');

    return `
🆕 *طلب توصيل جديد*

📦 *رقم الطلب:* #${orderData.orderId}
🏪 *المورد:* ${supplierName}
💰 *قيمة الطلب:* ${orderData.total_amount} د.إ

👤 *بيانات العميل:*
الاسم: ${orderData.customerInfo.name}
الهاتف: ${orderData.customerInfo.phone}

📍 *عنوان التوصيل:*
${orderData.customerInfo.address1}
${orderData.customerInfo.address2 ? `${orderData.customerInfo.address2}\n` : ''}${orderData.customerInfo.city}

📋 *المنتجات:*
${items}

⏰ *وقت الطلب:* ${new Date(orderData.orderDate).toLocaleString('ar-EG')}
        `;
  },

  async broadcastToAllUsers(message, adminUserId) {
    if (!this.isInitialized || !this.bot) {
      console.warn('⚠️ Bot not initialized, cannot broadcast message');
      return { successCount: 0, failCount: 0 };
    }

    try {
      const usersQuery = `
                SELECT DISTINCT telegram_user_id
                FROM (
                    SELECT CAST(user_id AS TEXT) as telegram_user_id FROM user_profiles WHERE user_id IS NOT NULL
                    UNION
                    SELECT telegram_user_id FROM delivery_agents WHERE telegram_user_id IS NOT NULL AND telegram_user_id != ''
                    UNION
                    SELECT CAST(telegram_user_id AS TEXT) FROM admins WHERE telegram_user_id IS NOT NULL
                ) as all_users
                WHERE telegram_user_id IS NOT NULL AND telegram_user_id != ''
            `;

      const result = await db.query(usersQuery);
      const users = result.rows;

      let successCount = 0;
      let failCount = 0;
      let pausedByRateLimitCount = 0;
      const maxBroadcastAttempts = Number(
        process.env.TELEGRAM_BROADCAST_RETRY_ATTEMPTS ||
          TELEGRAM_BROADCAST_DEFAULT_RETRY_ATTEMPTS
      );

      for (const user of users) {
        try {
          await sendWithBackpressure({
            bot: this.bot,
            chatId: user.telegram_user_id,
            text: `
📢 *رسالة من إدارة المنصة*

${message}

---
_تم إرسال هذه الرسالة من إدارة منصة المستلزمات الطبية_
                    `,
            options: { parse_mode: 'Markdown' },
            maxAttempts: maxBroadcastAttempts,
            onRateLimitPause: () => {
              pausedByRateLimitCount += 1;
            },
          });
          successCount += 1;

          await new Promise((resolve) =>
            setTimeout(resolve, TIMING.BROADCAST_SEND_DELAY_MS)
          );
        } catch (error) {
          console.error(
            `Failed to send message to user ${user.telegram_user_id}:`,
            error.message
          );
          failCount += 1;
        }
      }

      console.log(
        `📢 Broadcast completed: ${successCount} sent, ${failCount} failed, ${pausedByRateLimitCount} rate-limit pauses`
      );
      return { successCount, failCount, pausedByRateLimitCount };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { successCount: 0, failCount: 0, pausedByRateLimitCount: 0 };
    }
  },

  async getPlatformStats() {
    try {
      const statsQuery = `
                SELECT
                    (SELECT COUNT(*) FROM user_profiles) as total_users,
                    (SELECT COUNT(*) FROM suppliers WHERE is_active = true) as total_suppliers,
                    (SELECT COUNT(*) FROM delivery_agents WHERE is_active = true) as total_agents,
                    (SELECT COUNT(*) FROM orders WHERE DATE(order_date) = CURRENT_DATE) as orders_today,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(order_date) >= DATE_TRUNC('month', CURRENT_DATE)) as sales_this_month
                `;

      const result = await db.query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {
        total_users: 0,
        total_suppliers: 0,
        total_agents: 0,
        orders_today: 0,
        sales_this_month: 0,
      };
    }
  },

  async testDeliveryNotification() {
    if (process.env.NODE_ENV !== 'development') {
      return false;
    }

    const testOrderData = {
      orderId: TEST_ORDER_VALUES.ORDER_ID,
      supplierId: 1,
      total_amount: 150.0,
      items: [
        {
          product_name: 'Test Medicine',
          quantity: 2,
          price_at_time_of_order: 75.0,
        },
      ],
      customerInfo: {
        name: 'Test Customer',
        phone: '0501234567',
        address1: 'Test Address Line 1',
        address2: 'Test Address Line 2',
        city: 'Dubai',
      },
      orderDate: new Date().toISOString(),
    };

    console.log('🧪 Testing delivery notification system...');
    const result = await this.sendOrderNotificationToDeliveryAgent(testOrderData);
    console.log(`🧪 Test result: ${result ? 'SUCCESS' : 'FAILED'}`);
    return result;
  },

  getWebhookPath() {
    return this.webhookPath;
  },

  async shutdown() {
    try {
      if (this.bot) {
        if (
          typeof this.bot.isPolling === 'function' &&
          this.bot.isPolling()
        ) {
          await this.bot.stopPolling();
          console.log('✅ Telegram Bot polling stopped');
        }

        if (this.useWebhook) {
          await this.bot.deleteWebHook();
          console.log('✅ Telegram webhook deleted');
        }
      }
    } catch (error) {
      console.error('Error during bot shutdown:', error.message);
    } finally {
      this.isInitialized = false;
      this.bot = null;
    }
  },
};

module.exports = telegramBotService;
