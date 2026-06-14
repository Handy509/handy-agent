const { config } = require("../config");

async function verifyCustomer({ phone, email }) {
  if (!config.handypayApiBaseUrl || !config.handypayApiToken) {
    return { configured: false };
  }

  const baseUrl = config.handypayApiBaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/ai-agent/customer/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-HandyPay-Agent-Token": config.handypayApiToken
    },
    body: JSON.stringify({ phone, email })
  });

  const body = await response.json().catch(() => ({}));

  return {
    configured: true,
    ok: response.ok,
    status: response.status,
    ...body
  };
}

async function chargeVipSupport({ phone }) {
  if (!config.handypayApiBaseUrl || !config.handypayApiToken) {
    return { configured: false };
  }

  const baseUrl = config.handypayApiBaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/ai-agent/vip/charge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-HandyPay-Agent-Token": config.handypayApiToken
    },
    body: JSON.stringify({ phone })
  });

  const body = await response.json().catch(() => ({}));

  return {
    configured: true,
    ok: response.ok,
    status: response.status,
    ...body
  };
}

module.exports = { chargeVipSupport, verifyCustomer };
