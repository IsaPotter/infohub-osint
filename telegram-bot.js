// InfoHub OSINT Telegram Bot
// Simple bot simulation for demonstration

const express = require('express');
const app = express();

// Telegram Bot Token (use environment variable in production)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';

// Webhook endpoint for Telegram
app.use(express.json());

app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  const { message } = req.body;
  
  if (!message || !message.text) {
    return res.sendStatus(200);
  }
  
  const chatId = message.chat.id;
  const text = message.text;
  
  // Simple command handling
  if (text.startsWith('/start')) {
    await sendMessage(chatId, '🕵️ Welcome to InfoHub OSINT Bot!\n\nCommands:\n/search <query> - OSINT search\n/help - Show help');
  } else if (text.startsWith('/search ')) {
    const query = text.replace('/search ', '').trim();
    await performTelegramSearch(chatId, query);
  } else if (text.startsWith('/help')) {
    await sendMessage(chatId, '🔍 InfoHub OSINT Commands:\n\n/search username - Social media search\n/search email@domain.com - Email intelligence\n/search +5511999999999 - Phone lookup\n/search domain.com - Domain analysis\n\n💎 Premium features available at https://infohub-osint.vercel.app');
  } else {
    await sendMessage(chatId, '❓ Unknown command. Use /help for available commands.');
  }
  
  res.sendStatus(200);
});

async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Telegram API error:', error);
  }
}

async function performTelegramSearch(chatId, query) {
  await sendMessage(chatId, '🔍 Searching... Please wait...');
  
  try {
    // Simulate search (in production, call your OSINT API)
    const results = await simulateSearch(query);
    
    let message = `🕵️ <b>OSINT Results for:</b> ${query}\n\n`;
    
    results.forEach((result, index) => {
      const statusEmoji = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      message += `${statusEmoji} <b>${result.platform}</b>\n${result.data}\n\n`;
    });
    
    message += '💎 Get full results at https://infohub-osint.vercel.app';
    
    await sendMessage(chatId, message);
    
  } catch (error) {
    await sendMessage(chatId, '❌ Search failed. Please try again later.');
  }
}

async function simulateSearch(query) {
  // Simulate OSINT search results
  const platforms = ['GitHub', 'Twitter', 'Instagram', 'LinkedIn'];
  const results = [];
  
  for (const platform of platforms) {
    const found = Math.random() > 0.5;
    results.push({
      platform,
      status: found ? 'success' : 'error',
      data: found ? 'Profile found' : 'Profile not found'
    });
  }
  
  return results;
}

// Set webhook (run once)
async function setWebhook() {
  const webhookUrl = `https://your-domain.com/webhook/${BOT_TOKEN}`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    const result = await response.json();
    console.log('Webhook set:', result);
  } catch (error) {
    console.error('Failed to set webhook:', error);
  }
}

// Bot commands for BotFather:
/*
start - Start the bot
search - Perform OSINT search
help - Show help and commands
*/

module.exports = app;

// Usage instructions:
// 1. Create bot with @BotFather on Telegram
// 2. Get bot token and set as environment variable
// 3. Deploy this code to your server
// 4. Set webhook URL pointing to your server
// 5. Users can interact with bot using /search command