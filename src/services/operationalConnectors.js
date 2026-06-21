const { config } = require("../config");
const { readJson, writeJson } = require("./storage");
const { redactValue } = require("./security");

const SNAPSHOTS_FILE = "kethura-operational-snapshots.json";
const CONNECTOR_STATE_FILE = "kethura-connector-state.json";

const CONNECTOR_NAMES = [
  "handypay_backend",
  "campaigns",
  "card_providers",
  "social"
];

function nowIso() {
  return new Date().toISOString();
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function safeText(value, max = 220) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .slice(0, max);
}

function severityFromCounts({ failed = 0, critical = 0, warning = 0 } = {}) {
  if (critical > 0 || failed >= 10) return "critical";
  if (failed > 0 || warning > 0) return "warning";
  return "info";
}

function normalizeAlert(alert = {}, source = "connector") {
  return {
    source,
    timestamp: alert.timestamp || nowIso(),
    severity: ["critical", "warning", "info"].includes(alert.severity) ? alert.severity : "info",
    safeSummary: safeText(alert.safeSummary || alert.summary || alert.message || "Operational alert"),
    recommendedNextAction: safeText(alert.recommendedNextAction || alert.action || "Review in the source system.")
  };
}

function sanitizeSummary(input = {}, source = "connector") {
  const data = redactValue(input || {});
  return {
    source,
    timestamp: data.timestamp || nowIso(),
    severity: ["critical", "warning", "info"].includes(data.severity) ? data.severity : "info",
    safeSummary: safeText(data.safeSummary || data.summary || `${source} summary`),
    recommendedNextAction: safeText(data.recommendedNextAction || "Review aggregate dashboard if needed."),
    counts: redactValue(data.counts || {}),
    errorCodes: redactValue(data.errorCodes || data.recentFailuresByCode || {}),
    status: safeText(data.status || ""),
    configured: Boolean(data.configured ?? true)
  };
}

function aggregateHandyPay(body = {}) {
  const counts = body.counts || body;
  const failedJobs = safeNumber(counts.failedQueueJobs ?? counts.failed_jobs);
  const failedPayments = safeNumber(counts.failedPayments ?? counts.failed_payment_count);
  const failedDeposits = safeNumber(counts.failedDeposits ?? counts.failed_deposit_count);
  const failedWithdrawals = safeNumber(counts.failedWithdrawals ?? counts.failed_withdrawal_count);
  const failedCardRequests = safeNumber(counts.failedCardRequests ?? counts.failed_card_request_count);
  const supportRisks = safeNumber(counts.supportRisks ?? counts.support_risk_count);
  const failedTotal = failedJobs + failedPayments + failedDeposits + failedWithdrawals + failedCardRequests;

  return sanitizeSummary(
    {
      severity: severityFromCounts({ failed: failedTotal, warning: supportRisks }),
      safeSummary: `Backend aggregates: ${failedJobs} failed jobs, ${failedTotal} failed financial/card workflows, ${supportRisks} support-risk item(s).`,
      recommendedNextAction: failedTotal || supportRisks ? "Review backend admin dashboards and support queue." : "No backend aggregate action needed.",
      counts: {
        failedQueueJobs: failedJobs,
        failedPayments,
        failedDeposits,
        failedWithdrawals,
        failedCardRequests,
        supportRisks
      },
      errorCodes: body.errorCodes || {}
    },
    "handypay_backend"
  );
}

function aggregateCampaigns(body = {}) {
  const counts = body.counts || body;
  const sent = safeNumber(counts.sent ?? counts.push_sent) + safeNumber(counts.email_sent);
  const failed = safeNumber(counts.failed ?? counts.push_failed) + safeNumber(counts.email_failed);
  const pending = safeNumber(counts.pending ?? counts.push_pending) + safeNumber(counts.email_pending);
  return sanitizeSummary(
    {
      severity: severityFromCounts({ failed }),
      safeSummary: `Campaign aggregates: ${sent} sent, ${failed} failed, ${pending} pending.`,
      recommendedNextAction: failed ? "Review campaign failures grouped by safe error code." : "No campaign action needed.",
      counts: {
        sent,
        failed,
        pending,
        pushPending: safeNumber(counts.push_pending),
        pushSent: safeNumber(counts.push_sent),
        pushFailed: safeNumber(counts.push_failed),
        emailPending: safeNumber(counts.email_pending),
        emailSent: safeNumber(counts.email_sent),
        emailFailed: safeNumber(counts.email_failed)
      },
      errorCodes: body.errorCodes || body.recentFailuresByCode || body.recent_safe_error_codes || {}
    },
    "campaigns"
  );
}

