const test = require("node:test");
const assert = require("node:assert/strict");
const {
  acceptInternalEvent,
  processEvent,
  signatureFor,
  templateForEvent,
  templateStatus
} = require("../src/services/internalEvents");

test("HMAC signature is deterministic and payload-sensitive", () => {
  const a = signatureFor("100", '{"ok":true}', "secret");
  const b = signatureFor("100", '{"ok":true}', "secret");
  const c = signatureFor("100", '{"ok":false}', "secret");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("WhatsApp success marks event sent", async () => {
  const event = {
    event_id: "success",
    type: "xbet_notification_test",
    admin_whatsapp: "447830669294",
    attempts: 0
  };
  await processEvent(event, async () => ({ ok: true, messageId: "wamid.1" }));
  assert.equal(event.status, "sent");
  assert.equal(event.message_id, "wamid.1");
});

test("provider not configured marks event queued with safe error", async () => {
  const event = {
    event_id: "not-configured",
    type: "xbet_notification_test",
    admin_whatsapp: "447830669294",
    attempts: 0
  };
  await processEvent(event, async () => ({
    ok: false,
    error: "provider_not_configured"
  }));
  assert.equal(event.status, "queued");
  assert.equal(event.last_error, "provider_not_configured");
});

test("failed event reaches failed state after retry limit", async () => {
  const event = {
    event_id: "retry-failed",
    type: "xbet_notification_test",
    admin_whatsapp: "447830669294",
    attempts: 4
  };
  await processEvent(event, async () => ({
    ok: false,
    error: "delivery_failed"
  }));
  assert.equal(event.status, "failed");
  assert.equal(event.last_error, "delivery_failed");
});

test("template status exposes configured flags without secrets", () => {
  const status = templateStatus();
  assert.equal(typeof status.test_template_configured, "boolean");
  assert.equal(typeof status.request_template_configured, "boolean");
  assert.equal(typeof status.fallback_template_used, "boolean");
  assert.equal("access_token" in status, false);
});

test("real request template maps only required customer fields", () => {
  const template = templateForEvent({
    type: "xbet_recharge_requested",
    user_name: "Jean Test",
    user_phone: "+50900000000",
    amount: "5.00",
    currency: "USD",
    xbet_id: "TEST-100"
  });
  const values = template.components[0].parameters.map((item) => item.text);
  assert.deepEqual(values, [
    "Jean Test",
    "+50900000000",
    "5.00 USD",
    "TEST-100"
  ]);
  assert.equal(template.fallbackUsed, false);
});

test("NEW Visa recharge event sends a dedicated admin message", async () => {
  let message = "";
  const event = {
    event_id: "new-visa-test",
    type: "new_visa_recharge_requested",
    admin_whatsapp: "447830669294",
    user_name: "Jean Test",
    user_email: "jean@example.com",
    card_last_four: "4242",
    amount: "25.00",
    fee_amount: "1.00",
    total_to_pay: "26.00",
    currency: "USD",
    admin_url: "https://handypayhaiti.com/Handy13/card-services/new-usd-visa/recharge-requests"
  };

  await processEvent(event, async (_recipient, text) => {
    message = text;
    return { ok: true, messageId: "wamid.new-visa" };
  });

  assert.equal(event.status, "sent");
  assert.match(message, /NEW USD Visa/);
  assert.match(message, /Jean Test/);
  assert.match(message, /25.00 USD/);
  assert.match(message, /recharge-requests/);
});

test("fallback template is limited to test notifications", () => {
  const testTemplate = templateForEvent({
    type: "xbet_notification_test"
  });
  const requestTemplate = templateForEvent({
    type: "xbet_recharge_requested",
    amount: "5.00",
    xbet_id: "TEST-101"
  });
  assert.equal(testTemplate.fallbackUsed, true);
  assert.equal(requestTemplate.fallbackUsed, false);
});

test("WhatsApp failure stays queued for retry", async () => {
  const event = {
    event_id: "failure",
    type: "xbet_notification_test",
    admin_whatsapp: "447830669294",
    attempts: 0
  };
  await processEvent(event, async () => ({ ok: false, error: "temporary" }));
  assert.equal(event.status, "queued");
  assert.equal(event.last_error, "temporary");
  assert.ok(event.next_attempt_at);
});

test("duplicate event is not sent twice", async () => {
  let sends = 0;
  const payload = {
    event_id: `duplicate-${Date.now()}`,
    type: "xbet_notification_test",
    admin_whatsapp: "447830669294"
  };
  const send = async () => {
    sends += 1;
    return { ok: true };
  };
  await acceptInternalEvent(payload, { send });
  await acceptInternalEvent(payload, { send });
  assert.equal(sends, 1);
});
