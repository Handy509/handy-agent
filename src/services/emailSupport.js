const fs = require("fs/promises");
const path = require("path");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { config } = require("../config");
const { logger } = require("../logger");
const { appendJsonLine } = require("./storage");
const { sendTelegramAlert } = require("./telegram");

let pollTimer = null;
let running = false;
let consecutiveFailures = 0;
let nextAttemptAt = 0;
let lastFailureLogAt = 0;
let lastSuccessAt = null;
let lastFailure = null;

const HANDYPAY_KEYWORDS = [
  "handypay",
  "kat",
  "card",
  "carte",
  "visa",
  "mastercard",
  "digital",
  "recharge",
  "rechargement",
  "rechaje",
  "ajoute lajan",
  "add money",
  "depo",
  "dépôt",
  "depot",
  "dpo",
  "alimentation",
  "wallet",
  "kont",
  "compte",
  "balance",
  "balans",
  "kyc",
  "moncash",
  "mon cash",
  "natcash",
  "nat cash",
  "binance",
  "usdt",
  "paypal",
  "retrait",
  "retire",
  "retrè",
  "transaction",
  "pending",
  "an attente",
  "poko monte",
  "pa monte",
  "paka konekte",
  "connexion",
  "login",
  "password",
  "modpas"
];

const IRRELEVANT_SENDERS = [
  "netflix",
  "metamask",
  "facebook",
  "meta",
  "business.facebook.com",
  "testflight",
  "global trade register",
  "dowebnseo",
  "seo",
  "webdesign",
  "webcreation"
];

const IRRELEVANT_KEYWORDS = [
  "seo",
  "ranking",
  "google first page",
  "1st page",
  "website redesign",
  "web redesign",
  "web design",
  "website audit",
  "audit report",
  "price list",
  "proposal",
  "quote",
  "partner request",
  "business manager partner request",
  "agency partner",
  "agency partner program",
  "agency partner invoice",
  "meta agency",
  "store's sales",
  "smarter ai seo",
  "bookkeeping",
  "accounting",
  "stage truss",
  "unsubscribe",
  "advertising policy",
  "copyright team",
  "meta business regulations",
  "ad account",
  "policy compliance",
  "facebook copyright"
];

function isConfigured() {
  return Boolean(
    config.emailSupportEnabled &&
      config.emailImapHost &&
      config.emailUsername &&
      config.emailPassword
  );
}

function clip(text, max = 1800) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function statePath() {
  return path.join(config.dataDir, "email-state.json");
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(statePath(), "utf8"));
  } catch (_error) {
    return null;
  }
}

async function writeState(state) {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(statePath(), JSON.stringify(state, null, 2), "utf8");
}

function classifyEmail({ from, subject, body }) {
  const haystack = `${from}\n${subject}\n${body}`.toLowerCase();
  const sender = String(from || "").toLowerCase();
  const isInternalSupportTicket = sender.includes("noreply@handypayhaiti.com") && /support ticket/i.test(subject);
  const hasHandyPayKeyword = HANDYPAY_KEYWORDS.some((word) => haystack.includes(word));
  const looksIrrelevant =
    IRRELEVANT_SENDERS.some((word) => sender.includes(word)) ||
    IRRELEVANT_KEYWORDS.some((word) => haystack.includes(word));

  if (!isInternalSupportTicket && IRRELEVANT_SENDERS.some((word) => sender.includes(word))) {
    return { relevant: false, reason: "known irrelevant sender" };
  }

  if (looksIrrelevant && !hasHandyPayKeyword) {
    return { relevant: false, reason: "spam/marketing/non-HandyPay" };
  }

  if (looksIrrelevant && !isInternalSupportTicket) {
    return { relevant: false, reason: "marketing or phishing" };
  }

  if (!hasHandyPayKeyword) {
    return { relevant: false, reason: "no HandyPay support intent" };
  }

  return { relevant: true, reason: "customer support" };
}

