const { config } = require("../config");
const { logger } = require("../logger");
const { dailyBrief } = require("./dailyBrief");
const { addMemoryEntry } = require("./memory");
const { refreshOperationalData } = require("./operationalConnectors");
const { createDailyPostDraft } = require("./socialAutomation");
const { automationState, createTask } = require("./tasks");
const { sendTelegramAlert } = require("./telegram");

let started = false;
let timers = [];
let lastDailyBriefDate = "";
let lastSocialDraftDate = "";

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function severityPriority(severity) {
  if (severity === "critical") return 1;
  if (severity === "warning") return 2;
  return 4;
}

function criticalOperationalItems(summaries = []) {
  return summaries.filter((summary) => summary.severity === "critical");
}

async function createAlertTasks(summaries = []) {
  const created = [];
  for (const summary of criticalOperationalItems(summaries)) {
    created.push(await createTask({
      type: "operational_alert",
      status: "pending",
      source: summary.source || "operational_connector",
      severity: summary.severity,
      priority: severityPriority(summary.severity),
      title: `Critical ${summary.source || "operational"} alert`,
      recommendedAction: summary.recommendedNextAction || "Review the source system manually.",
      dedupeKey: `critical:${summary.source}:${summary.safeSummary}`,
      payload: {
        safeSummary: summary.safeSummary,
        counts: summary.counts || {},
        errorCodes: summary.errorCodes || {}
      }
    }));
  }
  return created;
}

async function maybeAlertAdmin(tasks = []) {
  if (!tasks.length || !config.telegramBotToken || !config.telegramAdminChatId) return { sent: false };
  await sendTelegramAlert([
    "Kethura critical operational alert",
    ...tasks.slice(0, 5).map((task) => `- ${task.title}: ${task.recommendedAction}`)
  ].join("\n"));
  return { sent: true };
}

async function maybeUpdateMemoryFromOperations(summaries = []) {
  const incidents = summaries.filter((summary) => ["critical", "warning"].includes(summary.severity));
  if (!incidents.length) return [];
  const added = [];
  for (const summary of incidents.slice(0, 5)) {
    added.push(await addMemoryEntry({
      category: "Operational alerts",
      title: `${summary.source} ${summary.severity} aggregate`,
      body: `${summary.safeSummary} Recommended action: ${summary.recommendedNextAction}`,
      tags: ["automatic", "aggregate", summary.severity],
      source: "kethura_autonomous_scheduler"
    }));
  }
  return added;
}

async function runAutonomousCycle(source = "scheduler") {
  const automation = await automationState();
  if (automation.paused) {
    return {
      source,
      skipped: true,
      reason: "automation_paused",
      ranAt: new Date().toISOString()
    };
  }

  const operational = await refreshOperationalData();
  const alertTasks = await createAlertTasks(operational.summaries || []);
  await maybeAlertAdmin(alertTasks);
  const memoryItems = await maybeUpdateMemoryFromOperations(operational.summaries || []);

  return {
    source,
    skipped: false,
    ranAt: new Date().toISOString(),
    refreshedAt: operational.refreshedAt,
    summaries: operational.summaries,
    alertTasks: alertTasks.map((task) => ({ id: task.id, title: task.title, severity: task.severity })),
    memoryItems: memoryItems.map((item) => ({ id: item.id, title: item.title }))
  };
}

async function runDailyBriefJob(date = new Date()) {
  const key = todayKey(date);
  if (lastDailyBriefDate === key) return { skipped: true, reason: "already_generated_today" };
  lastDailyBriefDate = key;
  const brief = await dailyBrief();
  await createTask({
    type: "daily_brief_review",
    status: "pending",
    source: "kethura_autonomous_scheduler",
    severity: brief.recommendedActions.some((action) => action.priority === 1) ? "warning" : "info",
    priority: 3,
    title: "Review Kethura Daily Brief",
    recommendedAction: "Review the generated Daily Brief and approve any safe follow-up work manually.",
    dedupeKey: `daily_brief:${key}`,
    payload: {
      generatedAt: brief.generatedAt,
      summary: brief.summary,
      recommendedActions: brief.recommendedActions
    }
  });
  return { skipped: false, generatedAt: brief.generatedAt };
}

async function runSocialDraftJob(date = new Date()) {
  if (!config.socialDailyPostEnabled) return { skipped: true, reason: "social_daily_post_disabled" };
  const key = todayKey(date);
  if (lastSocialDraftDate === key) return { skipped: true, reason: "already_drafted_today" };
  lastSocialDraftDate = key;
  const draft = await createDailyPostDraft(date);
  return {
    skipped: false,
    taskId: draft.task.id,
    public_action_executed: false,
    mode: draft.payload.mode
  };
}

async function runSupportSuggestionJob() {
  return {
    skipped: false,
    public_action_executed: false,
    note: "Support suggestions are generated only through comment-review tasks or private support workflows."
  };
}

function scheduleInterval(fn, minutes, label) {
  const ms = Math.max(1, minutes) * 60 * 1000;
  const timer = setInterval(() => {
    fn().catch((error) => logger.warn({ error, label }, "Kethura autonomous job failed"));
  }, ms);
  timers.push(timer);
  return timer;
}

function startAutonomousScheduler() {
  if (started || !config.autonomousSchedulerEnabled) return { started: false };
  started = true;
  scheduleInterval(() => runAutonomousCycle("refresh_interval"), config.autonomousRefreshMinutes, "refresh_operational_data");
  scheduleInterval(() => runAutonomousCycle("alert_scan"), config.autonomousAlertMinutes, "urgent_alert_scan");
  scheduleInterval(async () => {
    const hour = new Date().getUTCHours();
    if (hour === config.autonomousDailyBriefHour) await runDailyBriefJob();
    if (hour === config.autonomousSocialDraftHour) await runSocialDraftJob();
  }, 60, "daily_jobs");
  logger.info(
    {
      refreshMinutes: config.autonomousRefreshMinutes,
      alertMinutes: config.autonomousAlertMinutes,
      socialAutoPostEnabled: config.socialAutoPostEnabled,
      socialDraftMode: config.socialDraftMode
    },
    "Kethura autonomous scheduler started"
  );
  return { started: true };
}

function stopAutonomousScheduler() {
  for (const timer of timers) clearInterval(timer);
  timers = [];
  started = false;
}

module.exports = {
  createAlertTasks,
  runAutonomousCycle,
  runDailyBriefJob,
  runSocialDraftJob,
  runSupportSuggestionJob,
  startAutonomousScheduler,
  stopAutonomousScheduler
};
