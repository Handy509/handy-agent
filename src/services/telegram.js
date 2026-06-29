const { config } = require("../config");
const { logger } = require("../logger");

async function sendTelegramAlert(text) {
  if (!config.telegramBotToken || !config.telegramAdminChatId) {
    return { skipped: true };
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramAdminChatId,
      text
    })
  });

  if (!response.ok) {
    await response.text();
    logger.warn({ status: response.status }, "Telegram alert failed");
  }

  return { ok: response.ok };
}

module.exports = { sendTelegramAlert };
