const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

const USAGE_FILE = "usage.json";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function readUsage() {
  const filePath = path.join(config.dataDir, USAGE_FILE);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeUsage(usage) {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(path.join(config.dataDir, USAGE_FILE), JSON.stringify(usage, null, 2), "utf8");
}

async function incrementUsage(customerPhone, isVip = false) {
  if (isVip) return { allowed: true, count: 0, limit: "vip" };

  const phone = String(customerPhone || "unknown");
  const date = todayKey();
  const usage = await readUsage();

  usage[date] ||= {};
  usage[date][phone] = (usage[date][phone] || 0) + 1;

  await writeUsage(usage);

  const count = usage[date][phone];
  const limit = config.freeMessageLimitPerDay;

  return {
    allowed: count <= limit,
    count,
    limit
  };
}

module.exports = { incrementUsage };
