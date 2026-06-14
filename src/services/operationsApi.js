const { config } = require("../config");
const { logger } = require("../logger");

function configured() {
  return Boolean(config.handypayApiBaseUrl && config.handypayApiToken);
}

async function submit(path, payload) {
  if (!configured()) {
    return { configured: false, ok: false, message: "HandyPay operations API is not configured" };
  }

  const response = await fetch(
    `${config.handypayApiBaseUrl.replace(/\/$/, "")}/api/${path.replace(/^\//, "")}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "X-HandyPay-Agent-Token": config.handypayApiToken
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    }
  );

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_error) {
    body = { message: "Invalid JSON response" };
  }

  if (!response.ok) {
    logger.warn(
      { path, status: response.status, message: body.message || "Request failed" },
      "HandyPay operations API request failed"
    );
  }

  return { configured: true, ok: response.ok, status: response.status, ...body };
}

function createAction(payload) {
  return submit("ai-agent/operations/actions", payload);
}

function createSocialPost(payload) {
  return submit("ai-agent/operations/social-posts", payload);
}

function createSocialComment(payload) {
  return submit("ai-agent/operations/social-comments", payload);
}

function createOpportunity(payload) {
  return submit("ai-agent/operations/opportunities", payload);
}

function createReport(payload) {
  return submit("ai-agent/operations/reports", payload);
}

module.exports = {
  configured,
  createAction,
  createSocialPost,
  createSocialComment,
  createOpportunity,
  createReport
};
