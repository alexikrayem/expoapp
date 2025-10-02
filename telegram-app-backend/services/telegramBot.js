// telegram-app-backend/services/telegramBot.js - Production-ready webhook implementation
const TelegramBot = require('node-telegram-bot-api');
const db = require('../config/db');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;
        this.useWebhook = process.env.NODE_ENV === 'production';
        this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
        this.webhookPath = '/api/telegram/webhook';
    }

    async initializeBot() {
        // Prevent multiple initialization attempts
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
    }

    async _doInitialize() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
            console.warn('⚠️ TELEGRAM_BOT_TOKEN not found - Telegram features will be disabled');
            return;
        }

        try {
            // Create bot instance
            this.bot = new TelegramBot(token, { 
                polling: false, // Never use polling initially
                webHook: false 
            });
            
            // Test bot connection first
            const botInfo = await this.bot.getMe();
            console.log(`✅ Telegram Bot connected: @${botInfo.username}`);
            
            // Choose initialization method based on environment
            if (this.useWebhook && this.webhookUrl) {
                await this.initializeWebhook();
            } else {
                await this.initializePolling();
            }
            
            this.setupBotHandlers();
            this.isInitialized = true;
            console.log(`✅ Telegram Bot fully initialized (${this.useWebhook ? 'webhook' : 'polling'} mode)`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Telegram Bot:', error.message);
            
            // If it's a conflict error, try to handle gracefully
            if (error.message.includes('409') || error.message.includes('Conflict')) {
                console.log('🔄 Attempting to resolve bot conflict...');
                await this.handleBotConflict();
            }
            
            // Don't throw error - let app continue without bot
            this.bot = null;
            this.isInitialized = false;
        }
    }

    async initializeWebhook() {
        if (!this.bot || !this.webhookUrl) {
            throw new Error('Bot or webhook URL not available');
        }

        try {
            // Delete any existing webhook first
            await this.bot.deleteWebHook();
            console.log('🔄 Cleared existing webhook');
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Set new webhook
            const webhookFullUrl = `${this.webhookUrl}${this.webhookPath}`;
            await this.bot.setWebHook(webhookFullUrl, {
                allowed_updates: ['message', 'callback_query'],
                drop_pending_updates: true
            });
            
            console.log(`✅ Webhook set successfully: ${webhookFullUrl}`);
            
            // Verify webhook
            const webhookInfo = await this.bot.getWebHookInfo();
            console.log('📡 Webhook info:', {
                url: webhookInfo.url,
                pending_update_count: webhookInfo.pending_update_count,
                last_error_date: webhookInfo.last_error_date
            });
            
        } catch (error) {
            console.error('❌ Failed to set webhook:', error.message);
            throw error;
        }
    }

    async initializePolling() {
        if (!this.bot) return;
        
        try {
            // Ensure no webhook is set
            await this.bot.deleteWebHook();
            console.log('🔄 Cleared webhook for polling mode');
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Start polling with better configuration
            await this.bot.startPolling({
                restart: false,
                polling: {
                    interval: 2000,
                    autoStart: false,
                    params: {
                        timeout: 10,
                        allowed_updates: ['message', 'callback_query']
                    }
                }
            });
            
            console.log('✅ Telegram Bot polling started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start polling:', error.message);
            
            // If conflict, try to resolve
            if (error.message.includes('409') || error.message.includes('Conflict')) {
                await this.handleBotConflict();
            } else {
                throw error;
            }
        }
    }

    async handleBotConflict() {
        try {
            console.log('🔄 Resolving bot conflict...');
            
            if (this.bot) {
                // Stop any existing polling
                if (this.bot.isPolling()) {
                    await this.bot.stopPolling();
                    console.log('🛑 Stopped existing polling');
                }
                
                // Delete webhook to clear any conflicts
                await this.bot.deleteWebHook();
                console.log('🗑️ Deleted webhook');
                
                // Wait longer to ensure cleanup
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Try to reinitialize based on environment
                if (this.useWebhook && this.webhookUrl) {
                    await this.initializeWebhook();
                } else {
                    await this.initializePolling();
                }
            }
        } catch (error) {
            console.error('❌ Failed to resolve bot conflict:', error.message);
            // Don't throw - let app continue without bot
        }
    }

    // Webhook handler for production
    handleWebhookUpdate(req, res) {
        if (!this.bot) {
            return res.status(503).json({ error: 'Bot not initialized' });
        }

        try {
            this.bot.processUpdate(req.body);
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    setupBotHandlers() {
        if (!this.bot) return;

        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                await this.bot.sendMessage(chatId, `
🏥 *مرحباً بك في منصة المستلزمات الطبية*

أنا بوت إشعارات المنصة. سأقوم بإرسال:
• إشعارات الطلبات الجديدة للمندوبين
• تحديثات مهمة من إدارة المنصة

للمندوبين: تأكد من ربط حسابك مع المورد الخاص بك
للإدارة: استخدم /admin للوصول لأوامر الإدارة
                `, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error('Error sending start message:', error);
            }
        });

        // Admin command
        this.bot.onText(/\/admin/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                // Check if user is admin (you can implement this check)
                await this.bot.sendMessage(chatId, `
🔧 *أوامر الإدارة*

/broadcast <message> - إرسال رسالة جماعية
/stats - إحصائيات المنصة
/help - المساعدة
                `, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error('Error sending admin message:', error);
            }
        });

        // Handle polling errors gracefully (only in polling mode)
        if (!this.useWebhook) {
            this.bot.on('polling_error', (error) => {
                console.error('Telegram Bot polling error:', error.message);
                
                // If it's a conflict error, try to restart
                if (error.message.includes('409') || error.message.includes('Conflict')) {
                    console.log('🔄 Detected bot conflict, attempting restart...');
                    setTimeout(() => {
                        this.handleBotConflict();
                    }, 10000); // Wait 10 seconds before retry
                }
            });
        }

        // Handle other errors
        this.bot.on('error', (error) => {
            console.error('Telegram Bot error:', error.message);
        });
    }

    async sendOrderNotificationToDeliveryAgent(orderData) {
        if (!this.isInitialized || !this.bot) {
            console.warn('⚠️ Bot not initialized, skipping order notification');
            return false;
        }

        try {
            // Get delivery agent info for the supplier
            const agentQuery = `
                SELECT da.*, s.name as supplier_name
                FROM delivery_agents da
                JOIN suppliers s ON da.supplier_id = s.id
                WHERE da.supplier_id = $1 AND da.is_active = true AND da.telegram_user_id IS NOT NULL
                LIMIT 1
            `;
            
            const agentResult = await db.query(agentQuery, [orderData.supplierId]);
            
            if (agentResult.rows.length === 0) {
                console.log(`⚠️ No active delivery agent with Telegram ID found for supplier ${orderData.supplierId}`);
                return false;
            }

            const agent = agentResult.rows[0];
            const chatId = agent.telegram_user_id;

            // Format order message
            const orderMessage = this.formatOrderMessage(orderData, agent.supplier_name);
            
            // Create inline keyboard for order actions
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ قبول الطلب', callback_data: `accept_order_${orderData.orderId}` },
                        { text: '❌ رفض الطلب', callback_data: `reject_order_${orderData.orderId}` }
                    ],
                    [
                        { text: '📍 عرض الموقع', callback_data: `view_location_${orderData.orderId}` }
                    ]
                ]
            };
            
            await this.bot.sendMessage(chatId, orderMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

            console.log(`✅ Order notification sent to delivery agent ${agent.full_name}`);
            return true;

        } catch (error) {
            console.error('❌ Error sending order notification:', error.message);
            return false;
        }
    }

    formatOrderMessage(orderData, supplierName) {
        const items = orderData.items.map(item => 
            `• ${item.product_name} × ${item.quantity} (${item.price_at_time_of_order} د.إ)`
        ).join('\n');

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
${orderData.customerInfo.address2 ? orderData.customerInfo.address2 + '\n' : ''}${orderData.customerInfo.city}

📋 *المنتجات:*
${items}

⏰ *وقت الطلب:* ${new Date(orderData.orderDate).toLocaleString('ar-EG')}
        `;
    }

    async broadcastToAllUsers(message, adminUserId) {
        if (!this.isInitialized || !this.bot) {
            console.warn('⚠️ Bot not initialized, cannot broadcast message');
            return { successCount: 0, failCount: 0 };
        }

        try {
            // Get all users who have interacted with the bot
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

            for (const user of users) {
                try {
                    await this.bot.sendMessage(user.telegram_user_id, `
📢 *رسالة من إدارة المنصة*

${message}

---
_تم إرسال هذه الرسالة من إدارة منصة المستلزمات الطبية_
                    `, { parse_mode: 'Markdown' });
                    successCount++;
                    
                    // Add small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Failed to send message to user ${user.telegram_user_id}:`, error.message);
                    failCount++;
                }
            }

            console.log(`📢 Broadcast completed: ${successCount} sent, ${failCount} failed`);
            return { successCount, failCount };

        } catch (error) {
            console.error('Error broadcasting message:', error);
            return { successCount: 0, failCount: 0 };
        }
    }

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
                sales_this_month: 0
            };
        }
    }

    // Test delivery notification (only in development)
    async testDeliveryNotification() {
        if (process.env.NODE_ENV !== 'development') {
            return false;
        }

        const testOrderData = {
            orderId: 999,
            supplierId: 1,
            total_amount: 150.00,
            items: [
                {
                    product_name: 'Test Medicine',
                    quantity: 2,
                    price_at_time_of_order: 75.00
                }
            ],
            customerInfo: {
                name: 'Test Customer',
                phone: '0501234567',
                address1: 'Test Address Line 1',
                address2: 'Test Address Line 2',
                city: 'Dubai'
            },
            orderDate: new Date().toISOString()
        };

        console.log('🧪 Testing delivery notification system...');
        const result = await this.sendOrderNotificationToDeliveryAgent(testOrderData);
        console.log(`🧪 Test result: ${result ? 'SUCCESS' : 'FAILED'}`);
        return result;
    }

    // Get webhook path for Express route setup
    getWebhookPath() {
        return this.webhookPath;
    }

    // Graceful shutdown
    async shutdown() {
        try {
            if (this.bot) {
                if (this.bot.isPolling()) {
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
    }
}

// Create singleton instance
let telegramBotServiceInstance = null;

const getTelegramBotService = () => {
    if (!telegramBotServiceInstance) {
        telegramBotServiceInstance = new TelegramBotService();
    }
    return telegramBotServiceInstance;
};

module.exports = getTelegramBotService();