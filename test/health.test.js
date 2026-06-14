const assert = require("node:assert/strict");
const test = require("node:test");
const { app } = require("../src/server");

test("health endpoint responds without starting background automation", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "handypay-ai-agent");
});
