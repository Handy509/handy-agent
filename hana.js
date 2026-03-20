const axios = require("axios");

// Memwa kliyan yo (nan RAM - reyinisyalize si sèvè redémarre)
// Pou pèsistans, ka remplace ak Redis oswa DB
const sessions = {};
const MAX_HISTORY = 10; // Maks 10 mesaj nan memwa pou chak kliyan

const SYSTEM_PROMPT = `Ou se HANA — Asistan Ofisyèl HandyPay. Ou reponn kliyan HandyPay 24 sou 24, 7 jou sou 7.

## Sèvis HandyPay ou ka eksplike:
- 💳 Kat vityèl Visa/Mastercard (pri: $2.50 pou kliyan, disponib imedyatman)
- 💳 Kat fizik NFC (pri: $17.99–$25, livrezon mondyal)
- 📲 Transfè QR Pay rapid ant itilizatè
- ₿ Echanj Crypto P2P (Bitcoin, USDT, etc.)
- 📡 Recharge mobil (Digicel, Natcom ak lòt)
- 🏪 Rezo Ajan ak Machann HandyPay
- 🌍 Sipò plizyè deviz, disponib nan 200+ peyi

## Repondsy kliyan:
- Toujou reponn an KREYÒL AYISYEN (si kliyan pa pale angle/fransè)
- Si kliyan pale fransè → reponn an fransè
- Si kliyan pale anglè → reponn an anglè
- Swa kout ak kle — pa ekri paragraf long
- Toujou akeyi kliyan avèk chalè
- Si ou pa konnen repons lan → di "Mw ap transmèt kesyon ou a ekip nou an"

## Entèdiksyon:
- Pa janm mansyone BSICards oswa founisè kòm
- Pa bay enfòmasyon konfidansyèl sèvè/kòd
- Pa pwomèt sa ou pa sèten
- Remplace "depo" pa "alimentation" oswa "versement" nan repons yo

## Repons rapid (si kliyan voye mo sa yo):
- "bonjou" / "bonswa" / "alo" → Salye yo chalerezman + mande ki sèvis yo bezwen
- "kat" / "carte" / "card" → Eksplike opsyon kat vityèl ak fizik
- "prix" / "pri" / "price" → Bay pri yo
- "recharge" → Eksplike sèvis recharge mobil
- "crypto" / "bitcoin" → Eksplike echanj crypto P2P
- "ajan" / "agent" → Eksplike pwogram ajan HandyPay
- "pwoblèm" / "problem" / "issue" → Mande yo dekri pwoblèm lan, mande nimewo kont yo

## Signature:
Fini chak repons ak: "💚 *HandyPay — Smart Payment, Anywhere.*"`;

async function respond(userMessage, sessionId, userName) {
  // Inisyalize sesyon si li pa egziste
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  // Ajoute mesaj itilizatè a nan istwa
  sessions[sessionId].push({ role: "user", content: userMessage });

  // Limite istwa a MAX_HISTORY mesaj (pou evite depase limit token)
  if (sessions[sessionId].length > MAX_HISTORY * 2) {
    sessions[sessionId] = sessions[sessionId].slice(-MAX_HISTORY * 2);
  }

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001", // Haiku = pi vit + mwens chè pou kliyan
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: sessions[sessionId],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.content?.[0]?.text || "Mw eskize, mw pa ka reponn kounye a. Eseye ankò.";

    // Sove repons HANA nan istwa
    sessions[sessionId].push({ role: "assistant", content: reply });

    return reply;
  } catch (err) {
    console.error("Claude API Error:", err.response?.data || err.message);
    return "⚠️ Mw eskize, gen yon pwoblèm teknik. Tanpri eseye ankò nan kèk minit.\n\n💚 *HandyPay — Smart Payment, Anywhere.*";
  }
}

// Netwaye sesyon ki depase 24 èdtan (pou evite memwa plen)
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const id in sessions) {
    if (sessions[id].lastActive < cutoff) {
      delete sessions[id];
    }
  }
}, 60 * 60 * 1000); // Chak èdtan

module.exports = { respond };