function draftEmailReply({ subject, body }) {
  const text = `${subject}\n${body}`.toLowerCase();

  if (/(kyc|validation|verify|vérification|id|selfie)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann ou bezwen suivi sou verifikasyon/KYC kont ou.\n\nTanpri voye email ki asosye ak kont HandyPay ou a, epi ajoute screenshot etap kote ou bloke a. Ekip la ap verifye dosye a.";
  }

  if (/(retrait|retire|retrè|withdraw|moncash|binance|paypal|an attente|pending)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann ou gen yon retrè oswa tranzaksyon ki poko finalize.\n\nTanpri voye: email kont HandyPay ou, montan an, potay ou itilize a, dat/lè demann lan, epi screenshot tranzaksyon an. Ekip la ap verifye.";
  }

  if (/(depo|dépôt|depot|dpo|add money|ajoute lajan|rechargement|alimentation|poko monte|pa monte)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann alimentation kont ou a poko parèt.\n\nTanpri voye screenshot resi peman an ki soti nan app peman an, montan an, potay ou itilize a, ak email kont HandyPay ou. N ap verifye sa pou ou.";
  }

  if (/(starlink|peman|paiement|payment|otorizasyon|autorisation|authorization|3ds|otp)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann ou bezwen ede pou yon peman sou sit/app eksten.\n\nTanpri verifye kat la gen balans ase. Si sit la mande OTP/3DS oswa otorizasyon, voye screenshot mesaj la + email kont HandyPay ou + montan peman an. Ekip la ap gade dosye a.";
  }

  if (/(rechaje|recharge|fonds|wallet|insuffisant|insufficient|kat|card|carte|visa|mastercard)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann ou gen difikilte pou rechaje kat ou.\n\nSi lajan an deja sou balans kont HandyPay ou, voye screenshot erè a + email kont ou. Si lajan an poko sou kont lan, ale nan Ajoute lajan epi soumèt resi peman an.";
  }

  if (/(konekte|connexion|login|password|modpas|username)/i.test(text)) {
    return "Bonjou,\n\nMwen konprann ou gen pwoblèm koneksyon.\n\nTanpri voye email ki asosye ak kont ou a, epi di nou si pwoblèm nan se modpas, username, oswa mesaj erè ki parèt la.";
  }

  return "Bonjou,\n\nMèsi paske ou kontakte HandyPay.\n\nPou nou ede ou pi vit, tanpri voye email kont HandyPay ou, eksplike pwoblèm nan an 1-2 fraz, epi ajoute screenshot si ou genyen.";
}

async function baselineIfNeeded(client) {
  const state = await readState();
  if (state?.lastUid) return state;

  const all = await client.search({});
  const lastUid = all.length ? Math.max(...all) : 0;
  const newState = {
    lastUid,
    baselinedAt: new Date().toISOString()
  };

  await writeState(newState);
  logger.info({ lastUid }, "Email support baseline created; old inbox ignored");
  return newState;
}

