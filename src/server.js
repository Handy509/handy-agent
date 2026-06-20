const express = require("express");
const pinoHttp = require("pino-http");
const { config } = require("./config");
const { logger } = require("./logger");
const { whatsappRouter } = require("./webhooks/whatsapp");
const { startEmailSupportMonitor } = require("./services/emailSupport");
const { createTicket } = require("./services/tickets");
const { generateReply } = require("./services/ai");
const { appendJsonLine, readJson, writeJson } = require("./services/storage");
const { sendTelegramAlert } = require("./services/telegram");
const { classifySupportIntent } = require("./services/supportIntent");
const { startGrowthAgent } = require("./services/growthAgent");
const { requireAdmin } = require("./services/security");
const { addMemoryEntry, loadMemory } = require("./services/memory");
const { createCommentReviewTask, createDailyPostDraft } = require("./services/socialAutomation");
const { dashboard, taskAction } = require("./services/tasks");
const { healthReport } = require("./services/monitoring");
const { dailyBrief } = require("./services/dailyBrief");
const { runOperatorCommand } = require("./services/operatorCommands");
const { getConnectorStatus, refreshOperationalData } = require("./services/operationalConnectors");

const app = express();
const WEB_CHAT_FILE = "web-chat-sessions.json";

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  if (
    !origin ||
    /https?:\/\/([^/]+\.)?(handypayhaiti\.com|kethura\.com)$/i.test(origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Kethura-Admin-Token");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/", (_req, res) => {
  res.json({
    name: "HandyPay AI Operations Agent",
    status: "online",
    whatsappWebhook: "/webhook/whatsapp"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "handypay-ai-agent",
    env: config.nodeEnv,
    time: new Date().toISOString()
  });
});

app.get("/api/admin/kethura/memory", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, memory: await loadMemory() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/memory", requireAdmin, async (req, res, next) => {
  try {
    const entry = await addMemoryEntry(req.body || {});
    res.status(201).json({ ok: true, entry });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/kethura/tasks", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, dashboard: await dashboard() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/kethura/daily-brief", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, brief: await dailyBrief() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/command", requireAdmin, async (req, res, next) => {
  try {
    const result = await runOperatorCommand({
      ...(req.body || {}),
      actor: "admin_api"
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/kethura/connectors", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, connectors: await getConnectorStatus() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/connectors/refresh", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, operational: await refreshOperationalData() });
  } catch (error) {
    next(error);
  }
});

app.get("/admin/kethura/tasks", requireAdmin, async (_req, res, next) => {
  try {
    const data = await dashboard();
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Kéthura Tasks</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e5e7eb;margin:0;padding:24px}table{width:100%;border-collapse:collapse;background:#111827}td,th{padding:10px;border-bottom:1px solid #243044;text-align:left}.cards{display:flex;gap:12px;margin:16px 0}.card{background:#111827;border:1px solid #243044;border-radius:8px;padding:14px}button{border:0;border-radius:6px;padding:7px 10px;margin-right:6px}</style></head>
<body><h1>Kéthura Tasks</h1><div class="cards">${Object.entries(data.counts)
      .map(([key, value]) => `<div class="card"><strong>${key}</strong><br>${value}</div>`)
      .join("")}</div>
<table><thead><tr><th>Priority</th><th>Status</th><th>Source</th><th>Retries</th><th>Last run</th><th>Task</th><th>Actions</th></tr></thead><tbody>
${data.tasks
      .map(
        (task) =>
          `<tr><td>${task.priority}</td><td>${task.status}</td><td>${task.source}</td><td>${task.retries}</td><td>${task.lastRunAt || ""}</td><td>${task.title}</td><td>retry approve reject pause</td></tr>`
      )
      .join("")}</tbody></table></body></html>`);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/tasks/:id/:action", requireAdmin, async (req, res, next) => {
  try {
    const task = await taskAction(String(req.params.id), String(req.params.action));
    res.json({ ok: true, task });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/social/daily-post-draft", requireAdmin, async (_req, res, next) => {
  try {
    res.status(201).json({ ok: true, draft: await createDailyPostDraft() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/kethura/social/comment-review", requireAdmin, async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, review: await createCommentReviewTask(req.body || {}) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/kethura/health", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ ok: true, health: await healthReport() });
  } catch (error) {
    next(error);
  }
});

app.get("/widget.js", (_req, res) => {
  res.type("application/javascript").send(`
(function () {
  "use strict";
  if (window.KethuraWebChatLoaded) return;
  window.KethuraWebChatLoaded = true;

  var API = "https://kethura.com/handypay-agent/api/chat";
  var SESSION_KEY = "kethura_web_chat_session";
  var VISITOR_KEY = "kethura_web_chat_visitor";
  var WHATSAPP_URL = window.KETHURA_WHATSAPP_URL || "https://wa.me/50935665273";
  var TELEGRAM_URL = window.KETHURA_TELEGRAM_URL || "https://t.me/handypayhaiti";

  function id(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function getStored(key, prefix) {
    try {
      var value = localStorage.getItem(key);
      if (!value) {
        value = id(prefix);
        localStorage.setItem(key, value);
      }
      return value;
    } catch (e) {
      return id(prefix);
    }
  }

  function ensureStyles() {
    if (document.getElementById("kethura-web-chat-style")) return;
    var style = document.createElement("style");
    style.id = "kethura-web-chat-style";
    style.textContent = [
      "#kethura-chat-panel{position:fixed;right:24px;bottom:104px;width:min(360px,calc(100vw - 28px));height:520px;max-height:calc(100vh - 138px);background:#fff;border:1px solid rgba(127,0,255,.18);border-radius:18px;box-shadow:0 22px 70px rgba(22,9,43,.24);z-index:10020;display:none;overflow:hidden;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#20172f}",
      "#kethura-chat-panel.kc-open{display:flex;flex-direction:column}",
      ".kc-head{display:flex;align-items:center;gap:10px;padding:14px 14px;background:linear-gradient(135deg,#6d28d9,#ef1775);color:#fff}",
      ".kc-mini{width:42px;height:42px;border-radius:50%;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.22);flex:0 0 auto}",
      ".kc-title{font-weight:800;font-size:15px;line-height:1.1}.kc-sub{font-size:12px;opacity:.86;margin-top:3px}.kc-close{margin-left:auto;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:18px;line-height:1}",
      ".kc-body{flex:1;overflow:auto;padding:14px;background:#fbf9ff;display:flex;flex-direction:column;gap:10px}",
      ".kc-msg{max-width:84%;border-radius:15px;padding:10px 12px;font-size:13px;line-height:1.42;white-space:pre-wrap;word-break:break-word}.kc-bot{align-self:flex-start;background:#fff;border:1px solid rgba(127,0,255,.12);color:#2b1a42}.kc-user{align-self:flex-end;background:#6d28d9;color:#fff}",
      ".kc-input{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid rgba(127,0,255,.12)}.kc-input textarea{flex:1;resize:none;height:42px;max-height:90px;border:1px solid rgba(127,0,255,.16);border-radius:13px;padding:10px 11px;font-size:13px;outline:none}.kc-input button{width:44px;border:0;border-radius:13px;background:#6d28d9;color:#fff;font-weight:800;cursor:pointer}",
      ".kc-actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 12px 12px;background:#fff}.kc-chip{border:1px solid rgba(127,0,255,.16);background:#faf7ff;color:#4a148c;border-radius:999px;padding:7px 10px;font-size:12px;cursor:pointer}",
      ".kc-contact{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 12px 12px;background:#fff;color:#6b5d7a;font-size:12px}.kc-contact-label{margin-right:2px}.kc-contact a{display:inline-flex;align-items:center;gap:5px;text-decoration:none;border-radius:999px;padding:7px 10px;font-weight:700;border:1px solid rgba(127,0,255,.14);background:#fff;color:#4a148c}.kc-contact a:hover{background:#faf7ff}",
      "@media(max-width:480px){#kethura-chat-panel{right:10px;bottom:84px;height:500px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function avatarMarkup() {
    var existing = document.querySelector("#kw-avatar svg");
    if (existing) return existing.outerHTML;
    return '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="kcBg" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#9B4DFF"/><stop offset="100%" stop-color="#4A0095"/></radialGradient><radialGradient id="kcSkin" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#FDEBD0"/><stop offset="100%" stop-color="#F0C080"/></radialGradient></defs><circle cx="40" cy="40" r="40" fill="url(#kcBg)"/><ellipse cx="40" cy="46" rx="23" ry="26" fill="url(#kcSkin)"/><ellipse cx="40" cy="22" rx="24" ry="14" fill="#2C0060"/><ellipse cx="32" cy="44" rx="4.5" ry="5" fill="#2A1505"/><ellipse cx="48" cy="44" rx="4.5" ry="5" fill="#2A1505"/><path d="M31 57 Q40 63 49 57" stroke="#8B3A20" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }

  function ensureLauncher() {
    var launcher = document.getElementById("kw-inner");
    if (launcher) return launcher;

    var outer = document.createElement("div");
    outer.id = "kw-outer";
    outer.style.cssText = "position:fixed;right:22px;bottom:24px;z-index:10010";
    outer.innerHTML = '<div id="kw-inner" title="Chat with Kethura AI" style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;cursor:pointer"><div id="kw-bubble" style="background:#fff;border:1px solid rgba(127,0,255,.18);box-shadow:0 4px 24px rgba(127,0,255,.13);border-radius:16px 16px 4px 16px;padding:9px 14px;text-align:right;color:#3a0070;font-weight:700;font-size:13px"><span id="kw-msg">Need help?</span><span style="display:block;color:#7c3aed;font-size:11px;font-weight:500">Kethura AI</span></div><div id="kw-avatar" style="width:62px;height:62px;border-radius:50%;overflow:hidden;box-shadow:0 6px 28px rgba(127,0,255,.35)">' + avatarMarkup() + '</div></div>';
    document.body.appendChild(outer);
    return document.getElementById("kw-inner");
  }

  function getLocale() {
    var raw = [
      document.documentElement.getAttribute("lang"),
      document.querySelector("meta[name='language']") && document.querySelector("meta[name='language']").content,
      window.KETHURA_LOCALE,
      navigator.language
    ].filter(Boolean).join(" ").toLowerCase();

    if (raw.indexOf("fr") === 0 || raw.indexOf("fr-") === 0 || raw.indexOf("fr_") === 0) return "fr";
    if (raw.indexOf("en") === 0 || raw.indexOf("en-") === 0 || raw.indexOf("en_") === 0) return "en";
    if (raw.indexOf("ht") === 0 || raw.indexOf("ht-") === 0 || raw.indexOf("ht_") === 0) return "ht";

    var pageText = ((document.body && document.body.innerText) || "").slice(0, 1200).toLowerCase();
    if (pageText.indexOf("connexion") !== -1 || pageText.indexOf("mot de passe") !== -1 || pageText.indexOf("s'inscrire") !== -1) return "fr";
    if (pageText.indexOf("sign in") !== -1 || pageText.indexOf("password") !== -1 || pageText.indexOf("register") !== -1) return "en";
    return "ht";
  }

  function getCopy() {
    var packs = {
      ht: {
        subtitle: "Online - Asistan HandyPay",
        greeting: "Bonjou. Mwen se Kethura AI. Ou ka pale ave m isit la san WhatsApp.",
        placeholder: "Ekri mesaj ou...",
        chips: ["Kijan pou aktive kat?", "Mwen gen pwoblem rechargement", "Mwen vle pale ak moun"],
        contactLabel: "Oswa kontakte nou:"
      },
      fr: {
        subtitle: "En ligne - Assistant HandyPay",
        greeting: "Bonjour. Je suis Kethura AI. Vous pouvez me parler ici sans WhatsApp.",
        placeholder: "Ecrivez votre message...",
        chips: ["Comment activer ma carte ?", "J'ai un probleme de recharge", "Je veux parler a un agent"],
        contactLabel: "Ou contactez-nous:"
      },
      en: {
        subtitle: "Online - HandyPay assistant",
        greeting: "Hello. I'm Kethura AI. You can chat with me here without WhatsApp.",
        placeholder: "Write your message...",
        chips: ["How do I activate my card?", "I have a funding issue", "I want to speak to a person"],
        contactLabel: "Or contact us:"
      }
    };
    return packs[getLocale()] || packs.ht;
  }

  function addMessage(body, role) {
    var area = document.querySelector("#kethura-chat-panel .kc-body");
    if (!area) return;
    var el = document.createElement("div");
    el.className = "kc-msg " + (role === "user" ? "kc-user" : "kc-bot");
    el.textContent = body;
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
  }

  function ensurePanel() {
    var panel = document.getElementById("kethura-chat-panel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "kethura-chat-panel";
    panel.setAttribute("aria-label", "Kethura AI chat");
    panel.innerHTML = '<div class="kc-head"><div class="kc-mini">' + avatarMarkup() + '</div><div><div class="kc-title">Kethura AI</div><div class="kc-sub">Online • HandyPay assistant</div></div><button class="kc-close" type="button" aria-label="Close">×</button></div><div class="kc-body"><div class="kc-msg kc-bot">Bonjou 👋\\nMwen se Kethura AI. Ou ka pale avè m isit la san WhatsApp.</div></div><div class="kc-actions"><button class="kc-chip" type="button">Kijan pou aktive kat?</button><button class="kc-chip" type="button">Mwen gen pwoblèm rechargement</button><button class="kc-chip" type="button">Mwen vle pale ak moun</button></div><form class="kc-input"><textarea name="message" placeholder="Ekri mesaj ou..." required></textarea><button type="submit">➤</button></form>';
    document.body.appendChild(panel);
    var t = getCopy();
    var subtitle = panel.querySelector(".kc-sub");
    var greeting = panel.querySelector(".kc-body .kc-bot");
    var textarea = panel.querySelector("textarea");
    var chipButtons = panel.querySelectorAll(".kc-chip");
    var contact = document.createElement("div");
    contact.className = "kc-contact";
    contact.innerHTML = '<span class="kc-contact-label"></span><a class="kc-whatsapp" target="_blank" rel="noopener">WhatsApp</a><a class="kc-telegram" target="_blank" rel="noopener">Telegram</a>';
    if (subtitle) subtitle.textContent = t.subtitle;
    if (greeting) greeting.textContent = t.greeting;
    if (textarea) textarea.setAttribute("placeholder", t.placeholder);
    t.chips.forEach(function (label, index) {
      if (chipButtons[index]) chipButtons[index].textContent = label;
    });
    contact.querySelector(".kc-contact-label").textContent = t.contactLabel;
    contact.querySelector(".kc-whatsapp").href = WHATSAPP_URL;
    contact.querySelector(".kc-telegram").href = TELEGRAM_URL;
    var actions = panel.querySelector(".kc-actions");
    if (actions) actions.insertAdjacentElement("afterend", contact);
    panel.querySelector(".kc-close").addEventListener("click", function () { panel.classList.remove("kc-open"); });
    panel.querySelectorAll(".kc-chip").forEach(function (chip) {
      chip.addEventListener("click", function () { sendMessage(chip.textContent); });
    });
    panel.querySelector(".kc-input").addEventListener("submit", function (event) {
      event.preventDefault();
      var textarea = panel.querySelector("textarea");
      var value = textarea.value.trim();
      if (!value) return;
      textarea.value = "";
      sendMessage(value);
    });
    return panel;
  }

  async function sendMessage(text) {
    addMessage(text, "user");
    var typing = "Kethura ap ekri...";
    addMessage(typing, "bot");
    try {
      var response = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: getStored(SESSION_KEY, "web"),
          visitorId: getStored(VISITOR_KEY, "visitor"),
          message: text,
          pageUrl: location.href,
          locale: document.documentElement.lang || navigator.language || ""
        })
      });
      var data = await response.json();
      var messages = document.querySelectorAll("#kethura-chat-panel .kc-msg");
      if (messages.length) messages[messages.length - 1].remove();
      addMessage(data.reply || "Mwen resevwa mesaj ou a. Ekip la ap verifye.", "bot");
      if (data.sessionId) {
        try { localStorage.setItem(SESSION_KEY, data.sessionId); } catch (e) {}
      }
    } catch (e) {
      var items = document.querySelectorAll("#kethura-chat-panel .kc-msg");
      if (items.length) items[items.length - 1].remove();
      addMessage("Mwen pa ka reponn kounye a. Tanpri eseye ankò nan kèk segond.", "bot");
    }
  }

  function openChat() {
    ensurePanel().classList.add("kc-open");
  }

  function boot() {
    ensureStyles();
    var launcher = ensureLauncher();
    launcher.removeAttribute("onclick");
    launcher.onclick = null;
    launcher.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openChat();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();`);
});

function makeSessionId() {
  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clipText(text, max = 900) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function shouldNotifyHuman(message) {
  const value = String(message || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "moun",
    "agent",
    "humain",
    "human",
    "support",
    "admin",
    "pa mache",
    "pa rezoud",
    "fache",
    "urgent",
    "bloque",
    "blocked",
    "kyc",
    "lajan pa",
    "kob la"
  ].some((keyword) => value.includes(keyword));
}

async function readWebChatSessions() {
  return readJson(WEB_CHAT_FILE, {});
}

async function saveWebChatSession(sessionId, updater) {
  const sessions = await readWebChatSessions();
  const current = sessions[sessionId] || {
    id: sessionId,
    channel: "web",
    messages: [],
    createdAt: new Date().toISOString()
  };

  sessions[sessionId] = updater(current);
  sessions[sessionId].updatedAt = new Date().toISOString();
  await writeJson(WEB_CHAT_FILE, sessions);

  return sessions[sessionId];
}

app.post("/api/chat", async (req, res, next) => {
  try {
    const message = String(req.body.message || "").trim();
    const pageUrl = String(req.body.pageUrl || "");
    const locale = String(req.body.locale || "");
    const sessionId = String(req.body.sessionId || "").trim() || makeSessionId();
    const visitorId = String(req.body.visitorId || sessionId);
    const intent = classifySupportIntent(message);

    if (!message) {
      return res.status(422).json({ ok: false, error: "Message is required" });
    }

    const userMessage = {
      role: "user",
      text: clipText(message, 2000),
      pageUrl,
      locale,
      intent: intent.name,
      riskLevel: intent.risk,
      createdAt: new Date().toISOString()
    };

    await saveWebChatSession(sessionId, (session) => ({
      ...session,
      visitorId,
      pageUrl: pageUrl || session.pageUrl || "",
      locale: locale || session.locale || "",
      messages: [...(session.messages || []), userMessage].slice(-40)
    }));

    let reply;
    try {
      reply = await generateReply({
        customerMessage: message,
        customerPhone: `web:${sessionId}`
      });
    } catch (error) {
      logger.warn({ error }, "Web chat AI provider failed, using local fallback");
      reply = "Mwen la pou ede w ak HandyPay.\nOu ka poze m kesyon sou kat, rechargement, kont, KYC, oswa peman online.";
    }

    const assistantMessage = {
      role: "assistant",
      text: clipText(reply, 2000),
      createdAt: new Date().toISOString()
    };

    await saveWebChatSession(sessionId, (session) => ({
      ...session,
      messages: [...(session.messages || []), assistantMessage].slice(-40)
    }));

    await appendJsonLine("web-conversations.jsonl", {
      sessionId,
      visitorId,
      pageUrl,
      locale,
      message: userMessage.text,
      reply: assistantMessage.text,
      createdAt: new Date().toISOString()
    });

    if (intent.risk === "high") {
      await createTicket({
        source: "web_chat",
        customerPhone: `web:${sessionId}`,
        subject: `Kethura escalation: ${intent.name}`,
        message: userMessage.text,
        priority: "high",
        metadata: { pageUrl, locale, sessionId, intent: intent.name }
      });
    }

    if (shouldNotifyHuman(message) || intent.risk === "high") {
      await sendTelegramAlert([
        "HandyPay web chat needs attention",
        `Session: ${sessionId}`,
        pageUrl ? `Page: ${pageUrl}` : "",
        `Message: ${userMessage.text}`,
        "",
        `Reply later support is being prepared. For now, check ${config.publicBaseUrl}/api/chat/${sessionId}/messages`
      ].filter(Boolean).join("\n"));
    }

    return res.json({
      ok: true,
      sessionId,
      reply: assistantMessage.text,
      humanAvailable: false
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/chat/:sessionId/messages", async (req, res, next) => {
  try {
    const sessions = await readWebChatSessions();
    const session = sessions[String(req.params.sessionId)] || null;

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    return res.json({
      ok: true,
      sessionId: session.id,
      messages: session.messages || []
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tickets", async (req, res, next) => {
  try {
    const ticket = await createTicket({
      source: req.body.source || "api",
      customerPhone: req.body.customerPhone || "",
      subject: req.body.subject || "Manual ticket",
      message: req.body.message || "",
      priority: req.body.priority || "normal",
      metadata: req.body.metadata || {}
    });

    res.status(201).json({ ok: true, ticket });
  } catch (error) {
    next(error);
  }
});

app.use("/webhook/whatsapp", whatsappRouter);

app.use((error, req, res, _next) => {
  const requestLogger = req.log || logger;
  requestLogger.error({ error }, "Unhandled request error");

  if (res.headersSent) return;
  res.status(error.statusCode || 500).json({
    ok: false,
    error: error.statusCode ? error.message : "Internal server error"
  });
});

function startServer() {
  return app.listen(config.port, () => {
    logger.info({ port: config.port }, "HandyPay AI Operations Agent started");
    startEmailSupportMonitor();
    startGrowthAgent();
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
