const fs = require("fs");
const path = require("path");
const { config } = require("../config");

const DEFAULT_KNOWLEDGE_PATH = path.resolve(
  __dirname,
  "../../knowledge/BASE_KONESANS_NOUVO_OPSYON_HANDYPAY_1_0_18.md"
);

function loadKnowledgeBase(filePath = process.env.KNOWLEDGE_BASE_PATH || DEFAULT_KNOWLEDGE_PATH) {
  const parts = [];
  try {
    parts.push(fs.readFileSync(filePath, "utf8").trim());
  } catch (_error) {
    // Knowledge base is optional in local/test environments.
  }

  try {
    const memoryPath = path.resolve(config.dataDir, "kethura-memory.json");
    const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
    const memoryText = Object.entries(memory.categories || {})
      .flatMap(([category, entries]) =>
        Array.isArray(entries)
          ? [`## ${category}`, ...entries.slice(0, 20).map((item) => `- ${item.title}: ${item.body}`)]
          : []
      )
      .join("\n");
    if (memoryText) parts.push(`Kethura operational memory:\n${memoryText}`);
  } catch (_error) {
    // Runtime memory is created lazily by the memory service.
  }

  return parts.filter(Boolean).join("\n\n").trim();
}

module.exports = { DEFAULT_KNOWLEDGE_PATH, loadKnowledgeBase };
