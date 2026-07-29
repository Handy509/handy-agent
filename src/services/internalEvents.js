const crypto = require("crypto");
const { config } = require("../config");
const { logger } = require("../logger");
const { readJson, writeJson } = require("./storage");
const { sendWhatsAppTemplate, sendWhatsAppText } = require("./whatsapp");

const STORE_FILE = "internal-events.json";
const supportedTypes = new Set([
  "xbet_recharge_requested",
  "xbet_notification_test",
  "new_visa_recharge_requested"
]);
const rateBuckets = new Map();
let processing = false;

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return (forwarded || req.ip || req.socket?.remoteAddress || "")
    .replace(/^::ffff:/, "");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signatureFor(timestamp, rawBody, secret = config.internalEventSecret) {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

function verifyInternalRequest(req) {
  if (!config.internalEventSecret) {
    return { ok: false, status: 503, error: "internal_secret_missing" };
  }

  const ip = clientIp(req);
  if (
    config.internalAllowedIps.length &&
    !config.internalAllowedIps.includes(ip)
  ) {
    return { ok: false, status: 403, error: "ip_not_allowed" };
  }

  const timestamp = Number(req.headers["x-kethura-timestamp"]);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() / 1000 - timestamp) >
      config.internalMaxTimestampSkewSeconds
  ) {
    return { ok: false, status: 401, error: "stale_timestamp" };
  }

  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const expected = signatureFor(timestamp, rawBody);
  if (!safeEqual(expected, req.headers["x-kethura-signature"])) {
    return { ok: false, status: 401, error: "invalid_signature" };
  }

  const minute = Math.floor(Date.now() / 60000);
  const key = `${ip}:${minute}`;
  const count = (rateBuckets.get(key) || 0) + 1;
  rateBuckets.set(key, count);
  if (count > config.internalRateLimitPerMinute) {
    return { ok: false, status: 429, error: "rate_limited" };
  }

  return { ok: true };
}

function buildMessage(event) {
  if (event.type === "xbet_notification_test") {
    return [
      "TEST HandyPay Kéthura",
      "Recharge 1xBet notification test.",
      "No customer request was created."
    ].join("\n");
  }

  if (event.type === "new_visa_recharge_requested") {
    return [
      "Nouvo demann rechaj NEW USD Visa",
      "",
      `Kliyan: ${event.user_name || "Non disponib"}`,
      `Imèl: ${event.user_email || "Non disponib"}`,
      `Telefòn: ${event.user_phone || "Non disponib"}`,
      `Kat: **** ${event.card_last_four || "----"}`,
      `Montan rechaj: ${event.amount} ${event.currency || "USD"}`,
      `Frè: ${event.fee_amount || "0.00"} ${event.currency || "USD"}`,
      `Total: ${event.total_to_pay} ${event.currency || "USD"}`,
      "Estati: Pending",
      "",
      "Aksyon obligatwa:",
      "Louvri admin HandyPay pou trete demann lan.",
      "",
      `Lyen admin: ${event.admin_url}`
    ].join("\n");
  }

  return [
    "Nouvelle demande Recharge 1xBet",
    "",
    `Client: ${event.user_name}`,
    `Téléphone: ${event.user_phone || "Non disponible"}`,
    `Montant: ${event.amount} ${event.currency || "USD"}`,
    `ID 1xBet: ${event.xbet_id}`,
    "Statut: Pending",
    "",
    "Action requise:",
    "Connectez-vous à l’admin HandyPay pour approuver ou rejeter la demande.",
    "",
    `Lien admin: ${event.admin_url}`
  ].join("\n");
}

function sanitizedError(value) {
  return String(value || "whatsapp_send_failed").slice(0, 500);
}

function templateForEvent(event) {
  if (event.type === "xbet_notification_test") {
    const fallbackUsed = !config.whatsappTestTemplateName;
    return {
      name: fallbackUsed
        ? config.whatsappFallbackTestTemplateName
        : config.whatsappTestTemplateName,
      language: fallbackUsed
        ? config.whatsappFallbackTestTemplateLanguage
        : config.whatsappTestTemplateLanguage,
      components: [],
      fallbackUsed
    };
  }

  if (event.type === "xbet_recharge_requested") {
    const parameters = [
      event.user_name || "Non disponible",
      event.user_phone || "Non disponible",
      `${event.amount} ${event.currency || "USD"}`,
      event.xbet_id
    ].map((text) => ({ type: "text", text: String(text) }));
    return {
      name: config.whatsappRequestTemplateName,
      language: config.whatsappRequestTemplateLanguage,
      components: [{ type: "body", parameters }],
      fallbackUsed: false
    };
  }

  return null;
}

