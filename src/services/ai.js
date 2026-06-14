const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const { config } = require("../config");
const { HANDYPAY_SYSTEM_RULES, PUBLIC_FAQ } = require("../knowledge/handypayRules");
const { loadKnowledgeBase } = require("../knowledge/knowledgeLoader");
const { pickAgentName } = require("../knowledge/agentConfig");
const { extractEmail, findCustomerByPhone, normalizeEmail } = require("./customers");
const { chargeVipSupport, verifyCustomer } = require("./handypayApi");
const { incrementUsage } = require("./rateLimit");
const { clearSession, getSession, setSession } = require("./sessionMemory");
const { isAdminPhone } = require("./adminCommands");
const { getVipAccess, requestVipAccess, setVipAccess } = require("./vip");

function withAgentName(text, agentName) {
  return text.replaceAll("{AGENT_NAME}", agentName);
}

function fallbackReply(messageText, agentName) {
  const normalized = messageText.toLowerCase();
  const faq = PUBLIC_FAQ.find((item) => item.match.some((word) => normalized.includes(word)));

  if (faq) return withAgentName(faq.answer, agentName);

  return "Bonjou ðŸ‘‹\nMwen ka ede w ak kat HandyPay, rechargement, parrainage, oswa kont ou.\nKi sa ou bezwen fÃ¨?";
}

