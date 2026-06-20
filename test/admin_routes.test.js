const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-admin-"));
process.env.KETHURA_ADMIN_TOKEN = "test-admin-token";

const { app } = require("../src/server");

test("admin Kethura endpoints require admin token and expose dashboard data", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const denied = await fetch(`${base}/api/admin/kethura/tasks`);
  assert.equal(denied.status, 403);

  const allowed = await fetch(`${base}/api/admin/kethura/tasks`, {
    headers: { "X-Kethura-Admin-Token": "test-admin-token" }
  });
  const body = await allowed.json();

  assert.equal(allowed.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.dashboard.counts);
});

test("admin can create memory and health report hides secrets", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const headers = {
    "content-type": "application/json",
    "X-Kethura-Admin-Token": "test-admin-token"
  };

  const created = await fetch(`${base}/api/admin/kethura/memory`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      category: "Promotions",
      title: "Reviewed promo rule",
      body: "Promotions must be verified before publishing."
    })
  });
  assert.equal(created.status, 201);

  const health = await fetch(`${base}/api/admin/kethura/health`, { headers });
  const body = await health.json();

  assert.equal(health.status, 200);
  assert.equal(body.health.server.ok, true);
  assert.equal(body.health.socialConnectors.x.autoPostEnabled, false);
});
