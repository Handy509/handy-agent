const pino = require("pino");
const { config } = require("./config");

const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
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
      "req.headers.x-kethura-admin-token"
    ],
    censor: "[redacted]"
  }
});

module.exports = { logger };
