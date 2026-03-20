const express = require("express");
const axios = require("axios");
const hana = require("./hana");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
// 🟢 TELEGRAM
// ─────────────────────────────────────────
app.post("/webhook/telegram", async (req, res) => {
  res.sendStatus(200); // Reponn Telegram vit
  const msg = req.body?.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;
  const name = msg.from?.first_name || "Kliyan";

  const reply = await hana.respond(text, `telegram_${chatId}`, name);
  await sendTelegram(chatId, reply);
});

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_TOKEN;
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  }).catch(console.error);
}

// ─────────────────────────────────────────
// 🔵 FACEBOOK MESSENGER
// ─────────────────────────────────────────
// Verification webhook Meta
app.get("/webhook/messenger", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/messenger", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== "page") return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;
      const senderId = event.sender.id;
      const text = event.message.text;
      const reply = await hana.respond(text, `messenger_${senderId}`, "Kliyan");
      await sendMessenger(senderId, reply);
    }
  }
});

async function sendMessenger(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.META_PAGE_TOKEN}`,
    { recipient: { id: recipientId }, message: { text } }
  ).catch(console.error);
}

// ─────────────────────────────────────────
// 🟢 WHATSAPP BUSINESS (Meta Cloud API)
// ─────────────────────────────────────────
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/whatsapp", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const messages = changes?.value?.messages;
  if (!messages?.length) return;

  const msg = messages[0];
  if (msg.type !== "text") return;

  const phone = msg.from;
  const text = msg.text.body;
  const name = changes?.value?.contacts?.[0]?.profile?.name || "Kliyan";

  const reply = await hana.respond(text, `whatsapp_${phone}`, name);
  await sendWhatsApp(phone, reply);
});

async function sendWhatsApp(to, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${process.env.META_PAGE_TOKEN}` } }
  ).catch(console.error);
}

// ─────────────────────────────────────────
// 🌐 CHAT SOU SITE (REST API pou HandyPay)
// ─────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, sessionId, name } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "message ak sessionId obligatwa" });
  }
  const reply = await hana.respond(message, `site_${sessionId}`, name || "Kliyan");
  res.json({ reply });
});

// Health check
app.get("/", (req, res) => res.send("✅ HANA HandyPay Agent mache!"));

app.listen(PORT, () => console.log(`🚀 HANA ap koute sou port ${PORT}`));