async function processUnreadEmails() {
  if (!isConfigured() || running || Date.now() < nextAttemptAt) return;
  running = true;

  const client = new ImapFlow({
    host: config.emailImapHost,
    port: config.emailImapPort,
    secure: true,
    auth: {
      user: config.emailUsername,
      pass: config.emailPassword
    },
    connectionTimeout: Math.max(5000, config.emailConnectionTimeoutMs),
    greetingTimeout: Math.max(5000, config.emailGreetingTimeoutMs),
    socketTimeout: Math.max(10000, config.emailSocketTimeoutMs),
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const state = await baselineIfNeeded(client);
      const unseen = await client.search({ seen: false });
      const fresh = unseen.filter((uid) => uid > Number(state.lastUid || 0)).slice(0, 10);
      let lastUid = Number(state.lastUid || 0);

      for (const uid of fresh) {
        const message = await client.fetchOne(uid, { uid: true, envelope: true, source: true }, { uid: true });
        if (!message?.source) continue;

        lastUid = Math.max(lastUid, uid);
        const parsed = await simpleParser(message.source);
        const from = parsed.from?.text || "unknown";
        const subject = parsed.subject || "(san sijè)";
        const body = parsed.text || "";
        const classification = classifyEmail({ from, subject, body });

        if (!classification.relevant) {
          await appendJsonLine("emails-ignored.jsonl", {
            uid,
            from,
            subject,
            reason: classification.reason,
            createdAt: new Date().toISOString()
          });
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          continue;
        }

        const draft = draftEmailReply({ subject, body });

        await appendJsonLine("emails.jsonl", {
          direction: "inbound",
          channel: "email",
          uid,
          from,
          subject,
          text: clip(body, 4000),
          draft,
          mode: config.emailSupportMode,
          createdAt: new Date().toISOString()
        });

        await sendTelegramAlert(
          [
            "📩 Nouvo email kliyan HandyPay",
            `UID: ${uid}`,
            `From: ${from}`,
            `Subject: ${subject}`,
            "",
            "Rezime mesaj:",
            clip(body, 700),
            "",
            "Draft Kethura AI:",
            clip(draft, 1000),
            "",
            "Draft mode: li poko voye. Di mwen si ou vle m aktive approval pou voye email yo apre verifikasyon."
          ].join("\n")
        );

        await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
      }

      if (lastUid !== Number(state.lastUid || 0)) {
        await writeState({ ...state, lastUid, updatedAt: new Date().toISOString() });
      }
    } finally {
      lock.release();
    }
    if (consecutiveFailures > 0) {
      logger.info(
        { recoveredAfterFailures: consecutiveFailures },
        "Email support polling recovered"
      );
    }
    consecutiveFailures = 0;
    nextAttemptAt = 0;
    lastFailure = null;
    lastSuccessAt = new Date().toISOString();
  } catch (error) {
    consecutiveFailures += 1;
    const retryLimit = Math.max(1, config.emailRetryLimit);
    const retryDelayMs =
      consecutiveFailures < retryLimit
        ? Math.min(30000, 5000 * consecutiveFailures)
        : Math.max(60, config.emailFailureBackoffSeconds) * 1000;
    nextAttemptAt = Date.now() + retryDelayMs;
    lastFailure = {
      code: error?.code || error?.name || "EMAIL_POLL_FAILED",
      message: "Email polling failed; retry is scheduled.",
      at: new Date().toISOString()
    };

    const cooldownMs = Math.max(60, config.emailFailureLogCooldownSeconds) * 1000;
    const shouldLog =
      consecutiveFailures === 1 ||
      consecutiveFailures === retryLimit ||
      Date.now() - lastFailureLogAt >= cooldownMs;

    if (shouldLog) {
      lastFailureLogAt = Date.now();
      logger.warn(
        {
          errorCode: error?.code || error?.name || "EMAIL_POLL_FAILED",
          consecutiveFailures,
          nextAttemptAt: new Date(nextAttemptAt).toISOString()
        },
        "Email support polling paused after connection failure"
      );
    }
  } finally {
    try {
      await client.logout();
    } catch (_error) {
      // Ignore logout errors after failed connections.
    }
    running = false;
  }
}

function getEmailSupportStatus() {
  return {
    configured: isConfigured(),
    running,
    consecutiveFailures,
    nextAttemptAt: nextAttemptAt ? new Date(nextAttemptAt).toISOString() : null,
    lastSuccessAt,
    lastFailure
  };
}

function startEmailSupportMonitor() {
  if (!isConfigured()) {
    logger.info("Email support monitor disabled or not configured");
    return;
  }

  const intervalMs = Math.max(30, config.emailPollSeconds) * 1000;
  logger.info({ intervalMs, mode: config.emailSupportMode }, "Email support monitor started");

  processUnreadEmails();
  pollTimer = setInterval(processUnreadEmails, intervalMs);
}

function stopEmailSupportMonitor() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

module.exports = {
  classifyEmail,
  getEmailSupportStatus,
  processUnreadEmails,
  startEmailSupportMonitor,
  stopEmailSupportMonitor
};
