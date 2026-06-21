const pino = require("pino");
const { config } = require("./config");

const REDACT_PATHS = [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.set-cookie",
      "req.headers.x-hub-signature",
      "req.headers.x-hub-signature-256",
      "req.headers.x-signature",
      "req.headers.x-whatsapp-signature",
      "whatsappAccessToken",
      "openaiApiKey",
      "anthropicApiKey",
      "telegramBotToken",
      "handypayApiToken",
      "adminToken",
      "xApiKey",
      "xApiSecret",
      "xAccessToken",
      "xAccessTokenSecret",
      "*.authorization",
      "*.token",
      "*.secret",
      "*.password",
      "*.apiKey",
      "*.accessToken",
      "req.headers.x-kethura-admin-token",
      "*.x-hub-signature",
      "*.x-hub-signature-256",
      "*.x-signature",
      "*.x-whatsapp-signature",
      "*.cookie",
      "*.set-cookie"
];

function loggerOptions() {
  return {
    level: config.logLevel,
    redact: {
      paths: REDACT_PATHS,
      censor: "[redacted]"
    }
  };
}

const logger = pino(loggerOptions());

function createLogger(destination) {
  return pino(loggerOptions(), destination);
}

module.exports = { REDACT_PATHS, createLogger, logger };
