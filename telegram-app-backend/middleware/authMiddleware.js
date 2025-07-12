// telegram-app-backend/middleware/authMiddleware.js
const crypto = require('crypto');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("\nFATAL ERROR: TELEGRAM_BOT_TOKEN is not defined.");
    console.error("Please add TELEGRAM_BOT_TOKEN=your_bot_token to your .env file.\n");
    process.exit(1);
}

const validateTelegramAuth = (req, res, next) => {
    const initDataString = req.header('X-Telegram-Init-Data');

    if (!initDataString) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Bypassing Telegram auth for local development. Using mock user.');
            req.telegramUser = { id: 123456789, first_name: 'Local', last_name: 'Dev' };
            return next();
        }
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
            req.telegramUser = user; // IMPORTANT: Attaching secure user data to the request
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: Invalid authentication data. Hash mismatch.' });
    } catch (error) {
        console.error('Error validating Telegram data:', error);
        return res.status(500).json({ message: 'Internal Server Error during authentication.' });
    }
};

module.exports = { validateTelegramAuth };