// utils/telegramAuth.js
const crypto = require('crypto');

// Function to validate Telegram Login Widget data
function validateTelegramLoginWidgetData(authData, botToken) {
  if (!authData || !botToken) return { ok: false, error: 'Missing authData or botToken' };

  // Check required fields for Telegram Login Widget
  if (!authData.id || !authData.first_name || !authData.hash || !authData.auth_date) {
    return { ok: false, error: 'Missing required fields in authData' };
  }

  // Check if auth date is not too old (5 minutes)
  const authDate = parseInt(authData.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - authDate) > 300) { // 5 minutes = 300 seconds
    return { ok: false, error: 'Auth data is too old' };
  }

  // Prepare data string for hash verification
  const fieldsToCheck = [
    'id',
    'first_name',
    'last_name',
    'username',
    'photo_url',
    'auth_date'
  ];

  const dataCheckString = fieldsToCheck
    .filter(field => authData.hasOwnProperty(field))
    .map(field => `${field}=${authData[field]}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  const calculatedHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== authData.hash) {
    return { ok: false, error: 'Hash mismatch' };
  }

  // Return user data
  return {
    ok: true,
    user: {
      id: authData.id,
      first_name: authData.first_name,
      last_name: authData.last_name || null,
      username: authData.username || null,
      photo_url: authData.photo_url || null,
      auth_date: authData.auth_date
    }
  };
}

module.exports = { validateTelegramLoginWidgetData };