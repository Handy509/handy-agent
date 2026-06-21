const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-connectors-"));
process.env.KETHURA_ADMIN_TOKEN = "connector-test-token";
process.env.SOCIAL_AUTO_POST_ENABLED = "false";
process.env.SOCIAL_DRAFT_MODE = "true";
process.env.OPERATIONAL_CONNECTOR_TIMEOUT_MS = "500";
process.env.OPERATIONAL_CONNECTOR_RETRY_LIMIT = "0";
process.env.OPERATIONAL_SNAPSHOT_RETENTION_DAYS = "1";
process.env.OPERATIONAL_CAMPAIGN_SUMMARY_PATH = "/api/admin/kethura/campaign-summary";
process.env.HANDYPAY_API_BASE_URL = "http://127.0.0.1:9";
process.env.HANDYPAY_API_TOKEN = "campaign-token";

test("connectors stay disabled without credentials", async () => {
  const { getConnectorStatus, refreshOperationalData } = require("../src/services/operationalConnectors");

  const status = await getConnectorStatus();
  assert.ok(status.some((connector) => connector.name === "handypay_backend" && connector.configured === false));
  assert.ok(status.some((connector) => connector.name === "card_providers" && connector.configured === false));
  assert.ok(status.some((connector) => connector.name === "social" && connector.configured === false));
  assert.ok(status.every((connector) => connector.readOnly === true));

  const result = await refreshOperationalData();
  assert.equal(result.summaries.length, 4);
  assert.ok(result.summaries.some((summary) => summary.source === "handypay_backend" && summary.configured === false));
});

test("connector timeout and fetch errors produce safe summaries only", async () => {
  const { runConnector } = require("../src/services/operationalConnectors");
  const summary = await runConnector("campaigns");

  assert.equal(summary.source, "campaigns");
  assert.equal(summary.severity, "warning");
  assert.match(summary.safeSummary, /connector failed/i);
  assert.doesNotMatch(JSON.stringify(summary), /campaign-token|recipient|@/i);
});

test("campaign connector uses HandyPay base URL token and path aggregates", () => {
  const { aggregateCampaigns } = require("../src/services/operationalConnectors");
  const { redactValue } = require("../src/services/security");
  const summary = aggregateCampaigns({
    push_pending: 2,
    push_sent: 3,
    push_failed: 1,
    email_pending: 4,
    email_sent: 5,
    email_failed: 6,
    recipient_email: "client@example.com",
    message_body: "private body"
  });

  assert.equal(summary.counts.pending, 6);
  assert.equal(summary.counts.sent, 8);
  assert.equal(summary.counts.failed, 7);
  assert.equal(summary.counts.emailPending, 4);
  assert.doesNotMatch(JSON.stringify(summary), /client@example.com|private body/);
  assert.equal(typeof redactValue({ emailPending: 4 }).emailPending, "number");
});

test("daily brief combines connector aggregates and stores sanitized snapshots only", async () => {
  const { dailyBrief } = require("../src/services/dailyBrief");
  const { writeJson } = require("../src/services/storage");

  await writeJson("kethura-operational-snapshots.json", [
    {
      connector: "campaigns",
      timestamp: new Date().toISOString(),
      summary: {
        source: "campaigns",
        timestamp: new Date().toISOString(),
        severity: "warning",
        safeSummary: "Campaign aggregates: 20 sent, 2 failed, 5 pending.",
        recommendedNextAction: "Review campaign failures grouped by safe error code.",
        counts: { sent: 20, failed: 2, pending: 5 },
        errorCodes: { SMTP_TIMEOUT: 2 },
        configured: true
      },
      ignoredRawPayloadShouldNotExist: "[redacted]"
    }
  ]);

  const brief = await dailyBrief();
  assert.ok(brief.campaignSummary.some((summary) => summary.counts.failed === 2));
  assert.ok(brief.recommendedActions.some((action) => action.source === "campaigns"));

  const snapshotPath = path.join(process.env.DATA_DIR, "kethura-operational-snapshots.json");
  const snapshotText = fs.readFileSync(snapshotPath, "utf8");
  assert.doesNotMatch(snapshotText, /client@example.com|Private campaign text|campaign-token/);
  assert.match(snapshotText, /SMTP_TIMEOUT/);
});

test("sensitive fields are redacted across snake_case and camelCase variants", () => {
  const { redactValue } = require("../src/services/security");
  const redacted = redactValue({
    card_number: "4111111111111111",
    cardNumber: "4111111111111111",
    cvv: "123",
    expiry: "12/30",
    secure_widget_url: "https://secure.example/card",
    secureWidgetUrl: "https://secure.example/card",
    authorization: "Bearer secret",
    bearerToken: "secret",
    api_key: "secret",
    apiKey: "secret",
    email: "client@example.com",
    phone: "+50912345678",
    address: "Private address",
    kycDocument: "passport"
  });

  for (const value of Object.values(redacted)) {
    assert.equal(value, "[redacted]");
  }
});

test("admin connector commands require token and can clear snapshots", async (t) => {
  const { app } = require("../src/server");
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const payload = { command: "clear_operational_snapshots" };

  const denied = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Kethura-Admin-Token": "connector-test-token"
    },
    body: JSON.stringify(payload)
  });
  const body = await allowed.json();

  assert.equal(allowed.status, 200);
  assert.equal(body.result.cleared, true);

  const status = await fetch(`${base}/api/admin/kethura/connectors`, {
    headers: { "X-Kethura-Admin-Token": "connector-test-token" }
  });
  assert.equal(status.status, 200);
});
