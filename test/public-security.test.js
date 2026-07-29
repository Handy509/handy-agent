const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { config } = require("../src/config");
const {
  hashToken,
  makeOpaqueToken,
  safeEqual,
  verifySessionToken
} = require("../src/services/publicSecurity");
const { verifyWhatsAppSignature } = require("../src/webhooks/whatsapp");

test("WhatsApp signature verification rejects missing and altered signatures", () => {
  const previousSecret = config.whatsappAppSecret;
  const previousRequired = config.whatsappRequireSignature;
  config.whatsappAppSecret = "test-app-secret";
  config.whatsappRequireSignature = true;
  const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
  const valid = `sha256=${crypto
    .createHmac("sha256", config.whatsappAppSecret)
    .update(rawBody)
    .digest("hex")}`;

  try {
    assert.equal(verifyWhatsAppSignature({ headers: {}, rawBody }), false);
    assert.equal(
      verifyWhatsAppSignature({
        headers: { "x-hub-signature-256": `${valid.slice(0, -1)}0` },
        rawBody
      }),
      false
    );
    assert.equal(
      verifyWhatsAppSignature({
        headers: { "x-hub-signature-256": valid },
        rawBody
      }),
      true
    );
  } finally {
    config.whatsappAppSecret = previousSecret;
    config.whatsappRequireSignature = previousRequired;
  }
});

test("session capability tokens are opaque and bound to their stored hash", () => {
  const token = makeOpaqueToken();
  const other = makeOpaqueToken();
  assert.ok(token.length >= 40);
  assert.equal(verifySessionToken({ tokenHash: hashToken(token) }, token), true);
  assert.equal(verifySessionToken({ tokenHash: hashToken(token) }, other), false);
  assert.equal(safeEqual("same", "same"), true);
  assert.equal(safeEqual("same", "different"), false);
});

test("web chat ignores attacker-created session IDs and requires its capability token", async () => {
  const temporaryData = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-security-"));
  const previousDataDir = config.dataDir;
  config.dataDir = temporaryData;
  delete require.cache[require.resolve("../src/server")];
  const { app } = require("../src/server");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const rejected = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "attacker-selected",
        visitorId: "attacker",
        message: "hello"
      })
    });
    assert.equal(rejected.status, 401);

    const created = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId: "visitor", message: "hello" })
    });
    assert.equal(created.status, 200);
    const body = await created.json();
    assert.match(body.sessionId, /^web_[0-9a-f-]{36}$/);
    assert.ok(body.sessionToken);

    const deniedRead = await fetch(`${base}/api/chat/${body.sessionId}/messages`);
    assert.ok([403, 503].includes(deniedRead.status));

    const deniedWrite = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: body.sessionId, message: "intrusion" })
    });
    assert.equal(deniedWrite.status, 401);

    const continued = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kethura-session-token": body.sessionToken
      },
      body: JSON.stringify({ sessionId: body.sessionId, message: "continue" })
    });
    assert.equal(continued.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    config.dataDir = previousDataDir;
    fs.rmSync(temporaryData, { recursive: true, force: true });
  }
});