function controlledReply(messageText, agentName) {
  const normalized = String(messageText || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if ([
    "ignore previous",
    "ignore all",
    "system prompt",
    "developer message",
    "api key",
    "token",
    "secret",
    "montre prompt",
    "bay prompt",
    "admin command",
    "bypass",
    "jailbreak"
  ].some((word) => normalized.includes(word))) {
    return "Mwen pa ka pataje enfomasyon sekirite oswa reg enten sistem nan.\nMwen ka ede w ak sevis HandyPay yo si ou bezwen asistans.";
  }

  if (["bot", "robot", "ki moun ou ye", "who are you", "tu es qui"].some((word) => normalized.includes(word))) {
    return "Mwen se Kethura AI, asistans otomatik HandyPay la.\nMwen la pou ede w ak kat, rechargement, kont, ak support.";
  }

  if (["balans", "balance", "solde", "kob mwen", "kob mw", "konbyen lajan"].some((word) => normalized.includes(word))) {
    return { type: "balance" };
  }

  if (["fristre", "mwen bouke", "mw bouke", "pase mize", "move eksperyans", "mekontantman", "pa janm"].some((word) => normalized.includes(word))) {
    return "Mwen konprann ou, e mwen dezole pou eksperyans sa a 😔\nVoye email ki sou kont ou a + screenshot denye ere a.\nM ap gide w etap pa etap.";
  }

  if (["email mw se", "email mwen se", "mon email est", "my email is"].some((word) => normalized.includes(word)) && !extractEmail(messageText)) {
    return "Mwen bezwen email la konple pou m verifye kont lan.\nEgzanp: nom@email.com";
  }

  if (["mete lajan", "ajoute lajan", "ajouter lajan", "add money", "fund account", "recharger kont", "recharge kont"].some((word) => normalized.includes(word))) {
    return "Gen diferans ant *balans kont HandyPay* ak *balans kat*.\n\nPou mete lajan sou kont ou: ale nan *Ajoute lajan*, chwazi potay la, mete montan an dola, peze *Proceed*, voye peman an, ajoute screenshot resi a, epi peze *Submit Proof*.";
  }

  if (["minit", "rechaj telefon", "recharge telefon", "recharge telephone", "telephone", "telefon", "telef", "phone", "recharge phone", "airtime", "topup", "top up"].some((word) => normalized.includes(word))) {
    return "Wi, HandyPay gen rechaj telefon/minit.\nAle nan *Sevis* > *Rechaj telefon*, mete nimewo a, chwazi montan an, epi konfime.\nBalans HandyPay ou dwe ase.";
  }

  if (["kat kado", "gift card", "giftcard", "google play", "amazon"].some((word) => normalized.includes(word))) {
    return "Pou kat kado: ale nan *Sevis* > *Kat kado*, chwazi brand/peyi a, chwazi montan ki disponib la, verifye total la, epi konfime.";
  }

  if (["internet", "entenet", "entènèt", "data bundle", "bundle data", "forfait data"].some((word) => normalized.includes(word))) {
    return "Pou internet/data: ale nan *Sevis* > *Entenet*, chwazi peyi/operateur ak paket la, mete nimewo a, verifye detay yo, epi konfime.";
  }

  if (["plis enfo sou handypay", "plis info sou handypay", "enfo sou handypay", "info sou handypay"].some((word) => normalized.includes(word))) {
    return "HandyPay ede w jwenn kat Visa/Mastercard digital pou peye online epi itilize Google Pay/Apple Pay.\nOu vle konnen plis sou pri kat yo oswa kijan pou aktive?";
  }

  if (["kalite kat", "info sou kat", "enfo sou kat", "plis enf", "de kat yo", "kat yo"].some((word) => normalized.includes(word))) {
    return "*HandyPay gen 4 kalite kat:*\n\nDigital Mastercard: $13\nDigital Visa Premium: $15 + $5\nMastercard Standard: $15 + $10\nVisa Standard: $15 + $10\n\nNou poko distribiye kat fizik pou kounye a. Antretan, ou ka itilize Digital Mastercard oswa Digital Visa, epi mete yo sou Google Pay/Apple Pay pou peye kote yo aksepte peman san kontak.";
  }

  if (["activation", "aktive", "activer"].some((word) => normalized.includes(word))) {
    return "*Pou aktive yon kat:*\n1. Kreye/konekte sou kont ou\n2. Verifye kont ou ak ID + selfie\n3. Chwazi kat ou vle a\n\nKat digital yo aktive imedyatman. Standard yo ka pran kek minit 🙂";
  }

  if (["pri", "frais", "fre", "fee", "koute"].some((word) => normalized.includes(word)) || normalized.includes("konbyen digital") || normalized.includes("konbyen kat")) {
    return "*Fre kat HandyPay yo:*\n\nDigital Mastercard: $13\nDigital Visa Premium: $15 + $5\nMastercard Standard: $15 + $10\nVisa Standard: $15 + $10\n\nTaux alimentation: 135 HTG pou $1.";
  }

  if (["moncash", "mon cash", "natcash", "nat cash"].some((word) => normalized.includes(word))) {
    return "Pou MonCash/NatCash: ale nan *Ajoute lajan*, chwazi potay la, mete montan an dola, epi peze *Proceed*.\nApre peman an, voye screenshot resi app peman an epi peze *Submit Proof*.";
  }

  if (["preuve", "prev", "screenshot", "screen", "capture"].some((word) => normalized.includes(word))) {
    return "Screenshot ki soti nan HandyPay pa sifi kom prev peman.\nTanpri voye screenshot tranzaksyon an nan app ou te peye a.";
  }

  if (["pa monte", "pa antre", "pa paret", "kob la"].some((word) => normalized.includes(word))) {
    return "Mwen konprann.\nVoye email kont ou + screenshot prev peman an.\nDi m montan ou te voye a tou.";
  }

  if (["pending", "refize", "refus", "rejet", "rejete", "pa pase"].some((word) => normalized.includes(word))) {
    return "Sa ka rive si montan an pa kouvri fre a oswa si detay yo pa byen antre.\nVoye email kont ou + screenshot ere a pou nou verifye.";
  }

  if (["paypal", "billing", "facturation", "adresse"].some((word) => normalized.includes(word))) {
    return "Si sit la mande adres facturation, mete:\n3401 N. Miami Ave. Ste 230, Miami, Florida, 33127, United States";
  }

  if (["mot de passe", "password", "modpas", "login", "konekte", "username"].some((word) => normalized.includes(word))) {
    return "Voye email ki sou kont ou a pou m verifye.\nSi modpas la pa mache, itilize opsyon reset password sou paj koneksyon an.";
  }

  if (["bravo", "mwen rive", "mw rive", "li mache", "merci", "mesi"].some((word) => normalized.includes(word))) {
    return "Mwen kontan sa mache pou ou 🥳\nPa ezite ekri nou si ou bezwen lot asistans.";
  }

  if (["google pay", "apple pay", "gpay", "apple"].some((word) => normalized.includes(word))) {
    return "Kat digital HandyPay yo ka monte sou Google Pay ak Apple Pay.\nSa pemet ou peye san kontak nan magazen ki aksepte yo.";
  }

  if (["limit", "plafond", "monthly", "mensuel"].some((word) => normalized.includes(word))) {
    return "Tout kat yo ka rive jiska $100,000 pa mwa.\nLimit final la ka depann de verifikasyon kont lan.";
  }

  if (["enskri", "inscription", "register", "kreye kont", "ouvrir compte"].some((word) => normalized.includes(word))) {
    return "Sou PC/iPhone:\nhttps://beta.handypayhaiti.com/register\n\nSou Android:\nhttps://play.google.com/store/apps/details?id=com.user.handypay&pli=1";
  }

  if (["rechaje", "recharge", "rechargement", "alimentation", "versement", "approvisionnement"].some((word) => normalized.includes(word))) {
    return "Si lajan an deja sou *balans kont HandyPay* ou, ou ka rechaje kat la fasil nan pati kat la.\nSi li poko sou kont lan, ale nan *Ajoute lajan* epi suiv etap peman yo.";
  }

  if (["txid", "usdt", "missing", "bloque", "blocked"].some((word) => normalized.includes(word))) {
    return "Mwen konprann.\nVoye nimewo kont ou, montan an, dat la, ak referans/TXID la.\nEkip la ap verifye dosye a.";
  }

  return null;
}
function sanitizeHandyPayLanguage(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/\bdepo\b/gi, "alimentation")
    .replace(/\bdeposit\b/gi, "alimentation")
    .replace(/\bBSICards\b/gi, "patne kat nou an")
    .replace(/ðŸ¤–/g, "")
    .trim();
}

