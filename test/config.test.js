const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

test("sensitive integrations are disabled or empty by default", () => {
  const { config } = require("../src/config");

  assert.equal(config.whatsappVerifyToken, "");
  assert.equal(config.whatsappPhoneNumberId, "");
  assert.equal(config.whatsappAccessToken, "");
  assert.equal(config.growthAgentEnabled, false);
  assert.equal(config.emailSupportEnabled, false);
});

test("safe environment template documents required secrets", () => {
  const template = fs.readFileSync(path.resolve(__dirname, "../.env.example"), "utf8");

  for (const name of [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_ACCESS_TOKEN",
    "TELEGRAM_BOT_TOKEN",
    "HANDYPAY_API_TOKEN"
  ]) {
    assert.match(template, new RegExp(`^${name}=$`, "m"));
  }
});
