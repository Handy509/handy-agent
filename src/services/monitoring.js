const fs = require("fs/promises");
const os = require("os");
const { config } = require("../config");
const { dashboard } = require("./tasks");
const { getEmailSupportStatus } = require("./emailSupport");
const { configured: operationsConfigured } = require("./operationsApi");

async function diskStatus() {
  try {
    const stat = await fs.statfs(config.dataDir);
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bavail) * Number(stat.bsize);
    return {
      ok: true,
      total,
      free,
      usedPercent: total > 0 ? Math.round(((total - free) / total) * 100) : null
    };
  } catch (error) {
    return { ok: false, error: error.code || error.message };
  }
}

async function checkHandyPayApi() {
  if (!config.handypayApiBaseUrl) return { ok: false, configured: false };
  try {
    const response = await fetch(`${config.handypayApiBaseUrl.replace(/\/$/, "")}/api/v1/app-config`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    return { ok: response.ok, configured: true, status: response.status };
  } catch (error) {
    return { ok: false, configured: true, error: error.code || error.name };
  }
}

async function healthReport() {
  const taskDashboard = await dashboard();
  const disk = await diskStatus();
  const handypayApi = await checkHandyPayApi();
  const ramFree = os.freemem();
  const ramTotal = os.totalmem();

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    server: {
      ok: true,
      nodeEnv: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      platform: os.platform()
    },
    disk,
    ram: {
      ok: ramFree > 512 * 1024 * 1024,
      free: ramFree,
      total: ramTotal,
      usedPercent: Math.round(((ramTotal - ramFree) / ramTotal) * 100)
    },
    queue: {
      ok: true,
      pending: taskDashboard.counts.pending || 0,
      failed: taskDashboard.counts.failed || 0,
      paused: taskDashboard.counts.paused || 0
    },
    cron: {
      ok: true,
      growthAgentEnabled: config.growthAgentEnabled,
      socialDailyPostEnabled: config.socialDailyPostEnabled
    },
    emailService: getEmailSupportStatus(),
    socialConnectors: {
      x: {
        configured: Boolean(config.xApiKey && config.xApiSecret && config.xAccessToken && config.xAccessTokenSecret),
        autoPostEnabled: config.socialAutoPostEnabled,
        draftMode: config.socialDraftMode
      }
    },
    handypayApi,
    operationsApi: {
      configured: operationsConfigured()
    }
  };
}

module.exports = { healthReport };