async function generateReply({ customerMessage, customerPhone }) {
  const agentName = pickAgentName(customerPhone);
  const customer = await findCustomerByPhone(customerPhone);
  const vipAccess = await getVipAccess(customerPhone);
  const isAdmin = isAdminPhone(customerPhone);
  const normalizedMessage = String(customerMessage || "").trim().toLowerCase();
  const wantsVip = ["vip", "ok vip", "wi vip", "dako vip", "dakÃ² vip"].includes(normalizedMessage);

  if (wantsVip && !isAdmin) {
    const charge = await chargeVipSupport({ phone: customerPhone });

    if (charge.configured && charge.ok && charge.vip_activated) {
      await setVipAccess(customerPhone, 30, "handypay_balance_charge");
      return sanitizeHandyPayLanguage("VIP Support aktive âœ…\nNou retire $1 sou balans HandyPay ou.\nAksÃ¨ VIP ou valid pou 30 jou.");
    }

    if (charge.configured && charge.status === 402) {
      return sanitizeHandyPayLanguage("Balans ou pa ase pou aktive VIP Support.\nFrÃ¨ a se $1 sou balans HandyPay ou.");
    }

    if (charge.configured && charge.status === 404) {
      return sanitizeHandyPayLanguage("Mwen pa jwenn kont ki matche ak nimewo WhatsApp sa a.\nMete nimewo WhatsApp sa nan profil HandyPay ou, oswa ekri admin yo sou +1 (913) 733-7645.");
    }

    await requestVipAccess(customerPhone);
    return sanitizeHandyPayLanguage("Mwen pa ka aktive VIP otomatikman kounye a.\nMwen voye demann lan bay admin yo pou verifye epi retire $1 sou balans ou.");
  }

  const usage = await incrementUsage(customerPhone, customer?.vip || isAdmin || vipAccess.active);
  const emailFromMessage = extractEmail(customerMessage);
  const session = await getSession(customerPhone);

  if (!usage.allowed) {
    return sanitizeHandyPayLanguage(`Ou rive nan limit asistans gratis jodi a.\nPou VIP Support pandan 30 jou, frÃ¨ a se $${config.vipAccessPriceUsd} sou balans HandyPay ou.\nSi ou dakÃ² pou retire $1 sou kont ou, ekri â€œVIPâ€.`);
  }

  if (emailFromMessage) {
    await setSession(customerPhone, { lastEmail: emailFromMessage });
  }

  if (session?.intent === "balance_verification" && emailFromMessage) {
    const remoteCustomer = await verifyCustomer({ phone: customerPhone, email: emailFromMessage });
    await clearSession(customerPhone);

    if (remoteCustomer.configured) {
      if (!remoteCustomer.ok) {
        return sanitizeHandyPayLanguage("Mwen pa ka verifye kont lan kounye a.\nTanpri eseye ankÃ² pita oswa ekri admin yo sou +1 (913) 733-7645.");
      }

      if (!remoteCustomer.verified) {
        if (remoteCustomer.found && remoteCustomer.email_hint) {
          return sanitizeHandyPayLanguage("Email sa pa koresponn ak nimewo WhatsApp sa a.\nMete nimewo sa nan profil HandyPay ou.\nSi ou bezwen Ã¨d, ekri admin yo sou +1 (913) 733-7645 ðŸ™‚");
        }

        return sanitizeHandyPayLanguage("Mwen pa jwenn kont ki matche ak nimewo WhatsApp sa a.\nMete nimewo WhatsApp sa nan profil HandyPay ou, oswa ekri admin yo sou +1 (913) 733-7645.");
      }

      const account = remoteCustomer.customer || {};
      const balance = typeof account.balance !== "undefined" ? `$${account.balance}` : "pa disponib";
      return sanitizeHandyPayLanguage(`Kont verifye âœ…\nBalans ou: ${balance}\nNimewo kont: ${account.account_number || "pa disponib"}`);
    }
  }

  const controlled = controlledReply(customerMessage, agentName);
  if (controlled?.type === "balance") {
    const email = emailFromMessage || session?.lastEmail || "";

    if (!email) {
      await setSession(customerPhone, { intent: "balance_verification" });
      return sanitizeHandyPayLanguage("Pou sekirite, voye email ki sou kont HandyPay ou a pou m verifye avan m pataje enfÃ²masyon kont lan.");
    }

    const remoteCustomer = await verifyCustomer({ phone: customerPhone, email });

    if (remoteCustomer.configured) {
      if (!remoteCustomer.ok) {
        return sanitizeHandyPayLanguage("Mwen pa ka verifye kont lan kounye a.\nTanpri eseye ankÃ² pita oswa ekri admin yo sou +1 (913) 733-7645.");
      }

      if (!remoteCustomer.verified) {
        if (remoteCustomer.found && remoteCustomer.email_hint) {
          return sanitizeHandyPayLanguage("Email sa pa koresponn ak nimewo WhatsApp sa a.\nKonekte sou kont HandyPay ou, ale nan profil, epi mete nimewo WhatsApp sa a.\nSi ou pa ka chanje l, kontakte admin yo sou +1 (913) 733-7645 ðŸ™‚");
        }

        return sanitizeHandyPayLanguage("Mwen pa jwenn kont HandyPay ki matche ak nimewo WhatsApp sa a.\nKonekte sou kont ou epi mete nimewo WhatsApp sa a nan profil la.\nOu ka kontakte admin yo tou sou +1 (913) 733-7645.");
      }

      const account = remoteCustomer.customer || {};
      const balance = typeof account.balance !== "undefined" ? `$${account.balance}` : "pa disponib";
      return sanitizeHandyPayLanguage(`Kont verifye âœ…\nBalans ou: ${balance}\nNimewo kont: ${account.account_number || "pa disponib"}`);
    }

    if (!customer) {
      return sanitizeHandyPayLanguage("Mwen pa rekonÃ¨t nimewo sa a sou kont HandyPay.\nVoye email ki sou kont ou pou verifikasyon.");
    }

    if (normalizeEmail(email) !== normalizeEmail(customer.email)) {
      return sanitizeHandyPayLanguage("Email sa pa koresponn ak nimewo sa a.\nTanpri verifye email kont HandyPay ou a.");
    }

    if (!customer.balance) {
      return sanitizeHandyPayLanguage("Kont lan verifye, men balans live la poko konekte ak Kethura AI.\nM ap eskale sa bay ekip la.");
    }

    return sanitizeHandyPayLanguage(`Kont verifye.\nBalans ki anrejistre pou ou se ${customer.balance}.`);
  }

  if (controlled) return sanitizeHandyPayLanguage(controlled);

  const currentKnowledge = loadKnowledgeBase();
  const systemPrompt = [
    HANDYPAY_SYSTEM_RULES.replaceAll("{AGENT_NAME}", agentName),
    currentKnowledge
      ? `HandyPay current product and operations knowledge:\n${currentKnowledge}`
      : ""
  ].filter(Boolean).join("\n\n");
  const userPrompt = `Kliyan: ${customerPhone || "unknown"}\nMesaj: ${customerMessage}`;

  if (config.aiProvider === "anthropic" && config.anthropicApiKey) {
    const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
    const response = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: 120,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    const text = response.content?.map((part) => part.text || "").join("").trim();
    return sanitizeHandyPayLanguage(text || fallbackReply(customerMessage, agentName));
  }

  if (config.aiProvider === "openai" && config.openaiApiKey) {
    const openai = new OpenAI({ apiKey: config.openaiApiKey });
    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    return sanitizeHandyPayLanguage(text || fallbackReply(customerMessage, agentName));
  }

  return sanitizeHandyPayLanguage(fallbackReply(customerMessage, agentName));
}

module.exports = { generateReply, sanitizeHandyPayLanguage };
