require("dotenv").config();

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3007),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:3007",
  dataDir: process.env.DATA_DIR || "./data",
  logLevel: process.env.LOG_LEVEL || "info",
  adminToken: process.env.KETHURA_ADMIN_TOKEN || "",

  aiProvider: (process.env.AI_PROVIDER || "openai").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",

  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v20.0",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "",

  emailSupportEnabled: process.env.EMAIL_SUPPORT_ENABLED === "true",
  emailSupportMode: process.env.EMAIL_SUPPORT_MODE || "draft",
  emailSupportAddress: process.env.EMAIL_SUPPORT_ADDRESS || "",
  emailImapHost: process.env.EMAIL_IMAP_HOST || "",
  emailImapPort: Number(process.env.EMAIL_IMAP_PORT || 993),
  emailSmtpHost: process.env.EMAIL_SMTP_HOST || "",
  emailSmtpPort: Number(process.env.EMAIL_SMTP_PORT || 465),
  emailUsername: process.env.EMAIL_USERNAME || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailPollSeconds: Number(process.env.EMAIL_POLL_SECONDS || 120),
  emailConnectionTimeoutMs: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 15000),
  emailGreetingTimeoutMs: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
  emailSocketTimeoutMs: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 30000),
  emailRetryLimit: Number(process.env.EMAIL_RETRY_LIMIT || 2),
  emailFailureBackoffSeconds: Number(process.env.EMAIL_FAILURE_BACKOFF_SECONDS || 600),
  emailFailureLogCooldownSeconds: Number(process.env.EMAIL_FAILURE_LOG_COOLDOWN_SECONDS || 1800),

  handypayApiBaseUrl: process.env.HANDYPAY_API_BASE_URL || "",
  handypayApiToken: process.env.HANDYPAY_API_TOKEN || "",
  operationalConnectorTimeoutMs: Number(process.env.OPERATIONAL_CONNECTOR_TIMEOUT_MS || 10000),
  operationalConnectorRetryLimit: Number(process.env.OPERATIONAL_CONNECTOR_RETRY_LIMIT || 1),
  operationalConnectorBackoffMs: Number(process.env.OPERATIONAL_CONNECTOR_BACKOFF_MS || 500),
  operationalCircuitBreakerFailures: Number(process.env.OPERATIONAL_CIRCUIT_BREAKER_FAILURES || 3),
  operationalCircuitBreakerCooldownMs: Number(process.env.OPERATIONAL_CIRCUIT_BREAKER_COOLDOWN_MS || 300000),
  operationalSnapshotRetentionDays: Number(process.env.OPERATIONAL_SNAPSHOT_RETENTION_DAYS || 14),
  operationalHandypaySummaryPath: process.env.OPERATIONAL_HANDYPAY_SUMMARY_PATH || "",
  operationalCampaignSummaryPath: process.env.OPERATIONAL_CAMPAIGN_SUMMARY_PATH || "",
  operationalCardProviderSummaryPath: process.env.OPERATIONAL_CARD_PROVIDER_SUMMARY_PATH || "",
  operationalSocialSummaryUrl: process.env.OPERATIONAL_SOCIAL_SUMMARY_URL || "",
  operationalSocialApiToken: process.env.OPERATIONAL_SOCIAL_API_TOKEN || "",
  autonomousSchedulerEnabled: process.env.KETHURA_AUTONOMOUS_SCHEDULER_ENABLED === "true",
  autonomousRefreshMinutes: Number(process.env.KETHURA_AUTONOMOUS_REFRESH_MINUTES || 15),
  autonomousAlertMinutes: Number(process.env.KETHURA_AUTONOMOUS_ALERT_MINUTES || 15),
  autonomousDailyBriefHour: Number(process.env.KETHURA_DAILY_BRIEF_HOUR || 9),
  autonomousSocialDraftHour: Number(process.env.KETHURA_SOCIAL_DRAFT_HOUR || 14),
  growthAgentEnabled: process.env.GROWTH_AGENT_ENABLED === "true",
  growthAgentRunHourUtc: Number(process.env.GROWTH_AGENT_RUN_HOUR_UTC || 10),
  growthAgentCheckMinutes: Number(process.env.GROWTH_AGENT_CHECK_MINUTES || 30),
  socialAutoPostEnabled: process.env.SOCIAL_AUTO_POST_ENABLED === "true",
  socialDraftMode: process.env.SOCIAL_DRAFT_MODE !== "false",
  socialDailyPostEnabled: process.env.SOCIAL_DAILY_POST_ENABLED === "true",
  socialDailyPostHourUtc: Number(process.env.SOCIAL_DAILY_POST_HOUR_UTC || 14),
  xApiKey: process.env.X_API_KEY || "",
  xApiSecret: process.env.X_API_SECRET || "",
  xAccessToken: process.env.X_ACCESS_TOKEN || "",
  xAccessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || "",

  freeMessageLimitPerDay: Number(process.env.FREE_MESSAGE_LIMIT_PER_DAY || 20),
  vipAccessPriceUsd: Number(process.env.VIP_ACCESS_PRICE_USD || 1),
  adminWhatsAppNumbers: (process.env.ADMIN_WHATSAPP_NUMBERS || "")
    .split(",")
    .map((item) => item.replace(/\D/g, ""))
    .filter(Boolean)
};

module.exports = { config };
