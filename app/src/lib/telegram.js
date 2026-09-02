export async function sendTelegramMessage(text, replyMarkup = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Missing Telegram config');
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return null;
  }
}

export async function replyToTelegramMessage(messageId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return null;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_to_message_id: messageId, // Using standard reply field
    parse_mode: 'HTML'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error replying to telegram message:', error);
    return null;
  }
}

export async function answerTelegramCallbackQuery(callbackQueryId, text = null, showAlert = false) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !callbackQueryId) return null;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
  };
  
  if (text) {
    payload.text = text;
    payload.show_alert = showAlert;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error answering callback query:', error);
    return null;
  }
}

export async function sendForceReplyMessage(messageId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return null;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_to_message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      force_reply: true,
      selective: true
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error sending force reply message:', error);
    return null;
  }
}
