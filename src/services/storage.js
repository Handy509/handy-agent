const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

async function ensureDataDir() {
  await fs.mkdir(config.dataDir, { recursive: true });
}

async function appendJsonLine(fileName, payload) {
  await ensureDataDir();
  const filePath = path.join(config.dataDir, fileName);
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function readJson(fileName, fallback) {
  await ensureDataDir();
  const filePath = path.join(config.dataDir, fileName);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(fileName, payload) {
  await ensureDataDir();
  const filePath = path.join(config.dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

module.exports = { appendJsonLine, readJson, writeJson };
