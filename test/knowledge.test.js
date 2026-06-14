const assert = require("node:assert/strict");
const test = require("node:test");
const { loadKnowledgeBase } = require("../src/knowledge/knowledgeLoader");

test("HandyPay 1.0.18 knowledge base is available", () => {
  const knowledge = loadKnowledgeBase();

  assert.match(knowledge, /1\.0\.18\+65/);
  assert.match(knowledge, /World Cup 2026/i);
  assert.match(knowledge, /1xBet/i);
  assert.match(knowledge, /Community/i);
  assert.match(knowledge, /draft_only/i);
});
