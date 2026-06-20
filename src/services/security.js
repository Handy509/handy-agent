const { config } = require("../config");

const SENSITIVE_KEYS = [
  "authorization",
  "token",
  "secret",
  "password",
  "api_key",
  "apikey",
  "access_token",
  "pan",
  "cvv",
  "card_number",
  "cardnumber",
  "secure_url",
  "secureurl",
  "secure_widget_url",
  "securewidgeturl"
];

function redactValue(value) {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive))) {
        return [key, "[redacted]"];
      }
      return [key, redactValue(item)];
    })
  );
}

function isAdminRequest(req) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const headerToken = String(req.headers["x-kethura-admin-token"] || "");
  const token = bearer || headerToken;
  return Boolean(config.adminToken && token && token === config.adminToken);
}

function requireAdmin(req, res, next) {
  if (!config.adminToken) {
    return res.status(503).json({
      ok: false,
      error: "Admin automation controls are not configured"
    });
  }

  if (!isAdminRequest(req)) {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }

  return next();
}

module.exports = { redactValue, isAdminRequest, requireAdmin };
