const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzeResponse } = require("../src/services/responseQuality");

test("flags retired HandyPay features", () => {
  const result = analyzeResponse({
    customerMessage: "Ki nouvo bagay ki genyen?",
    reply: "Ale nan World Cup pou fè prediksyon."
  });
  assert.equal(result.needsReview, true);
  assert.ok(result.flags.includes("retired_world_cup"));
});

test("accepts careful New Visa denomination guidance", () => {
  const result = analyzeResponse({
    customerMessage: "Kisa 490000 vle di sou kat la?",
    reply: "Sou getcard, balance ak transaction amount yo deja an USD. Pou lòt endpoint, verifye kontra endpoint la; pa divize montan an selon gwosè li."
  });
  assert.equal(result.needsReview, false);
  assert.deepEqual(result.flags, []);
});

test("flags an unverified Windows Store availability claim", () => {
  const result = analyzeResponse({
    customerMessage: "Èske app Windows la disponib?",
    reply: "Wi, li disponib pou telechaje sou Microsoft Store."
  });
  assert.ok(result.flags.includes("windows_release_overclaim"));
});
