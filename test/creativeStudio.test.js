const assert = require("node:assert/strict");
const test = require("node:test");
const { creativePackage, marketPlan } = require("../src/services/creativeStudio");

test("creates localized poster, social copy and Remotion spec", () => {
  const plan = marketPlan("HT", { topics: [{ name: "new_visa", count: 8 }] });
  const output = creativePackage(plan, new Date("2026-07-28T12:00:00Z"));
  assert.equal(output.market, "HT");
  assert.equal(output.language, "ht");
  assert.equal(output.approvalRequired, true);
  assert.equal(output.publishingAllowed, false);
  assert.match(output.copy.x, /HandyPay/);
  assert.equal(output.video.remotionSpec.compositionId, "HandyPayViralShort");
  assert.equal(output.video.remotionSpec.durationInFrames, 540);
  assert.equal(output.poster.format, "1080x1350");
});

test("never includes sensitive card data or automatic publishing permission", () => {
  const output = JSON.stringify(creativePackage(marketPlan("FR", {})));
  assert.doesNotMatch(output, /cvv|411111|card number/i);
  assert.match(output, /approvalRequired/);
  assert.match(output, /"publishingAllowed":false/);
});
