const assert = require("node:assert/strict");
const test = require("node:test");
const { loadKnowledgeBase } = require("../src/knowledge/knowledgeLoader");

test("current HandyPay knowledge base is available", () => {
  const knowledge = loadKnowledgeBase();

  assert.match(knowledge, /HandyPay Digital/i);
  assert.match(knowledge, /Microsoft/i);
  assert.match(knowledge, /getcard/i);
  assert.doesNotMatch(knowledge, /World Cup 2026/i);
});
