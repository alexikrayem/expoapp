const crypto = require('crypto');
const { validateTelegramData } = require('../src/utils/telegramAuth');


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("\nFATAL ERROR: TELEGRAM_BOT_TOKEN is not defined.");
  process.exit(1);
}

const validateTelegramAuth = (req, res, next) => {
  const isDevRequest = req.header('X-Dev-Bypass-Auth');
  const isLocalhost =
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip.startsWith('::ffff:127.0.0.1');

  // Development bypass
  if (process.env.NODE_ENV === 'development' && isDevRequest && isLocalhost) {
    if (isDevRequest === process.env.DEV_BYPASS_SECRET) {
      console.warn('⚠️  Bypassing Telegram auth for local development.');
      req.telegramUser = { id: 123456789, first_name: 'Local', last_name: 'Dev' };
      return next();
    }
  }

  const initDataString = req.header('X-Telegram-Init-Data');
  if (!initDataString) {
    return res.status(401).json({ message: 'Missing X-Telegram-Init-Data header.' });
  }

  const validation = validateTelegramData(initDataString, BOT_TOKEN);
  if (!validation.ok) {
    console.warn('Telegram auth failed:', validation);
    return res.status(403).json({ message: 'Invalid Telegram authentication.', details: validation });
  }

  req.telegramUser = validation.user;
  next();
};

module.exports = { validateTelegramAuth };
