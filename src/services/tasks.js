const { readJson, writeJson } = require("./storage");
const { redactValue } = require("./security");

const TASKS_FILE = "kethura-tasks.json";
const AUTOMATION_STATE_FILE = "kethura-automation-state.json";

async function readTasks() {
  return readJson(TASKS_FILE, []);
}

async function writeTasks(tasks) {
  await writeJson(TASKS_FILE, tasks);
}

async function automationState() {
  return readJson(AUTOMATION_STATE_FILE, {
    paused: false,
    updatedAt: null,
    updatedBy: null,
    reason: ""
  });
}

async function setAutomationPaused(paused, { updatedBy = "admin", reason = "" } = {}) {
  const state = {
    paused: Boolean(paused),
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy).slice(0, 120),
    reason: String(reason || "").slice(0, 500)
  };
  await writeJson(AUTOMATION_STATE_FILE, state);
  return state;
}

async function createTask(task) {
  const tasks = await readTasks();
  const now = new Date().toISOString();
  const record = {
    id: task.id || `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: task.type || "general",
    status: task.status || "pending",
    source: task.source || "kethura",
    priority: Number(task.priority || 3),
    retries: Number(task.retries || 0),
    title: String(task.title || "Kethura task").slice(0, 180),
    payload: redactValue(task.payload || {}),
    result: redactValue(task.result || null),
    createdAt: task.createdAt || now,
    updatedAt: now,
    lastRunAt: task.lastRunAt || null
  };
  tasks.unshift(record);
  await writeTasks(tasks.slice(0, 1000));
  return record;
}

async function updateTask(id, patch) {
  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  tasks[index] = {
    ...tasks[index],
    ...redactValue(patch),
    updatedAt: new Date().toISOString()
  };
  await writeTasks(tasks);
  return tasks[index];
}

async function dashboard() {
  const tasks = await readTasks();
  const automation = await automationState();
  const counts = tasks.reduce(
    (memo, task) => {
      memo[task.status] = (memo[task.status] || 0) + 1;
      return memo;
    },
    { pending: 0, completed: 0, failed: 0, approved: 0, rejected: 0, paused: 0 }
  );

  return {
    counts,
    automation,
    tasks: tasks.slice(0, 100).map((task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
      retries: task.retries,
      source: task.source,
      priority: task.priority,
      title: task.title,
      lastRunAt: task.lastRunAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }))
  };
}

async function taskAction(id, action) {
  const transitions = {
    retry: { status: "pending", retriesIncrement: true, lastRunAt: new Date().toISOString() },
    approve: { status: "approved" },
    reject: { status: "rejected" },
    pause: { status: "paused" }
  };
  const patch = transitions[action];
  if (!patch) {
    const error = new Error("Unsupported task action");
    error.statusCode = 422;
    throw error;
  }

  if (patch.retriesIncrement) {
    const tasks = await readTasks();
    const task = tasks.find((item) => item.id === id);
    patch.retries = Number(task?.retries || 0) + 1;
    delete patch.retriesIncrement;
  }

  return updateTask(id, patch);
}

module.exports = {
  automationState,
  createTask,
  dashboard,
  readTasks,
  setAutomationPaused,
  taskAction,
  updateTask
};
