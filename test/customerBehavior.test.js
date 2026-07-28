const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzeCustomerBehavior, countryOf } = require("../src/services/customerBehavior");

test("aggregates behavior by country, language, topic and hour", () => {
  const result = analyzeCustomerBehavior([
    { customerPhone: "+509 35 00 0000", text: "Mwen gen pwoblem ak new Visa", createdAt: "2026-07-28T13:00:00Z" },
    { locale: "fr-FR", message: "Comment recharger ma carte?", createdAt: "2026-07-28T13:30:00Z" },
    { locale: "en-US", message: "Is the Windows app available?", createdAt: "2026-07-28T18:00:00Z" }
  ]);
  assert.equal(result.totalInteractions, 3);
  assert.deepEqual(result.countries.slice(0, 3), [
    { name: "HT", count: 1 },
    { name: "FR", count: 1 },
    { name: "US", count: 1 }
  ]);
  assert.equal(result.languages[0].name, "ht");
  assert.equal(result.busiestHoursUtc[0].hourUtc, 13);
  assert.equal(result.privacyMode, "aggregate_only");
});

test("does not expose a phone number in aggregate output", () => {
  const phone = "+50935000000";
  const result = JSON.stringify(analyzeCustomerBehavior([
    { customerPhone: phone, text: "kat", createdAt: new Date().toISOString() }
  ]));
  assert.equal(result.includes(phone), false);
  assert.equal(countryOf({ customerPhone: phone }), "HT");
});
