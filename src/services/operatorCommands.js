const { addMemoryEntry } = require("./memory");
const { createDailyPostDraft } = require("./socialAutomation");
const { setAutomationPaused, taskAction } = require("./tasks");

const COMMANDS = new Set([
  "approve_task",
  "reject_task",
  "retry_task",
  "pause_automation",
  "resume_automation",
  "create_social_draft",
  "add_memory_item"
]);

function commandError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function runOperatorCommand({ command, taskId, memoryItem, reason, actor = "admin" } = {}) {
  const normalized = String(command || "").trim();
  if (!COMMANDS.has(normalized)) {
    throw commandError("Unsupported operator command");
  }

  if (normalized === "approve_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "approve") };
  }

  if (normalized === "reject_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "reject") };
  }

  if (normalized === "retry_task") {
    if (!taskId) throw commandError("taskId is required");
    return { command: normalized, result: await taskAction(String(taskId), "retry") };
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

  if (normalized === "add_memory_item") {
    if (!memoryItem || typeof memoryItem !== "object") {
      throw commandError("memoryItem is required");
    }
    return {
      command: normalized,
      result: await addMemoryEntry(memoryItem)
    };
  }

  throw commandError("Unsupported operator command");
}

module.exports = { COMMANDS, runOperatorCommand };
