const assert = require("node:assert/strict");
const test = require("node:test");
const { repairOutboundText } = require("../src/services/textEncoding");

test("repairs common WhatsApp mojibake before sending", () => {
  assert.equal(
    repairOutboundText("Kont verifye âœ… Balans ou. Voye enfÃ²masyon an ankÃ² ðŸ™‚"),
    "Kont verifye ✅ Balans ou. Voye enfòmasyon an ankò 🙂"
  );
});

test("preserves already-valid multilingual text", () => {
  assert.equal(
    repairOutboundText("Bonjou — votre dépôt est prêt ✅"),
    "Bonjou — votre dépôt est prêt ✅"
  );
});