async function signedCallback(event) {
  if (!event.callback_url) return;

  const payload = JSON.stringify({
    event_id: event.event_id,
    request_id: event.request_id || null,
    status: event.status,
    attempts: event.attempts,
    last_error: event.last_error || null,
    sent_at: event.sent_at || null
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    await fetch(event.callback_url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kethura-timestamp": timestamp,
        "x-kethura-signature": signatureFor(timestamp, payload)
      },
      body: payload
    });
  } catch (_error) {
    logger.warn({ eventId: event.event_id }, "Internal callback failed");
  }
}

async function processEvent(event, send = sendWhatsAppText) {
  event.attempts = Number(event.attempts || 0) + 1;
  event.last_attempt_at = new Date().toISOString();

  let result;
  if (send !== sendWhatsAppText || event.type === "new_visa_recharge_requested") {
    result = await send(event.admin_whatsapp, buildMessage(event));
  } else {
    const template = templateForEvent(event);
    result = await sendWhatsAppTemplate(
      event.admin_whatsapp,
      template?.name,
      template?.language,
      template?.components
    );
    event.template_name = template?.name || null;
    event.fallback_template_used = Boolean(template?.fallbackUsed);
  }
  if (result.ok) {
    event.status = "sent";
    event.provider_status = result.providerStatus || "accepted";
    event.sent_at = new Date().toISOString();
    event.last_error = null;
    event.message_id = result.messageId || null;
    event.next_attempt_at = null;
  } else {
    event.provider_status = "failed";
    event.last_error = sanitizedError(result.error);
    if (event.attempts >= config.internalRetryMaxAttempts) {
      event.status = "failed";
      event.next_attempt_at = null;
    } else {
      event.status = "queued";
      const delay =
        config.internalRetryBaseSeconds * 2 ** (event.attempts - 1);
      event.next_attempt_at = new Date(Date.now() + delay * 1000).toISOString();
    }
  }

  return event;
}

async function acceptInternalEvent(payload, options = {}) {
  if (!supportedTypes.has(payload.type)) {
    return { statusCode: 422, body: { ok: false, error: "unsupported_type" } };
  }
  if (!payload.event_id || !payload.admin_whatsapp) {
    return { statusCode: 422, body: { ok: false, error: "invalid_payload" } };
  }

  const store = await readJson(STORE_FILE, {});
  const existing = store[payload.event_id];
  if (existing && !payload.force_retry) {
    return {
      statusCode: 200,
      body: { ok: true, duplicate: true, event: existing }
    };
  }
  if (existing?.status === "sent") {
    return {
      statusCode: 200,
      body: { ok: true, duplicate: true, event: existing }
    };
  }

  const event = {
    ...(existing || {}),
    ...payload,
    status: existing?.status || "queued",
    attempts: existing?.attempts || 0,
    received_at: existing?.received_at || new Date().toISOString()
  };
  await processEvent(event, options.send);
  store[event.event_id] = event;
  await writeJson(STORE_FILE, store);
  await signedCallback(event);

  return { statusCode: 202, body: { ok: true, event } };
}

async function processRetryQueue() {
  if (processing) return;
  processing = true;
  try {
    const store = await readJson(STORE_FILE, {});
    let changed = false;
    for (const event of Object.values(store)) {
      if (
        event.status === "queued" &&
        event.next_attempt_at &&
        new Date(event.next_attempt_at).getTime() <= Date.now()
      ) {
        await processEvent(event);
        await signedCallback(event);
        changed = true;
      }
    }
    if (changed) await writeJson(STORE_FILE, store);
  } finally {
    processing = false;
  }
}

function startInternalEventRetries() {
  const timer = setInterval(processRetryQueue, 15000);
  timer.unref();
}

function senderConfigured() {
  return Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId);
}

function templateStatus() {
  return {
    test_template_configured: Boolean(config.whatsappTestTemplateName),
    request_template_configured: Boolean(config.whatsappRequestTemplateName),
    fallback_template_used: !config.whatsappTestTemplateName,
    test_template_name:
      config.whatsappTestTemplateName ||
      config.whatsappFallbackTestTemplateName,
    request_template_name: config.whatsappRequestTemplateName || null
  };
}

module.exports = {
  acceptInternalEvent,
  buildMessage,
  processEvent,
  processRetryQueue,
  senderConfigured,
  signatureFor,
  startInternalEventRetries,
  templateForEvent,
  templateStatus,
  verifyInternalRequest
};