function aggregateCardProviders(body = {}) {
  const counts = body.counts || body;
  const errors = safeNumber(counts.aggregateErrors ?? counts.errors);
  const unavailable = safeNumber(counts.unavailableProviders ?? counts.unavailable);
  return sanitizeSummary(
    {
      severity: severityFromCounts({ failed: errors, critical: unavailable }),
      safeSummary: `Card/provider aggregates: ${unavailable} unavailable provider(s), ${errors} aggregate error(s).`,
      recommendedNextAction: unavailable || errors ? "Review provider status dashboards and integration alerts." : "No card/provider action needed.",
      counts: {
        unavailableProviders: unavailable,
        aggregateErrors: errors,
        integrationAlerts: safeNumber(counts.integrationAlerts ?? counts.alerts)
      },
      errorCodes: body.errorCodes || {}
    },
    "card_providers"
  );
}

function aggregateSocial(body = {}) {
  const counts = body.counts || body;
  const review = safeNumber(counts.reviewNeeded ?? counts.review_needed);
  return sanitizeSummary(
    {
      severity: review ? "warning" : "info",
      safeSummary: `Social review aggregates: ${safeNumber(counts.draftQueue)} draft(s), ${review} review-needed item(s).`,
      recommendedNextAction: review ? "Review social drafts/comments manually before any public action." : "No social action needed.",
      counts: {
        draftQueue: safeNumber(counts.draftQueue ?? counts.drafts),
        reviewNeeded: review,
        safeEngagements: safeNumber(counts.safeEngagements ?? counts.engagements)
      },
      errorCodes: body.errorCodes || {}
    },
    "social"
  );
}

async function connectorState() {
  const state = await readJson(CONNECTOR_STATE_FILE, {});
  for (const name of CONNECTOR_NAMES) {
    state[name] = {
      paused: false,
      failures: 0,
      circuitOpenUntil: null,
      lastSuccessfulSync: null,
      updatedAt: null,
      ...(state[name] || {})
    };
  }
  return state;
}

async function writeConnectorState(state) {
  await writeJson(CONNECTOR_STATE_FILE, state);
}

async function pauseConnector(name, paused, reason = "") {
  if (!CONNECTOR_NAMES.includes(name)) {
    const error = new Error("Unsupported connector");
    error.statusCode = 422;
    throw error;
  }
  const state = await connectorState();
  state[name] = {
    ...state[name],
    paused: Boolean(paused),
    updatedAt: nowIso(),
    reason: safeText(reason, 500)
  };
  await writeConnectorState(state);
  return connectorPublicStatus(name, state[name]);
}

function connectorPublicStatus(name, state) {
  return {
    name,
    paused: Boolean(state.paused),
    failures: safeNumber(state.failures),
    circuitOpenUntil: state.circuitOpenUntil || null,
    lastSuccessfulSync: state.lastSuccessfulSync || null,
    updatedAt: state.updatedAt || null,
    reason: state.reason || ""
  };
}

async function readSnapshots() {
  return readJson(SNAPSHOTS_FILE, []);
}

async function writeSnapshots(snapshots) {
  await writeJson(SNAPSHOTS_FILE, snapshots);
}

async function pruneSnapshots(snapshots) {
  const retentionMs = Math.max(1, config.operationalSnapshotRetentionDays) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  return snapshots.filter((snapshot) => Date.parse(snapshot.timestamp || 0) >= cutoff).slice(-500);
}

async function saveSnapshot(snapshot) {
  const snapshots = await pruneSnapshots(await readSnapshots());
  const safe = redactValue(snapshot);
  snapshots.push(safe);
  await writeSnapshots(snapshots);
  return safe;
}

async function clearOperationalSnapshots() {
  await writeSnapshots([]);
  return { cleared: true, clearedAt: nowIso() };
}

