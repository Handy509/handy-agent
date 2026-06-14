const crypto = require("crypto");
const { appendJsonLine } = require("./storage");
const { sendTelegramAlert } = require("./telegram");

async function createTicket({ source, customerPhone, subject, message, priority = "normal", metadata = {} }) {
  const ticket = {
    id: `HP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8)}`,
    source,
    customerPhone,
    subject,
    message,
    priority,
    status: "open",
    metadata,
    createdAt: new Date().toISOString()
  };

  await appendJsonLine("tickets.jsonl", ticket);

  await sendTelegramAlert([
    "New HandyPay ticket",
    `ID: ${ticket.id}`,
    `Priority: ${ticket.priority}`,
    `Phone: ${ticket.customerPhone || "unknown"}`,
    `Subject: ${ticket.subject}`,
    `Message: ${ticket.message}`
  ].join("\n"));

  return ticket;
}

function shouldEscalate(messageText) {
  const text = messageText.toLowerCase();
  return [
    "bloque",
    "blocked",
    "pa parèt",
    "pa paret",
    "missing",
    "txid",
    "usdt",
    "erè",
    "erreur",
    "fraud",
    "litige",
    "dispute",
    "kyc",
    "pa ok",
    "pa bon",
    "pa rezoud",
    "mwen pa satisf",
    "mw pa satisf",
    "mwen bouke",
    "mw bouke"
  ].some((keyword) => text.includes(keyword));
}

module.exports = { createTicket, shouldEscalate };
