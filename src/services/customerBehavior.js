const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

const PHONE_COUNTRIES = [
  ["509", "HT"],
  ["1", "US/CA"],
  ["33", "FR"],
  ["590", "GP/MF"],
  ["594", "GF"],
  ["596", "MQ"],
  ["1-809", "DO"],
  ["1-829", "DO"],
  ["1-849", "DO"]
];

function normalized(value = "") {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function countryOf(item = {}) {
  const explicit = String(item.country || item.countryCode || "").trim().toUpperCase();
  if (/^[A-Z]{2,3}$/.test(explicit)) return explicit;
  const localeCountry = String(item.locale || "").match(/[-_]([A-Za-z]{2})\b/);
  if (localeCountry) return localeCountry[1].toUpperCase();
  const digits = String(item.customerPhone || "").replace(/\D/g, "");
  for (const [prefix, country] of PHONE_COUNTRIES.sort((a, b) => b[0].length - a[0].length)) {
    if (digits.startsWith(prefix.replace(/\D/g, ""))) return country;
  }
  return "unknown";
}

function languageOf(item = {}) {
  const locale = String(item.locale || "").slice(0, 2).toLowerCase();
  if (["ht", "fr", "en"].includes(locale)) return locale;
  const text = normalized(item.text || item.message || "");
  if (/\b(mwen|mw|kijan|poukisa|kob|lajan|kat)\b/.test(text)) return "ht";
  if (/\b(je|vous|pourquoi|comment|carte|argent|solde)\b/.test(text)) return "fr";
  if (/\b(the|how|why|card|money|balance|please)\b/.test(text)) return "en";
  return "unknown";
}

function topicOf(item = {}) {
  const text = normalized(item.text || item.message || "");
  const topics = [
    ["new_visa", ["new visa", "nouvo visa", "getcard"]],
    ["card", ["kat", "card", "visa", "mastercard"]],
    ["funding", ["recharge", "alimentation", "ajoute lajan", "fund"]],
    ["kyc", ["kyc", "verifye", "verification", "selfie", "id"]],
    ["transfer", ["transfer", "transfe", "virement"]],
    ["mobile_recharge", ["minit", "airtime", "recharge telefon", "data"]],
    ["windows", ["windows", "microsoft store", "app pc"]],
    ["support", ["pwoblem", "problem", "erreur", "pa mache", "support"]]
  ];
  return topics.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "other";
}

function frustrated(item = {}) {
  const text = normalized(item.text || item.message || "");
  return ["pa mache", "pa rezoud", "mwen bouke", "mw bouke", "fache", "fristre", "erreur", "problem"].some((word) => text.includes(word));
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function analyzeCustomerBehavior(events = []) {
  const byCountry = {};
  const byLanguage = {};
  const byTopic = {};
  const byHour = {};
  let frustrationSignals = 0;

  for (const event of events) {
    increment(byCountry, countryOf(event));
    increment(byLanguage, languageOf(event));
    increment(byTopic, topicOf(event));
    const hour = new Date(event.createdAt || 0).getUTCHours();
    if (Number.isFinite(hour)) increment(byHour, String(hour).padStart(2, "0"));
    if (frustrated(event)) frustrationSignals += 1;
  }

  const top = (counts, limit = 8) => Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
  const busiest = top(byHour, 3).map(({ name, count }) => ({ hourUtc: Number(name), count }));
  const recommendations = [];
  if (top(byCountry, 1)[0]) recommendations.push(`Prepare content for ${top(byCountry, 1)[0].name}, the most active country group.`);
  const leadingLanguage = top(byLanguage, 1)[0];
  if (leadingLanguage && leadingLanguage.name !== "unknown") {
    recommendations.push(`Prioritize ${leadingLanguage.name.toUpperCase()} support content.`);
  }
  if (top(byTopic, 1)[0]) recommendations.push(`Improve the ${top(byTopic, 1)[0].name} flow and FAQ; it is the top request.`);
  if (frustrationSignals) recommendations.push(`Review ${frustrationSignals} aggregate frustration signal(s); do not profile individual customers.`);

  return {
    privacyMode: "aggregate_only",
    totalInteractions: events.length,
    countries: top(byCountry),
    languages: top(byLanguage),
    topics: top(byTopic),
    busiestHoursUtc: busiest,
    frustrationSignals,
    recommendations
  };
}

async function readJsonLines(fileName, since) {
  try {
    const content = await fs.readFile(path.join(config.dataDir, fileName), "utf8");
    return content.split(/\r?\n/).filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter((item) => item && new Date(item.createdAt || 0) >= since);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function dailyCustomerBehavior(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const [whatsapp, web] = await Promise.all([
    readJsonLines("conversations.jsonl", since),
    readJsonLines("web-conversations.jsonl", since)
  ]);
  const inbound = whatsapp.filter((item) => item.direction === "inbound");
  const webInbound = web.map((item) => ({
    message: item.message,
    locale: item.locale,
    country: item.country,
    createdAt: item.createdAt
  }));
  return { windowHours: hours, ...analyzeCustomerBehavior([...inbound, ...webInbound]) };
}

module.exports = { analyzeCustomerBehavior, countryOf, dailyCustomerBehavior, languageOf, topicOf };