function connectorDefinitions() {
  const base = config.handypayApiBaseUrl.replace(/\/$/, "");
  const withBase = (path) => {
    if (!base || !path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${base}/${String(path).replace(/^\//, "")}`;
  };

  return {
    handypay_backend: {
      name: "handypay_backend",
      configured: Boolean(base && config.handypayApiToken && config.operationalHandypaySummaryPath),
      url: withBase(config.operationalHandypaySummaryPath),
      token: config.handypayApiToken,
      aggregate: aggregateHandyPay,
      authHeader: "X-HandyPay-Agent-Token"
    },
    campaigns: {
      name: "campaigns",
      configured: Boolean(base && config.handypayApiToken && config.operationalCampaignSummaryPath),
      url: withBase(config.operationalCampaignSummaryPath),
      token: config.handypayApiToken,
      aggregate: aggregateCampaigns,
      authHeader: "X-HandyPay-Agent-Token"
    },
    card_providers: {
      name: "card_providers",
      configured: Boolean(base && config.handypayApiToken && config.operationalCardProviderSummaryPath),
      url: withBase(config.operationalCardProviderSummaryPath),
      token: config.handypayApiToken,
      aggregate: aggregateCardProviders,
      authHeader: "X-HandyPay-Agent-Token"
    },
    social: {
      name: "social",
      configured: Boolean(config.operationalSocialSummaryUrl && config.operationalSocialApiToken),
      url: config.operationalSocialSummaryUrl,
      token: config.operationalSocialApiToken,
      aggregate: aggregateSocial,
      authHeader: "Authorization"
    }
  };
}

function disabledSummary(name, reason = "Required connector configuration is absent.") {
  return {
    source: name,
    timestamp: nowIso(),
    severity: "info",
    safeSummary: `${name} connector disabled. ${reason}`,
    recommendedNextAction: "Configure read-only endpoint credentials to activate this connector.",
    counts: {},
    errorCodes: {},
    configured: false
  };
}

async function fetchJsonWithRetry(definition) {
  let lastError;
  const attempts = Math.max(0, config.operationalConnectorRetryLimit) + 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const headers = { accept: "application/json" };
      if (definition.authHeader === "Authorization") {
        headers.Authorization = `Bearer ${definition.token}`;
      } else {
        headers[definition.authHeader] = definition.token;
      }
      const response = await fetch(definition.url, {
        headers,
        signal: AbortSignal.timeout(config.operationalConnectorTimeoutMs)
      });
      const text = await response.text();
      let body = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch (_error) {
        body = {};
      }
      if (!response.ok) {
        const error = new Error(`HTTP_${response.status}`);
        error.statusCode = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, config.operationalConnectorBackoffMs));
      }
    }
  }
  throw lastError;
}

async function runConnector(name) {
  const definitions = connectorDefinitions();
  const definition = definitions[name];
  if (!definition) {
    const error = new Error("Unsupported connector");
    error.statusCode = 422;
    throw error;
  }

  const state = await connectorState();
  const current = state[name];
  if (!definition.configured) {
    return disabledSummary(name);
  }
  if (current.paused) {
    return disabledSummary(name, "Connector is paused by an admin.");
  }
  if (current.circuitOpenUntil && Date.parse(current.circuitOpenUntil) > Date.now()) {
    return disabledSummary(name, "Circuit breaker is cooling down after repeated failures.");
  }

  try {
    const body = await fetchJsonWithRetry(definition);
    const summary = definition.aggregate(body);
    state[name] = {
      ...current,
      failures: 0,
      circuitOpenUntil: null,
      lastSuccessfulSync: summary.timestamp,
      updatedAt: nowIso()
    };
    await writeConnectorState(state);
    await saveSnapshot({
      connector: name,
      timestamp: summary.timestamp,
      summary
    });
    return summary;
  } catch (error) {
    const failures = safeNumber(current.failures) + 1;
    const circuitOpenUntil =
      failures >= config.operationalCircuitBreakerFailures
        ? new Date(Date.now() + config.operationalCircuitBreakerCooldownMs).toISOString()
        : null;
    state[name] = {
      ...current,
      failures,
      circuitOpenUntil,
      updatedAt: nowIso()
    };
    await writeConnectorState(state);
    const safeError = {
      source: name,
      timestamp: nowIso(),
      severity: "warning",
      safeSummary: `${name} connector failed with ${safeText(error.code || error.name || error.message, 80)}.`,
      recommendedNextAction: "Review connector configuration and source service health.",
      counts: {},
      errorCodes: { connector_error: 1 },
      configured: true
    };
    await saveSnapshot({ connector: name, timestamp: safeError.timestamp, summary: safeError });
    return safeError;
  }
}

async function refreshOperationalData() {
  const summaries = [];
  for (const name of CONNECTOR_NAMES) {
    summaries.push(await runConnector(name));
  }
  return {
    refreshedAt: nowIso(),
    summaries
  };
}

async function getConnectorStatus() {
  const definitions = connectorDefinitions();
  const state = await connectorState();
  return CONNECTOR_NAMES.map((name) => ({
    ...connectorPublicStatus(name, state[name]),
    configured: Boolean(definitions[name].configured),
    readOnly: true
  }));
}

async function latestOperationalSnapshot() {
  const snapshots = await pruneSnapshots(await readSnapshots());
  if (!snapshots.length) {
    return refreshOperationalData();
  }
  const latestByConnector = new Map();
  for (const snapshot of snapshots) {
    latestByConnector.set(snapshot.connector, snapshot.summary);
  }
  const summaries = [];
  for (const name of CONNECTOR_NAMES) {
    summaries.push(latestByConnector.get(name) || disabledSummary(name));
  }
  return {
    refreshedAt: snapshots.at(-1)?.timestamp || nowIso(),
    summaries
  };
}

module.exports = {
  CONNECTOR_NAMES,
  aggregateCampaigns,
  aggregateCardProviders,
  aggregateHandyPay,
  aggregateSocial,
  clearOperationalSnapshots,
  getConnectorStatus,
  latestOperationalSnapshot,
  pauseConnector,
  refreshOperationalData,
  runConnector,
  sanitizeSummary
};
