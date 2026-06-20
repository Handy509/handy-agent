const { readJson, writeJson } = require("./storage");
const { redactValue } = require("./security");

const MEMORY_FILE = "kethura-memory.json";

const CATEGORIES = [
  "HandyPay app updates",
  "Card services",
  "Google Play policy issues",
  "Marketing campaigns",
  "Customer support rules",
  "Provider incidents",
  "Promotions",
  "Operational alerts"
];

const CURRENT_CONTEXT = [
  {
    category: "Google Play policy issues",
    title: "Privacy Policy URL 404 issue",
    body:
      "HandyPay 13 sou Google Play gen issue Privacy Policy URL 404. URL ki te bay pwoblem: https://app.handypayhaiti.com/privacy-amp-data-use-handypay-llc/page/42. Dele Google bay: 19 Jiye 2026. Aksyon: mete yon privacy policy URL piblik, valid, san login, epi soumet pou review.",
    tags: ["google-play", "privacy-policy", "deadline-2026-07-19"],
    source: "codex_20260620"
  },
  {
    category: "HandyPay app updates",
    title: "HandyPay app release 1.0.19+66",
    body:
      "Nouvo version app la se 1.0.19+66. Denye commit app la: 32f2a970e443049d426edf1c2678ec1875bf2770. Secure widget audit te pase. flutter analyze, flutter test, APK release, ak appbundle release te pase.",
    tags: ["flutter", "release", "secure-widget"],
    source: "codex_20260620"
  },
  {
    category: "Customer support rules",
    title: "Sensitive public replies rule",
    body:
      "Pou balans, kat, KYC, tranzaksyon, oswa plent sansib sou sosyal: pa reponn detay piblikman. Mande kliyan an pase nan support prive epi bay minimum enfomasyon ofisyel.",
    tags: ["support", "privacy", "social-comments"],
    source: "codex_20260620"
  }
];

function emptyMemory() {
  return {
    version: 1,
    categories: Object.fromEntries(CATEGORIES.map((category) => [category, []])),
    updatedAt: new Date().toISOString()
  };
}

function normalizeEntry(entry = {}) {
  return {
    id: entry.id || `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    category: CATEGORIES.includes(entry.category) ? entry.category : "Operational alerts",
    title: String(entry.title || "").trim().slice(0, 180),
    body: String(entry.body || "").trim().slice(0, 2500),
    tags: Array.isArray(entry.tags) ? entry.tags.map(String).slice(0, 12) : [],
    source: String(entry.source || "admin").slice(0, 120),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function loadMemory() {
  const memory = await readJson(MEMORY_FILE, emptyMemory());
  for (const category of CATEGORIES) {
    if (!Array.isArray(memory.categories?.[category])) {
      memory.categories = memory.categories || {};
      memory.categories[category] = [];
    }
  }

  let changed = false;
  for (const seed of CURRENT_CONTEXT) {
    const exists = memory.categories[seed.category].some((item) => item.title === seed.title);
    if (!exists) {
      memory.categories[seed.category].push(normalizeEntry(seed));
      changed = true;
    }
  }

  if (changed) {
    memory.updatedAt = new Date().toISOString();
    await writeJson(MEMORY_FILE, memory);
  }

  return memory;
}

async function addMemoryEntry(entry) {
  const memory = await loadMemory();
  const normalized = normalizeEntry(redactValue(entry));
  if (!normalized.title || !normalized.body) {
    const error = new Error("Memory title and body are required");
    error.statusCode = 422;
    throw error;
  }

  memory.categories[normalized.category].unshift(normalized);
  memory.categories[normalized.category] = memory.categories[normalized.category].slice(0, 200);
  memory.updatedAt = new Date().toISOString();
  await writeJson(MEMORY_FILE, memory);
  return normalized;
}

async function memoryText() {
  const memory = await loadMemory();
  return CATEGORIES.map((category) => {
    const entries = memory.categories[category] || [];
    if (!entries.length) return "";
    return [`## ${category}`, ...entries.slice(0, 20).map((item) => `- ${item.title}: ${item.body}`)].join("\n");
  })
    .filter(Boolean)
    .join("\n\n");
}

module.exports = {
  CATEGORIES,
  CURRENT_CONTEXT,
  addMemoryEntry,
  loadMemory,
  memoryText
};
