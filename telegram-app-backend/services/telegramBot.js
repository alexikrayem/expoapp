// telegram-app-backend/services/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const db = require('../config/db');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.isInitialized = false;
        this.initializeBot();
    }

    initializeBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
            console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
            return;
        }

        try {
            this.bot = new TelegramBot(token, { polling: true });
            this.setupBotHandlers();
            this.isInitialized = true;
            console.log('✅ Telegram Bot initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Telegram Bot:', error);
        }
    }

    setupBotHandlers() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            await this.bot.sendMessage(chatId, `
🏥 *مرحباً بك في منصة المستلزمات الطبية*

أنا بوت إشعارات المنصة. سأقوم بإرسال:
• إشعارات الطلبات الجديدة للمندوبين
• تحديثات مهمة من إدارة المنصة

للمندوبين: تأكد من ربط حسابك مع المورد الخاص بك
للإدارة: استخدم /admin للوصول لأوامر الإدارة
            `, { parse_mode: 'Markdown' });
        });

        // Admin commands
        this.bot.onText(/\/admin/, async (msg) => {
            const userId = msg.from.id;
            
            // Check if user is admin
            const isAdmin = await this.checkIfUserIsAdmin(userId);
            
            if (!isAdmin) {
                await this.bot.sendMessage(msg.chat.id, '❌ غير مصرح لك بالوصول لأوامر الإدارة');
                return;
            }

            const adminKeyboard = {
                inline_keyboard: [
                    [{ text: '📢 إرسال رسالة لجميع المستخدمين', callback_data: 'admin_broadcast' }],
                    [{ text: '📊 إحصائيات المنصة', callback_data: 'admin_stats' }],
                    [{ text: '👥 قائمة الموردين', callback_data: 'admin_suppliers' }],
                    [{ text: '🚚 قائمة المندوبين', callback_data: 'admin_agents' }]
                ]
            };

            await this.bot.sendMessage(msg.chat.id, '🔧 *لوحة تحكم الإدارة*\nاختر الإجراء المطلوب:', {
                parse_mode: 'Markdown',
                reply_markup: adminKeyboard
            });
        });

        // Handle callback queries (button presses)
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const userId = callbackQuery.from.id;
            const data = callbackQuery.data;

            await this.bot.answerCallbackQuery(callbackQuery.id);

            if (data.startsWith('admin_')) {
                await this.handleAdminCallback(chatId, userId, data);
            }
        });

        // Handle text messages for admin broadcast
        this.bot.on('message', async (msg) => {
            if (msg.text && msg.text.startsWith('/broadcast ')) {
                const userId = msg.from.id;
                const isAdmin = await this.checkIfUserIsAdmin(userId);
                
                if (!isAdmin) {
                    await this.bot.sendMessage(msg.chat.id, '❌ غير مصرح لك بإرسال رسائل جماعية');
                    return;
                }

                const message = msg.text.replace('/broadcast ', '');
                await this.broadcastToAllUsers(message, userId);
                await this.bot.sendMessage(msg.chat.id, '✅ تم إرسال الرسالة لجميع المستخدمين');
            }
        });

        this.bot.on('polling_error', (error) => {
            console.error('Telegram Bot polling error:', error);
        });
    }

    async handleAdminCallback(chatId, userId, data) {
        const isAdmin = await this.checkIfUserIsAdmin(userId);
        if (!isAdmin) return;

        switch (data) {
            case 'admin_broadcast':
                await this.bot.sendMessage(chatId, `
📢 *إرسال رسالة جماعية*

لإرسال رسالة لجميع مستخدمي المنصة، استخدم:
\`/broadcast رسالتك هنا\`

مثال:
\`/broadcast عرض خاص: خصم 20% على جميع المنتجات!\`
                `, { parse_mode: 'Markdown' });
                break;

            case 'admin_stats':
                const stats = await this.getPlatformStats();
                await this.bot.sendMessage(chatId, `
📊 *إحصائيات المنصة*

👥 المستخدمين: ${stats.totalUsers}
🏪 الموردين: ${stats.totalSuppliers}
🚚 المندوبين: ${stats.totalAgents}
📦 الطلبات اليوم: ${stats.ordersToday}
💰 مبيعات الشهر: ${stats.salesThisMonth} د.إ
                `, { parse_mode: 'Markdown' });
                break;

            case 'admin_suppliers':
                const suppliers = await this.getActiveSuppliers();
                let suppliersList = '🏪 *قائمة الموردين النشطين:*\n\n';
                suppliers.forEach(supplier => {
                    suppliersList += `• ${supplier.name} (${supplier.category})\n`;
                });
                await this.bot.sendMessage(chatId, suppliersList, { parse_mode: 'Markdown' });
                break;

            case 'admin_agents':
                const agents = await this.getActiveDeliveryAgents();
                let agentsList = '🚚 *قائمة مندوبي التوصيل:*\n\n';
                agents.forEach(agent => {
                    agentsList += `• ${agent.full_name} - ${agent.supplier_name}\n`;
                });
                await this.bot.sendMessage(chatId, agentsList, { parse_mode: 'Markdown' });
                break;
        }
    }

    async checkIfUserIsAdmin(userId) {
        try {
            const query = 'SELECT id FROM admins WHERE telegram_user_id = $1 AND is_active = true';
            const result = await db.query(query, [userId.toString()]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    async sendOrderNotificationToDeliveryAgent(orderData) {
        if (!this.isInitialized) {
            console.error('❌ Bot not initialized, cannot send order notification');
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
            
            // Create action buttons
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ قبول الطلب', callback_data: `accept_order_${orderData.orderId}` },
                        { text: '❌ رفض الطلب', callback_data: `reject_order_${orderData.orderId}` }
                    ],
                    [
                        { text: '📍 عرض الموقع', callback_data: `view_location_${orderData.orderId}` },
                        { text: '📞 اتصال بالعميل', callback_data: `call_customer_${orderData.orderId}` }
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
            console.error('❌ Error sending order notification:', error);
            return false;
        }
    }

    // Test delivery notification function
    async testDeliveryNotification() {
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
        try {
            // Get all users who have interacted with the bot
            const usersQuery = `
                SELECT DISTINCT telegram_user_id 
                FROM (
                    SELECT CAST(user_id AS TEXT) as telegram_user_id FROM user_profiles WHERE user_id IS NOT NULL
                    UNION
                    SELECT telegram_user_id FROM delivery_agents WHERE telegram_user_id IS NOT NULL
                    UNION
                    SELECT CAST(telegram_user_id AS TEXT) FROM admins WHERE telegram_user_id IS NOT NULL
                ) as all_users
                WHERE telegram_user_id IS NOT NULL
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
                } catch (error) {
                    console.error(`Failed to send message to user ${user.telegram_user_id}:`, error);
                    failCount++;
                }
            }

            console.log(`📢 Broadcast completed: ${successCount} sent, ${failCount} failed`);
            return { successCount, failCount };

        } catch (error) {
            console.error('Error broadcasting message:', error);
            throw error;
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

    async getActiveSuppliers() {
        try {
            const query = 'SELECT name, category FROM suppliers WHERE is_active = true ORDER BY name';
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            return [];
        }
    }

    async getActiveDeliveryAgents() {
        try {
            const query = `
                SELECT da.full_name, s.name as supplier_name
                FROM delivery_agents da
                JOIN suppliers s ON da.supplier_id = s.id
                WHERE da.is_active = true AND s.is_active = true
                ORDER BY s.name, da.full_name
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error fetching delivery agents:', error);
            return [];
        }
    }

    async sendOrderStatusUpdate(orderId, status, customerTelegramId) {
        if (!this.isInitialized || !customerTelegramId) return false;

        try {
            const statusMessages = {
                'confirmed': '✅ تم تأكيد طلبك وجاري التحضير',
                'shipped': '🚚 تم شحن طلبك وهو في الطريق إليك',
                'delivered': '🎉 تم توصيل طلبك بنجاح',
                'cancelled': '❌ تم إلغاء طلبك'
            };

            const message = `
📦 *تحديث حالة الطلب #${orderId}*

${statusMessages[status] || `تم تحديث حالة طلبك إلى: ${status}`}

يمكنك متابعة طلباتك من خلال التطبيق.
            `;

            await this.bot.sendMessage(customerTelegramId, message, { parse_mode: 'Markdown' });
            return true;
        } catch (error) {
            console.error('Error sending order status update:', error);
            return false;
        }
    }

    async sendLowStockAlert(supplierId, products) {
        if (!this.isInitialized) return false;

        try {
            // Get supplier's Telegram ID if they have one
            const supplierQuery = 'SELECT telegram_user_id, name FROM suppliers WHERE id = $1';
            const supplierResult = await db.query(supplierQuery, [supplierId]);
            
            if (supplierResult.rows.length === 0 || !supplierResult.rows[0].telegram_user_id) {
                return false;
            }

            const supplier = supplierResult.rows[0];
            const productsList = products.map(p => `• ${p.name} (${p.stock_level} متبقي)`).join('\n');

            const message = `
⚠️ *تنبيه: مخزون منخفض*

مرحباً ${supplier.name}،

المنتجات التالية تحتاج إعادة تخزين:

${productsList}

يرجى تحديث المخزون من لوحة التحكم.
            `;

            await this.bot.sendMessage(supplier.telegram_user_id, message, { parse_mode: 'Markdown' });
            return true;
        } catch (error) {
            console.error('Error sending low stock alert:', error);
            return false;
        }
    }
}

// Create singleton instance
const telegramBotService = new TelegramBotService();

module.exports = telegramBotService;