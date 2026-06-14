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
      "handypayApiToken"
    ],
    censor: "[redacted]"
  }
});

module.exports = { logger };
