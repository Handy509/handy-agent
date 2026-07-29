const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
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
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;

  try {
    await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

module.exports = { appendJsonLine, readJson, writeJson };
