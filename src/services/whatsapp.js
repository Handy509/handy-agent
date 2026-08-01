const { config } = require("../config");
const { logger } = require("../logger");
const { repairOutboundText } = require("./textEncoding");

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
  const safeBody = repairOutboundText(body);
  if (!config.whatsappAccessToken) {
    logger.info(
      {
        recipientPresent: Boolean(to),
        messageLength: safeBody.length
      },
      "WhatsApp token missing; outbound reply skipped"
    );
    return { ok: false, skipped: true, error: "provider_not_configured" };
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
        body: safeBody
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn({ status: response.status }, "WhatsApp send failed");
  }

  return {
    ok: response.ok,
    providerStatus: response.ok ? "accepted" : "rejected",
    messageId: payload.messages?.[0]?.id || null,
    error: response.ok ? null : `whatsapp_http_${response.status}`
  };
}

async function sendWhatsAppTemplate(to, name, language, components = []) {
  if (!config.whatsappAccessToken || !config.whatsappPhoneNumberId) {
    return { ok: false, skipped: true, error: "provider_not_configured" };
  }
  if (!name || !language) {
    return { ok: false, error: "template_not_configured" };
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
      type: "template",
      template: { name, language: { code: language }, components }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn({ status: response.status, template: name }, "WhatsApp template send failed");
  }
  return {
    ok: response.ok,
    providerStatus: response.ok ? "accepted" : "rejected",
    messageId: payload.messages?.[0]?.id || null,
    error: response.ok ? null : `whatsapp_http_${response.status}`
  };
}

module.exports = {
  extractWhatsAppMessages,
  sendWhatsAppTemplate,
  sendWhatsAppText
};
