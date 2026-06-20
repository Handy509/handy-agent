const { config } = require("../config");
const { generateReport } = require("../../scripts/generate-report");
const { setVipAccess } = require("./vip");
const { addMemoryEntry, CATEGORIES } = require("./memory");

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

function isAdminPhone(phone) {
  const normalized = normalizePhone(phone);
  return config.adminWhatsAppNumbers.includes(normalized);
}

function isReportCommand(text = "") {
  const value = String(text)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return [
    "rapo",
    "rapot",
    "raport",
    "rapoort",
    "rapport",
    "rapport global",
    "rapo global",
    "rapot global",
    "raport global",
    "rapoort global",
    "report",
    "global report",
    "/report",
    "/rapport",
    "/rapport global"
  ].includes(value);
}

function parseVipApprove(text = "") {
  const match = String(text).trim().toLowerCase().match(/^vip\s+approve\s+(\+?\d[\d\s-]{6,})$/);
  return match ? match[1].replace(/\D/g, "") : "";
}

function parseMemoryAdd(text = "") {
  const match = String(text).trim().match(/^\/?memory\s+add\s+([^|]+)\|([^|]+)\|([\s\S]+)$/i);
  if (!match) return null;
  return {
    category: match[1].trim(),
    title: match[2].trim(),
    body: match[3].trim(),
    source: "whatsapp_admin_command"
  };
}

async function handleAdminCommand({ from, text }) {
  const vipPhone = parseVipApprove(text);
  const memoryEntry = parseMemoryAdd(text);

  if (!isReportCommand(text) && !vipPhone && !memoryEntry) return null;

  if (!isAdminPhone(from)) {
    return "Mwen pa gen akse pou bay rapo oswa done admin.\nPou sa, ekri admin HandyPay sou WhatsApp/Telegram: +1 (913) 733-7645.";
  }

  if (memoryEntry) {
    if (!CATEGORIES.includes(memoryEntry.category)) {
      return `Kategori memory pa valid. Itilize youn ladan yo:\n${CATEGORIES.join("\n")}`;
    }
    const entry = await addMemoryEntry(memoryEntry);
    return `Memory Kethura mete ajou.\nKategori: ${entry.category}\nTit: ${entry.title}`;
  }

  if (vipPhone) {
    const vip = await setVipAccess(vipPhone, 30, normalizePhone(from));
    return `VIP aktive pou ${vip.phone} pandan 30 jou.\nExpire: ${vip.expiresAt}`;
  }

  const report = await generateReport();
  return report.slice(0, 3900);
}

module.exports = { handleAdminCommand, isAdminPhone, isReportCommand };
