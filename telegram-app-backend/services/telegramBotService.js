const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
    constructor(token) {
        if (!token) {
            console.warn('Telegram bot token not provided. Bot features will be disabled.');
            this.bot = null;
            this.isEnabled = false;
            return;
        }

        try {
            this.bot = new TelegramBot(token, { polling: true });
            this.isEnabled = true;
            this.setupCommands();
            this.setupErrorHandlers();
            console.log('✅ Telegram bot initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Telegram bot:', error.message);
            this.bot = null;
            this.isEnabled = false;
        }
    }

    setupCommands() {
        if (!this.bot) return;

        // Handle /start command - returns user's Telegram ID
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const firstName = msg.from.first_name || 'User';

            const welcomeMessage = `
🤖 مرحباً ${firstName}!

معرف تيليجرام الخاص بك هو: <code>${userId}</code>

📋 <b>كيفية الاستخدام:</b>
1. انسخ معرف تيليجرام أعلاه
2. شاركه مع المورد الخاص بك
3. سيقوم المورد بإضافتك كمندوب توصيل
4. ستتلقى إشعارات الطلبات هنا تلقائياً

💡 <b>نصيحة:</b> اضغط على المعرف لنسخه مباشرة
            `.trim();

            try {
                await this.bot.sendMessage(chatId, welcomeMessage, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📱 فتح تطبيق التوصيل', url: process.env.DELIVERY_APP_URL || 'https://t.me/your_bot' }
                        ]]
                    }
                });
            } catch (error) {
                console.error('Error sending welcome message:', error);
            }
        });

        // Handle /help command
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;

            const helpMessage = `
📚 <b>مساعدة بوت التوصيل</b>

<b>الأوامر المتاحة:</b>
/start - عرض معرف تيليجرام الخاص بك
/help - عرض هذه الرسالة
/myid - الحصول على معرف تيليجرام

<b>عن البوت:</b>
هذا البوت يرسل إشعارات فورية عند تعيين طلبات توصيل جديدة لك.

<b>المشاكل الشائعة:</b>
• لم تتلقى إشعارات؟ تأكد أن المورد أضافك بمعرف تيليجرام الصحيح
• معرف خاطئ؟ استخدم /start للحصول على معرفك الصحيح
• البوت لا يرد؟ تحقق من اتصالك بالإنترنت

لأي مساعدة إضافية، تواصل مع المورد الخاص بك.
            `.trim();

            try {
                await this.bot.sendMessage(chatId, helpMessage, {
                    parse_mode: 'HTML'
                });
            } catch (error) {
                console.error('Error sending help message:', error);
            }
        });

        // Handle /myid command - alternative to /start
        this.bot.onText(/\/myid/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            try {
                await this.bot.sendMessage(
                    chatId,
                    `معرف تيليجرام الخاص بك: <code>${userId}</code>`,
                    { parse_mode: 'HTML' }
                );
            } catch (error) {
                console.error('Error sending ID:', error);
            }
        });
    }

    setupErrorHandlers() {
        if (!this.bot) return;

        this.bot.on('polling_error', (error) => {
            console.error('Telegram polling error:', error.message);
        });

        this.bot.on('error', (error) => {
            console.error('Telegram bot error:', error.message);
        });
    }

    /**
     * Send delivery assignment notification to delivery agent
     * @param {string} telegramUserId - Telegram user ID of delivery agent
     * @param {Object} orderDetails - Order details
     * @returns {Promise<boolean>} Success status
     */
    async sendDeliveryNotification(telegramUserId, orderDetails) {
        if (!this.isEnabled) {
            console.log('Telegram bot disabled, skipping notification');
            return false;
        }

        try {
            const message = this.formatOrderMessage(orderDetails);

            await this.bot.sendMessage(telegramUserId, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '📱 فتح تطبيق التوصيل',
                            url: process.env.DELIVERY_APP_URL || 'https://t.me/your_bot'
                        }
                    ]]
                }
            });

            console.log(`✅ Notification sent to Telegram user ${telegramUserId}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to send notification to ${telegramUserId}:`, error.message);

            // Log specific error types
            if (error.response?.body?.error_code === 403) {
                console.error('  → Agent has blocked the bot or not started chat');
            } else if (error.response?.body?.error_code === 400) {
                console.error('  → Invalid Telegram user ID');
            }

            return false;
        }
    }

    /**
     * Format order details into Telegram message
     * @param {Object} order - Order details
     * @returns {string} Formatted message
     */
    formatOrderMessage(order) {
        const {
            orderId,
            customerName,
            customerPhone,
            address,
            city,
            items,
            totalValue,
            specialInstructions
        } = order;

        let message = `
🚚 <b>تعيين توصيل جديد!</b>

📦 <b>رقم الطلب:</b> #${orderId}

👤 <b>العميل:</b> ${customerName}
📱 <b>الهاتف:</b> ${customerPhone}

📍 <b>العنوان:</b>
${address}
${city}

📋 <b>المنتجات:</b>
${items.map((item, index) => `${index + 1}. ${item.name} × ${item.quantity}`).join('\n')}

💰 <b>القيمة الإجمالية:</b> ${totalValue} د.إ
        `.trim();

        if (specialInstructions) {
            message += `\n\n📝 <b>ملاحظات خاصة:</b>\n${specialInstructions}`;
        }

        message += '\n\n⏰ <b>يرجى التوصيل في أقرب وقت ممكن</b>';

        return message;
    }

    /**
     * Send order status update to customer
     * @param {string} telegramUserId - Customer's Telegram ID
     * @param {Object} statusUpdate - Status update details
     * @returns {Promise<boolean>} Success status
     */
    async sendOrderStatusUpdate(telegramUserId, statusUpdate) {
        if (!this.isEnabled) {
            return false;
        }

        try {
            const { orderId, status, estimatedDelivery, message } = statusUpdate;

            let statusEmoji = '📦';
            let statusText = status;

            switch (status) {
                case 'confirmed':
                    statusEmoji = '✅';
                    statusText = 'تم تأكيد الطلب';
                    break;
                case 'preparing':
                    statusEmoji = '👨‍🍳';
                    statusText = 'جاري ال��حضير';
                    break;
                case 'out_for_delivery':
                    statusEmoji = '🚚';
                    statusText = 'في الطريق للتوصيل';
                    break;
                case 'delivered':
                    statusEmoji = '✅';
                    statusText = 'تم التوصيل';
                    break;
                case 'cancelled':
                    statusEmoji = '❌';
                    statusText = 'تم الإلغاء';
                    break;
            }

            let notificationMessage = `
${statusEmoji} <b>تحديث حالة الطلب #${orderId}</b>

<b>الحالة:</b> ${statusText}
            `.trim();

            if (estimatedDelivery) {
                notificationMessage += `\n<b>الوقت المتوقع:</b> ${estimatedDelivery}`;
            }

            if (message) {
                notificationMessage += `\n\n${message}`;
            }

            await this.bot.sendMessage(telegramUserId, notificationMessage, {
                parse_mode: 'HTML'
            });

            return true;

        } catch (error) {
            console.error('Failed to send status update:', error.message);
            return false;
        }
    }

    /**
     * Check if bot is enabled and working
     * @returns {boolean} Bot status
     */
    isReady() {
        return this.isEnabled && this.bot !== null;
    }

    /**
     * Stop the bot
     */
    stop() {
        if (this.bot) {
            this.bot.stopPolling();
            console.log('Telegram bot stopped');
        }
    }
}

// Export singleton instance
let botInstance = null;

function initializeTelegramBot(token) {
    if (!botInstance) {
        botInstance = new TelegramBotService(token);
    }
    return botInstance;
}

function getTelegramBot() {
    if (!botInstance) {
        throw new Error('Telegram bot not initialized. Call initializeTelegramBot first.');
    }
    return botInstance;
}

module.exports = {
    TelegramBotService,
    initializeTelegramBot,
    getTelegramBot
};
