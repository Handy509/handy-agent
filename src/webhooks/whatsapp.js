const express = require("express");
const { config } = require("../config");
const { generateReply } = require("../services/ai");
const { handleAdminCommand, isAdminPhone } = require("../services/adminCommands");
const { getSession, setSession } = require("../services/sessionMemory");
const { appendJsonLine } = require("../services/storage");
const { createTicket, shouldEscalate } = require("../services/tickets");
const { extractWhatsAppMessages, sendWhatsAppText } = require("../services/whatsapp");

const whatsappRouter = express.Router();

function splitReply(text) {
  const value = String(text || "").trim();
  if (value.length <= 900) return [value];

  const chunks = value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length > 1 && chunks.every((part) => part.length <= 900)) {
    return chunks.slice(0, 5);
  }

  return [value];
}

function isUnresolvedFrustration(text) {
  const value = String(text || "").toLowerCase();
  return [
    "pa ok",
    "pa bon",
    "sa pa mache",
    "li pa mache",
    "ou pa rezoud",
    "pa rezoud",
    "mwen pa satisf",
    "mw pa satisf",
    "m pa satisf",
    "toujou menm",
    "ou pa konprann",
    "mwen bouke",
    "mw bouke",
    "m pa jwenn solisyon",
    "pa ede m",
    "pa edem",
    "mwen fache",
    "mw fache",
    "raz",
    "mize"
  ].some((item) => value.includes(item));
}

async function shouldHandoffToAdmin(phone, text) {
  if (isAdminPhone(phone)) return false;

  const session = await getSession(phone);
  const count = isUnresolvedFrustration(text) ? Number(session?.unresolvedCount || 0) + 1 : 0;

  await setSession(phone, { unresolvedCount: count });
  return count >= 5;
}

whatsappRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

whatsappRouter.post("/", async (req, res, next) => {
  try {
    const messages = extractWhatsAppMessages(req.body);

    res.sendStatus(200);

    for (const message of messages) {
      if (message.type !== "text" || !message.text) {
        await sendWhatsAppText(message.from, "Mwen resevwa mesaj ou a. Tanpri voye l an teks pou m ka ede w pi rapid.");
        continue;
      }

      await appendJsonLine("conversations.jsonl", {
        direction: "inbound",
        channel: "whatsapp",
        customerPhone: message.from,
        messageId: message.id,
        text: message.text,
        createdAt: new Date().toISOString()
      });

      const adminReply = await handleAdminCommand({
        from: message.from,
        text: message.text
      });

      if (adminReply) {
        await sendWhatsAppText(message.from, adminReply);
        await appendJsonLine("conversations.jsonl", {
          direction: "outbound",
          channel: "whatsapp",
          customerPhone: message.from,
          text: adminReply,
          createdAt: new Date().toISOString()
        });
        continue;
      }

      let ticket = null;
      if (!isAdminPhone(message.from) && shouldEscalate(message.text)) {
        ticket = await createTicket({
          source: "whatsapp",
          customerPhone: message.from,
          subject: "WhatsApp escalation",
          message: message.text,
          priority: "high",
          metadata: { whatsappMessageId: message.id }
        });
      }

      if (await shouldHandoffToAdmin(message.from, message.text)) {
        const handoffTicket = await createTicket({
          source: "whatsapp",
          customerPhone: message.from,
          subject: "WhatsApp admin handoff after unresolved support",
          message: message.text,
          priority: "urgent",
          metadata: { whatsappMessageId: message.id, reason: "5 unresolved/frustration signals" }
        });

        const handoffReply = [
          "Mwen konprann ou. M pap fè ou repete menm bagay la ankò.",
          "",
          "Mwen voye dosye a bay admin yo pou yo reprann li.",
          `Ticket: ${handoffTicket.id}`,
          "",
          "Pou repons pi rapid, ou ka ekri admin yo sou WhatsApp: +1 (913) 733-7645."
        ].join("\n");

        await sendWhatsAppText(message.from, handoffReply);
        await appendJsonLine("conversations.jsonl", {
          direction: "outbound",
          channel: "whatsapp",
          customerPhone: message.from,
          text: handoffReply,
          createdAt: new Date().toISOString()
        });
        continue;
      }

      const reply = await generateReply({
        customerMessage: message.text,
        customerPhone: message.from
      });

      const finalReply = ticket
        ? `${reply}\n\nMwen ouvri yon ticket pou ekip la: ${ticket.id}.`
        : reply;

      for (const replyPart of splitReply(finalReply)) {
        await sendWhatsAppText(message.from, replyPart);
      }

      await appendJsonLine("conversations.jsonl", {
        direction: "outbound",
        channel: "whatsapp",
        customerPhone: message.from,
        text: finalReply,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = { whatsappRouter };
