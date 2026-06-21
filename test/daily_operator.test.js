const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-operator-"));
process.env.KETHURA_ADMIN_TOKEN = "operator-test-token";
process.env.SOCIAL_AUTO_POST_ENABLED = "false";
process.env.SOCIAL_DRAFT_MODE = "true";

const { app } = require("../src/server");
const { dailyBrief } = require("../src/services/dailyBrief");
const { redactValue } = require("../src/services/security");
const { createTask } = require("../src/services/tasks");
const { proposedReplyForComment } = require("../src/services/socialAutomation");

async function withServer(t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test("daily brief requires admin token and returns recommended actions", async (t) => {
  const base = await withServer(t);

  await createTask({
    id: "failed_email_check",
    type: "email_support",
    status: "failed",
    source: "email_support",
    priority: 1,
    title: "Email support check failed"
  });

  const denied = await fetch(`${base}/api/admin/kethura/daily-brief`);
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/api/admin/kethura/daily-brief`, {
    headers: { "X-Kethura-Admin-Token": "operator-test-token" }
  });
  const body = await allowed.json();

  assert.equal(allowed.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.brief.summary.socialAutoPostEnabled, false);
  assert.equal(body.brief.summary.socialDraftMode, true);
  assert.ok(body.brief.failedTasks.some((task) => task.id === "failed_email_check"));
  assert.ok(body.brief.recommendedActions.length >= 1);
  assert.ok(
    body.brief.recommendedActions.some((action) => action.safeExecution.includes("manual") || action.safeExecution.includes("draft"))
  );
});

test("operator command endpoint controls tasks and keeps social drafts review-only", async (t) => {
  const base = await withServer(t);
  const headers = {
    "content-type": "application/json",
    "X-Kethura-Admin-Token": "operator-test-token"
  };
  const task = await createTask({
    type: "operator_test",
    status: "pending",
    priority: 2,
    title: "Review operator command task"
  });

  const approved = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "approve_task", taskId: task.id })
  });
  const approvedBody = await approved.json();
  assert.equal(approved.status, 200);
  assert.equal(approvedBody.result.status, "approved");

  const paused = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "pause_automation", reason: "maintenance test" })
  });
  const pausedBody = await paused.json();
  assert.equal(paused.status, 200);
  assert.equal(pausedBody.result.paused, true);

  const draft = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "create_social_draft" })
  });
  const draftBody = await draft.json();
  assert.equal(draft.status, 200);
  assert.equal(draftBody.result.payload.mode, "draft_review");
  assert.equal(draftBody.result.payload.public_action_executed, false);

  const tasks = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "get_tasks" })
  });
  assert.equal(tasks.status, 200);

  const resolved = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "resolve_task", taskId: task.id })
  });
  const resolvedBody = await resolved.json();
  assert.equal(resolved.status, 200);
  assert.equal(resolvedBody.result.status, "resolved");

  const reopened = await fetch(`${base}/api/admin/kethura/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: "reopen_task", taskId: task.id })
  });
  const reopenedBody = await reopened.json();
  assert.equal(reopened.status, 200);
  assert.equal(reopenedBody.result.status, "pending");
});

test("sensitive support comments are redirected to private support", () => {
  const card = proposedReplyForComment({ text: "My card payment failed, check my balance and KYC" });
  assert.equal(card.sensitive, true);
  assert.match(card.reply, /support prive/i);
  assert.match(card.reply, /Nou pa verifye balans, kat, KYC, peman, oswa tranzaksyon/i);
});

test("daily brief engine recommends safe review actions without exposing secrets", async () => {
  await createTask({
    type: "social_comment_reply",
    status: "pending",
    source: "facebook",
    priority: 1,
    title: "Sensitive card complaint",
    payload: {
      authorization: "Bearer private-token",
      cvv: "123",
      message: "card issue"
    }
  });

  const brief = await dailyBrief();
  assert.equal(brief.summary.socialAutoPostEnabled, false);
  assert.equal(brief.summary.socialDraftMode, true);
  assert.ok(brief.customerSupportRisks.length >= 1);
  assert.ok(
    brief.recommendedActions.some((action) => action.type === "customer_communication" && action.safeExecution === "draft_private_support_reply_only")
  );

  const redacted = redactValue({
    token: "operator-test-token",
    apiKey: "secret-api-key",
    pan: "5323200422955604",
    cvv: "274",
    secureWidgetUrl: "https://provider.example/secure"
  });
  assert.equal(redacted.token, "[redacted]");
  assert.equal(redacted.apiKey, "[redacted]");
  assert.equal(redacted.pan, "[redacted]");
  assert.equal(redacted.cvv, "[redacted]");
  assert.equal(redacted.secureWidgetUrl, "[redacted]");
});

test("autonomous scheduler creates deduped critical alert tasks without unsafe actions", async () => {
  const { createAlertTasks, runSupportSuggestionJob } = require("../src/services/scheduler");
  const critical = {
    source: "card_providers",
    severity: "critical",
    safeSummary: "Card/provider aggregates: 1 unavailable provider(s), 12 aggregate error(s).",
    recommendedNextAction: "Review provider dashboard manually.",
    counts: { unavailableProviders: 1, aggregateErrors: 12 },
    errorCodes: { provider_down: 1 },
    cardNumber: "4111111111111111",
    cvv: "123"
  };

  const first = await createAlertTasks([critical]);
  const second = await createAlertTasks([critical]);
  const support = await runSupportSuggestionJob();

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].id, second[0].id);
  assert.equal(first[0].severity, "critical");
  assert.equal(first[0].status, "pending");
  assert.equal(support.public_action_executed, false);
  assert.doesNotMatch(JSON.stringify(second[0]), /4111111111111111|123/);
});
