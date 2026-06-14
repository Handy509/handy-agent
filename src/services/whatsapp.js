const { config } = require("../config");
const { logger } = require("../logger");

function extractWhatsAppMessages(payload) {
  const entries = payload.entry || [];
  const messages = [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        messages.push({
          from: message.from,
          id: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text?.body || "",
          raw: message
        });
      }
    }
  }

  return messages;
}

async function sendWhatsAppText(to, body) {
  if (!config.whatsappAccessToken) {
    logger.info({ to, body }, "WhatsApp token missing; reply logged only");
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${config.whatsappGraphVersion}/${config.whatsappPhoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.whatsappAccessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    logger.warn({ status: response.status, body: text }, "WhatsApp send failed");
  }

  return { ok: response.ok };
}

module.exports = { extractWhatsAppMessages, sendWhatsAppText };
