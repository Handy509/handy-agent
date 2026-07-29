const test = require("node:test");
const assert = require("node:assert/strict");
const {
  repairMojibake,
  sanitizeHandyPayLanguage
} = require("../src/services/ai");

test("repairs broken Haitian Creole accents and WhatsApp emoji", () => {
  const repaired = sanitizeHandyPayLanguage(
    "Pou m pataje enfÃ²masyon. Kont verifye âœ… ðŸ™‚"
  );

  assert.equal(
    repaired,
    "Pou m pataje enfòmasyon. Kont verifye ✅ 🙂"
  );
  assert.doesNotMatch(repaired, /Ã|âœ|ðŸ/);
});

test("repairs system-prompt mojibake before it reaches an AI provider", () => {
  assert.equal(
    repairMojibake("LÃ¨ kliyan an bezwen Ã¨d, reponn avÃ¨ l."),
    "Lè kliyan an bezwen èd, reponn avè l."
  );
});
