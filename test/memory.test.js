const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-memory-"));
process.env.DATA_DIR = dataDir;

const { addMemoryEntry, loadMemory, memoryText } = require("../src/services/memory");

test("Kethura memory seeds current HandyPay context and accepts safe updates", async () => {
  const memory = await loadMemory();

  assert.ok(memory.categories["Google Play policy issues"].some((item) => item.title.includes("Privacy Policy")));
  assert.ok(memory.categories["HandyPay app updates"].some((item) => item.body.includes("1.0.19+66")));

  const entry = await addMemoryEntry({
    category: "Marketing campaigns",
    title: "Draft campaign",
    body: "Create only reviewed social drafts.",
    token: "should-not-be-stored"
  });

  assert.equal(entry.category, "Marketing campaigns");
  assert.equal(entry.token, undefined);

  const text = await memoryText();
  assert.match(text, /Privacy Policy URL 404/);
  assert.match(text, /Draft campaign/);
});
