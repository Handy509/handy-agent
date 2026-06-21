const { addMemoryEntry } = require("./memory");
const { dailyBrief } = require("./dailyBrief");
const {
  clearOperationalSnapshots,
  getConnectorStatus,
  pauseConnector,
  refreshOperationalData
} = require("./operationalConnectors");
const { runAutonomousCycle } = require("./scheduler");
const { createDailyPostDraft } = require("./socialAutomation");
const { dashboard, setAutomationPaused, taskAction } = require("./tasks");

const COMMANDS = new Set([
  "approve_task",
  "approve_social_draft",
  "reject_task",
  "retry_task",
  "resolve_task",
  "reopen_task",
  "pause_automation",
  "resume_automation",
  "create_social_draft",
  "add_memory_item",
  "get_daily_brief",
  "get_tasks",
  "run_autonomous_cycle_now",
  "refresh_operational_data",
  "get_connector_status",
  "pause_connector",
  "resume_connector",
  "clear_operational_snapshots"
]);

function commandError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function runOperatorCommand({ command, taskId, connector, memoryItem, reason, actor = "admin" } = {}) {
  const normalized = String(command || "").trim();
  if (!COMMANDS.has(normalized)) {
    throw commandError("Unsupported operator command");
  }

  if (normalized === "approve_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "approve") };
  }

  if (normalized === "approve_social_draft") {
    if (!taskId) throw commandError("taskId is required");
    const result = await taskAction(String(taskId), "approve");
    return {
      command: normalized,
      result: {
        ...result,
        public_action_executed: false,
        approval_scope: "draft_only"
      }
    };
  }

  if (normalized === "reject_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "reject") };
  }

  if (normalized === "retry_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "retry") };
  }

  if (normalized === "resolve_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "resolve") };
  }

  if (normalized === "reopen_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "reopen") };
  }

  if (normalized === "pause_automation") {
    return {
      command: normalized,
      result: await setAutomationPaused(true, { updatedBy: actor, reason })
    };
  }

  if (normalized === "resume_automation") {
    return {
      command: normalized,
      result: await setAutomationPaused(false, { updatedBy: actor, reason })
    };
  }

  if (normalized === "create_social_draft") {
    return {
      command: normalized,
      result: await createDailyPostDraft()
    };
  }

  if (normalized === "get_daily_brief") {
    return { command: normalized, result: await dailyBrief() };
  }

  if (normalized === "get_tasks") {
    return { command: normalized, result: await dashboard() };
  }

  if (normalized === "run_autonomous_cycle_now") {
    return { command: normalized, result: await runAutonomousCycle("admin_command") };
  }

  if (normalized === "add_memory_item") {
    if (!memoryItem || typeof memoryItem !== "object") {
      throw commandError("memoryItem is required");
    }
    return {
      command: normalized,
      result: await addMemoryEntry(memoryItem)
    };
  }

  if (normalized === "refresh_operational_data") {
    return { command: normalized, result: await refreshOperationalData() };
  }

  if (normalized === "get_connector_status") {
    return { command: normalized, result: await getConnectorStatus() };
  }

  if (normalized === "pause_connector") {
    const name = connector || taskId;
    if (!name) throw commandError("connector is required");
    return { command: normalized, result: await pauseConnector(String(name), true, reason) };
  }

  if (normalized === "resume_connector") {
    const name = connector || taskId;
    if (!name) throw commandError("connector is required");
    return { command: normalized, result: await pauseConnector(String(name), false, reason) };
  }

  if (normalized === "clear_operational_snapshots") {
    return { command: normalized, result: await clearOperationalSnapshots() };
  }

  throw commandError("Unsupported operator command");
}

module.exports = { COMMANDS, runOperatorCommand };
