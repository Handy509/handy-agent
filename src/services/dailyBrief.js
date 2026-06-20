const { healthReport } = require("./monitoring");
const { loadMemory } = require("./memory");
const { dashboard, readTasks } = require("./tasks");

function latestMemoryChanges(memory, limit = 8) {
  return Object.entries(memory.categories || {})
    .flatMap(([category, entries]) =>
      (entries || []).map((entry) => ({
        id: entry.id,
        category,
        title: entry.title,
        source: entry.source,
        updatedAt: entry.updatedAt || entry.createdAt
      }))
    )
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, limit);
}

function taskSummary(tasks, predicate, limit = 10) {
  return tasks
    .filter(predicate)
    .sort((a, b) => Number(a.priority || 9) - Number(b.priority || 9))
    .slice(0, limit)
    .map((task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
      source: task.source,
      priority: task.priority,
      title: task.title,
      retries: task.retries,
      lastRunAt: task.lastRunAt,
      createdAt: task.createdAt
    }));
}

function customerSupportRisks(tasks) {
  return taskSummary(
    tasks,
    (task) =>
      task.status !== "completed" &&
      (Number(task.priority || 9) <= 2 ||
        ["social_comment_reply", "customer_support", "support_ticket"].includes(task.type)),
    8
  );
}

function marketingOpportunities(memory, tasks) {
  const memoryItems = [
    ...(memory.categories?.["Marketing campaigns"] || []),
    ...(memory.categories?.Promotions || [])
  ]
    .slice(0, 6)
    .map((item) => ({
      source: "memory",
      title: item.title,
      category: item.category || "Marketing campaigns",
      updatedAt: item.updatedAt || item.createdAt
    }));

  const taskItems = taskSummary(
    tasks,
    (task) => task.type === "social_daily_post" || String(task.title || "").toLowerCase().includes("marketing"),
    6
  ).map((task) => ({ ...task, source: task.source || "task" }));

  return [...taskItems, ...memoryItems].slice(0, 8);
}

function recommendedActions({ health, taskDashboard, tasks, socialDrafts, supportRisks }) {
  const actions = [];

  if (!health.disk.ok || Number(health.disk.usedPercent || 0) >= 85) {
    actions.push({
      priority: 1,
      type: "system",
      title: "Review server disk usage",
      reason: `Disk usage is ${health.disk.usedPercent ?? "unknown"}%.`,
      safeExecution: "manual_review_only"
    });
  }

  if (!health.ram.ok || Number(health.ram.usedPercent || 0) >= 90) {
    actions.push({
      priority: 1,
      type: "system",
      title: "Review memory pressure",
      reason: `RAM usage is ${health.ram.usedPercent ?? "unknown"}%.`,
      safeExecution: "manual_review_only"
    });
  }

  if ((taskDashboard.counts.failed || 0) > 0) {
    actions.push({
      priority: 1,
      type: "task",
      title: "Review failed Kethura tasks",
      reason: `${taskDashboard.counts.failed} failed task(s) need operator review.`,
      safeExecution: "manual_review_only"
    });
  }

  if (supportRisks.length) {
    actions.push({
      priority: 2,
      type: "customer_communication",
      title: "Review sensitive customer support/social replies",
      reason: `${supportRisks.length} sensitive or high-priority support item(s) are pending.`,
      safeExecution: "draft_private_support_reply_only"
    });
  }

  if (socialDrafts.length) {
    actions.push({
      priority: 3,
      type: "marketing",
      title: "Review social draft suggestions",
      reason: `${socialDrafts.length} social draft(s) are waiting for review.`,
      safeExecution: "draft_review_only"
    });
  } else {
    actions.push({
      priority: 4,
      type: "marketing",
      title: "Create a daily HandyPay social draft",
      reason: "No current social draft is pending.",
      safeExecution: "draft_review_only"
    });
  }

  actions.push({
    priority: 5,
    type: "safety",
    title: "Keep sensitive operations manual",
    reason: "Kethura must not publish customer balances, card data, KYC, or transaction details publicly.",
    safeExecution: "never_auto_execute_sensitive_actions"
  });

  return actions.sort((a, b) => a.priority - b.priority);
}

async function dailyBrief() {
  const [health, taskDashboard, memory, tasks] = await Promise.all([
    healthReport(),
    dashboard(),
    loadMemory(),
    readTasks()
  ]);

  const newTasks = taskSummary(tasks, (task) => task.status === "pending", 10);
  const failedTasks = taskSummary(tasks, (task) => task.status === "failed", 10);
  const socialDrafts = taskSummary(tasks, (task) => task.type === "social_daily_post" && task.status !== "completed", 8);
  const supportRisks = customerSupportRisks(tasks);
  const marketing = marketingOpportunities(memory, tasks);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      systemHealthy:
        health.server.ok &&
        health.disk.ok &&
        health.ram.ok &&
        health.queue.ok &&
        health.socialConnectors.x.draftMode === true &&
        health.socialConnectors.x.autoPostEnabled === false,
      taskCounts: taskDashboard.counts,
      automationPaused: Boolean(taskDashboard.automation?.paused),
      socialDraftMode: health.socialConnectors.x.draftMode,
      socialAutoPostEnabled: health.socialConnectors.x.autoPostEnabled
    },
    health,
    newTasks,
    failedTasks,
    memoryChanges: latestMemoryChanges(memory),
    socialDraftSuggestions: socialDrafts,
    customerSupportRisks: supportRisks,
    marketingOpportunities: marketing,
    recommendedActions: recommendedActions({
      health,
      taskDashboard,
      tasks,
      socialDrafts,
      supportRisks
    }),
    safetyRules: [
      "Never expose customer balance, card data, KYC, transaction details, PAN, CVV, or secure URLs publicly.",
      "For card, KYC, payment, balance, or transaction issues, redirect the customer to private support.",
      "Social posts remain draft-only unless environment flags explicitly enable auto-posting.",
      "Operator commands prepare, approve, reject, pause, or retry work; they do not execute sensitive customer actions."
    ]
  };
}

module.exports = { dailyBrief, recommendedActions };
