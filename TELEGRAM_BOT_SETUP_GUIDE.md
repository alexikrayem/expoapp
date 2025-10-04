# Telegram Bot Setup Guide for Delivery Agents

## Overview
This guide explains how to set up the Telegram bot to send order notifications to delivery agents.

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat and send `/newbot`
3. Follow the instructions to create your bot:
   - Choose a name (e.g., "Medical Expo Delivery Bot")
   - Choose a username (must end with 'bot', e.g., "medical_expo_delivery_bot")
4. BotFather will give you a **Bot Token** - save this securely
5. Add this token to your backend `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

## Step 2: Get Delivery Agent's Telegram ID

There are several methods to get a delivery agent's Telegram ID:

### Method 1: Using Your Bot (Recommended)

1. **Add a /start command handler** to your bot that responds with the user's ID
2. **Delivery agent opens Telegram** and searches for your bot
3. **Agent clicks "Start"** or sends `/start` to the bot
4. **Bot responds** with their Telegram ID
5. **Supplier enters this ID** in the delivery agent form

### Method 2: Using @userinfobot

1. Delivery agent searches for **@userinfobot** in Telegram
2. Starts a chat with the bot
3. Bot immediately responds with their Telegram ID
4. Agent shares this ID with the supplier

### Method 3: Using @getmyid_bot

1. Delivery agent searches for **@getmyid_bot**
2. Starts chat and sends `/start`
3. Bot responds with Telegram ID
4. Agent shares ID with supplier

## Step 3: Add Delivery Agent in Supplier Admin Panel

1. **Login** to supplier admin panel
2. Go to **"Delivery Agents"** page
3. Click **"Add New Agent"** button
4. Fill in the form:
   - **Full Name**: Agent's full name
   - **Phone Number**: Agent's mobile number (required for login)
   - **Email**: Optional
   - **Telegram User ID**: Paste the ID from Step 2
   - **Password**: Set initial password for agent
   - **Active Status**: Check to activate immediately
5. Click **"Save"**

## Step 4: How Notifications Work

When a new order is assigned to a delivery agent:

1. **Order is placed** by customer
2. **Supplier assigns** delivery agent to order items
3. **Backend sends Telegram message** to agent's Telegram ID with:
   - Order number
   - Customer name and address
   - Items to deliver
   - Delivery instructions
4. **Agent receives notification** instantly on Telegram
5. **Agent can click link** to open delivery agent TMA app

## Bot Message Format

Example notification:
```
🚚 New Delivery Assignment!

Order #12345
Customer: John Doe
Phone: +971501234567

Address:
Street 123, Building 45
Dubai, UAE

Items:
• Medical Gloves x 5 boxes
• Face Masks x 10 packs

Total Value: 450 AED

[Open Delivery App]
```

## Implementation Code Structure

### Backend Bot Service (`services/telegramBot.js`)

```javascript
const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
  }

  setupCommands() {
    // Handle /start command to get user ID
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      this.bot.sendMessage(chatId,
        `Welcome! Your Telegram ID is: ${userId}\n\n` +
        `Share this ID with your supplier to receive delivery notifications.`
      );
    });
  }

  async sendDeliveryNotification(telegramUserId, orderDetails) {
    try {
      const message = this.formatOrderMessage(orderDetails);
      await this.bot.sendMessage(telegramUserId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open Delivery App', url: 'https://t.me/your_tma_bot' }
          ]]
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  formatOrderMessage(order) {
    return `
🚚 <b>New Delivery Assignment!</b>

<b>Order #${order.orderId}</b>
<b>Customer:</b> ${order.customerName}
<b>Phone:</b> ${order.customerPhone}

<b>Address:</b>
${order.address}
${order.city}

<b>Items:</b>
${order.items.map(item => `• ${item.name} x ${item.quantity}`).join('\n')}

<b>Total Value:</b> ${order.totalValue} AED
    `.trim();
  }
}

module.exports = TelegramBotService;
```

## Testing the Integration

1. **Start your backend server** with bot token configured
2. **Open Telegram** and search for your bot
3. **Send /start** - you should receive your Telegram ID
4. **Add a test delivery agent** with this ID
5. **Create a test order** and assign it to the agent
6. **Check Telegram** - agent should receive notification

## Troubleshooting

### Bot doesn't respond to /start
- Verify `TELEGRAM_BOT_TOKEN` is correct in `.env`
- Restart backend server after adding token
- Check backend logs for errors

### Notifications not received
- Verify delivery agent's Telegram ID is correct
- Agent must have started chat with bot at least once
- Check if agent has blocked the bot
- Verify backend bot service is running

### "Chat not found" error
- Agent hasn't started chat with bot yet
- Agent blocked the bot
- Telegram ID is incorrect

## Security Notes

1. **Never share bot token publicly**
2. **Store token in environment variables**
3. **Validate Telegram IDs before saving**
4. **Implement rate limiting** for bot messages
5. **Log all notification attempts** for debugging

## Next Steps

After setup:
1. Train delivery agents on receiving notifications
2. Create onboarding guide for agents
3. Test end-to-end flow with real orders
4. Monitor notification delivery rates
5. Set up fallback notification methods (SMS, email)
