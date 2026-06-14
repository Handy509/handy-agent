const fs = require("fs/promises");
const path = require("path");
const { config } = require("../config");
const { sendTelegramAlert } = require("./telegram");

const VIP_FILE = "vip-access.json";
const VIP_REQUESTS_FILE = "vip-requests.json";

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

async function readJson(fileName, fallback) {
  const filePath = path.join(config.dataDir, fileName);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(fileName, payload) {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(path.join(config.dataDir, fileName), JSON.stringify(payload, null, 2), "utf8");
}

async function getVipAccess(phone) {
  const normalized = normalizePhone(phone);
  const access = await readJson(VIP_FILE, {});
  const record = access[normalized];

  if (!record) return { active: false };

  const expiresAt = new Date(record.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
    delete access[normalized];
    await writeJson(VIP_FILE, access);
    return { active: false };
  }

  return { active: true, ...record };
}

async function setVipAccess(phone, days = 30, approvedBy = "admin") {
  const normalized = normalizePhone(phone);
  const access = await readJson(VIP_FILE, {});
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  access[normalized] = {
    phone: normalized,
    days,
    approvedBy,
    expiresAt,
    updatedAt: new Date().toISOString()
  };

  await writeJson(VIP_FILE, access);

  const requests = await readJson(VIP_REQUESTS_FILE, {});
  if (requests[normalized]) {
    requests[normalized].status = "approved";
    requests[normalized].approvedBy = approvedBy;
    requests[normalized].approvedAt = new Date().toISOString();
    await writeJson(VIP_REQUESTS_FILE, requests);
  }

  return access[normalized];
}

async function requestVipAccess(phone) {
  const normalized = normalizePhone(phone);
  const requests = await readJson(VIP_REQUESTS_FILE, {});

  requests[normalized] = {
    phone: normalized,
    amountUsd: 1,
    amountHtg: 135,
    days: 30,
    status: "pending_admin_charge",
    createdAt: requests[normalized]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await writeJson(VIP_REQUESTS_FILE, requests);

  await sendTelegramAlert([
    "Demann VIP HandyPay",
    `Phone: ${normalized}`,
    "Montan: $1 / 135 HTG",
    "Aksyon: retire $1 sou balans kliyan an manyelman.",
    `Apre sa, voye sou WhatsApp Kethura AI: vip approve ${normalized}`
  ].join("\n"));

  return requests[normalized];
}

module.exports = {
  getVipAccess,
  requestVipAccess,
  setVipAccess
};
