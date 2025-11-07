// telegram-app-backend/middleware/authMiddleware.js
const crypto = require('crypto');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("\nFATAL ERROR: TELEGRAM_BOT_TOKEN is not defined.");
    console.error("Please add TELEGRAM_BOT_TOKEN=your_bot_token to your .env file.\n");
    process.exit(1);
}

const validateTelegramAuth = (req, res, next) => {
    // Check for a special header ONLY used for local development
    // Only allow this in development environment and with specific IP or header
    const isDevRequest = req.header('X-Dev-Bypass-Auth');
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('::ffff:127.0.0.1');

    if (process.env.NODE_ENV === 'development' && isDevRequest && isLocalhost) {
        // Enhanced security: Check for a specific secret in the header
        if (isDevRequest === process.env.DEV_BYPASS_SECRET) {
            console.warn('⚠️  Bypassing Telegram auth for local development via X-Dev-Bypass-Auth header.');
            // This mock user MUST match the one on your client-side for consistency
            req.telegramUser = { id: 123456789, first_name: 'Local', last_name: 'Dev' };
            return next();
        }
    }
    
    // --- Standard Production Logic ---
    const initDataString = req.header('X-Telegram-Init-Data');

    if (!initDataString) {
        return res.status(401).json({ message: 'Authentication required: X-Telegram-Init-Data header is missing.' });
    }

    try {
        const params = new URLSearchParams(initDataString);
        const hash = params.get('hash');
        if (!hash) {
            return res.status(401).json({ message: 'Authentication failed: Hash is missing from initData.' });
        }
        params.delete('hash');
        
        const dataCheckString = Array.from(params.keys())
            .sort()
            .map(key => `${key}=${params.get(key)}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        if (calculatedHash === hash) {
            const user = JSON.parse(params.get('user'));
            req.telegramUser = user;
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: Invalid authentication data. Hash mismatch.' });
    } catch (error) {
        console.error('Error validating Telegram data:', error);
        return res.status(500).json({ message: 'Internal Server Error during authentication.' });
    }
};

module.exports = { validateTelegramAuth };