const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");

const SESSION_FILE = "sessions.json";
const TTL_MS = 30 * 60 * 1000;

async function readSessions() {
  const filePath = path.join(config.dataDir, SESSION_FILE);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeSessions(sessions) {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(path.join(config.dataDir, SESSION_FILE), JSON.stringify(sessions, null, 2), "utf8");
}

async function setSession(phone, state) {
  const sessions = await readSessions();
  sessions[phone] = {
    ...(sessions[phone] || {}),
    ...state,
    updatedAt: new Date().toISOString()
  };
  await writeSessions(sessions);
}

async function getSession(phone) {
  const sessions = await readSessions();
  const session = sessions[phone];

  if (!session) return null;

  const age = Date.now() - new Date(session.updatedAt).getTime();
  if (age > TTL_MS) {
    delete sessions[phone];
    await writeSessions(sessions);
    return null;
  }

  return session;
}

async function clearSession(phone) {
  const sessions = await readSessions();
  delete sessions[phone];
  await writeSessions(sessions);
}

module.exports = { clearSession, getSession, setSession };
