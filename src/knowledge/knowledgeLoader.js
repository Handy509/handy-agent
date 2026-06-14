const fs = require("fs");
const path = require("path");

const DEFAULT_KNOWLEDGE_PATH = path.resolve(
  __dirname,
  "../../knowledge/BASE_KONESANS_NOUVO_OPSYON_HANDYPAY_1_0_18.md"
);

function loadKnowledgeBase(filePath = process.env.KNOWLEDGE_BASE_PATH || DEFAULT_KNOWLEDGE_PATH) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

module.exports = { DEFAULT_KNOWLEDGE_PATH, loadKnowledgeBase };
