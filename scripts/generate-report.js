require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");

const { config } = require("../src/config");
const { sendTelegramAlert } = require("../src/services/telegram");

const HOURS = Number(process.argv[2] || process.env.REPORT_WINDOW_HOURS || 24);
const SEND = process.argv.includes("--send");

const KEYWORDS = {
  card: ["kat", "card", "visa", "mastercard", "aktive", "activation", "virtual"],
  recharge: ["recharge", "rechargement", "alimentation", "versement", "approvisionnement"],
  balance: ["balans", "balance", "solde"],
  verification: ["email", "nimewo", "numero", "verifye", "verification", "kyc", "id", "selfie", "rejected", "rejte", "koresponn", "match"],
  problem: ["pwoblem", "problème", "problem", "erè", "erreur", "pa paret", "pa parèt", "blocked", "bloque", "txid", "usdt"],
  api: ["api", "white-label", "whitelabel", "biznis", "business", "reseller"],
  adminReport: ["rapo", "rapot", "raport", "rapoort", "rapport", "report", "rapo global", "rapot global", "raport global", "rapoort global", "rapport global", "global report"]
};

function now() {
  return new Date();
}

function sinceDate(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function readJsonLines(fileName) {
  const filePath = path.join(config.dataDir, fileName);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function inWindow(item, since) {
  const date = new Date(item.createdAt || item.updatedAt || 0);
  return Number.isFinite(date.getTime()) && date >= since;
}

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(text, words) {
  const value = normalizeText(text);
  return words.some((word) => value.includes(word));
}

function classify(text) {
  return Object.entries(KEYWORDS)
    .filter(([, words]) => hasAny(text, words))
    .map(([name]) => name);
}

function formatTop(list, max = 8) {
  return list.slice(0, max).map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function buildRecommendations({ counts, unresolvedLeads, verificationIssues, problemCount, adminReportCount }) {
  const recommendations = [];

  if (verificationIssues.length > 0) {
    recommendations.push("Ajoute yon mesaj/paj senp ki montre kijan kliyan ka mete nimewo WhatsApp yo nan profil HandyPay.");
  }

  if (unresolvedLeads.length >= 3) {
    recommendations.push("Fè yon ti relance pou moun ki mande kat/activation men ki poko konfime kont yo. Ofri yon rabe activation oswa asistans rapid pandan wikenn nan.");
  }

  if ((counts.recharge || 0) > (counts.card || 0)) {
    recommendations.push("Mete rechargement/alimentation pi vizib nan app/sit la, paske se sijè kliyan yo poze plis.");
  }

  if (problemCount > 0) {
    recommendations.push("Revize tickets ki gen TXID/USDT/kat bloke yo anvan anons piblik, paske ka sa yo ka kreye fristrasyon vit.");
  }

  if (adminReportCount > 0) {
    recommendations.push("Gen moun ki mande rapo/admin. Kethura dwe voye yo sou +1 (913) 733-7645 epi pa bay done admin bay kliyan.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Kontinye teste ak kesyon reyèl kliyan yo. Kounye a pa gen gwo siyal negatif nan fenèt analiz la.");
  }

  return recommendations;
}

async function generateReport() {
  const since = sinceDate(HOURS);
  const conversations = (await readJsonLines("conversations.jsonl")).filter((item) => inWindow(item, since));
  const tickets = (await readJsonLines("tickets.jsonl")).filter((item) => inWindow(item, since));
  const inbound = conversations.filter((item) => item.direction === "inbound");
  const outbound = conversations.filter((item) => item.direction === "outbound");
  const uniqueCustomers = [...new Set(inbound.map((item) => item.customerPhone).filter(Boolean))];

  const counts = {};
  const leadPhones = new Set();
  const verificationPhones = new Set();
  const problemPhones = new Set();
  const adminReportPhones = new Set();

  for (const item of inbound) {
    const categories = classify(item.text);
    for (const category of categories) counts[category] = (counts[category] || 0) + 1;
    if (categories.includes("card")) leadPhones.add(item.customerPhone);
    if (categories.includes("verification")) verificationPhones.add(item.customerPhone);
    if (categories.includes("problem")) problemPhones.add(item.customerPhone);
    if (categories.includes("adminReport")) adminReportPhones.add(item.customerPhone);
  }

  const unresolvedLeads = [...leadPhones].filter((phone) => phone);
  const verificationIssues = [...verificationPhones].filter((phone) => phone);
  const adminReportRequests = [...adminReportPhones].filter((phone) => phone);
  const problemTicketCount = tickets.filter((ticket) => classify(`${ticket.subject || ""}\n${ticket.message || ""}`).includes("problem")).length;
  const recommendations = buildRecommendations({
    counts,
    unresolvedLeads,
    verificationIssues,
    problemCount: problemPhones.size + problemTicketCount,
    adminReportCount: adminReportRequests.length
  });

  const report = [
    `Rapò HandyPay AI Agent (${HOURS}h)`,
    `Dat: ${now().toISOString()}`,
    "",
    "Rezime",
    `- Mesaj kliyan: ${inbound.length}`,
    `- Repons bot: ${outbound.length}`,
    `- Kliyan inik: ${uniqueCustomers.length}`,
    `- Tickets/eskalasyon: ${tickets.length}`,
    "",
    "Sijè ki parèt plis",
    `- Kat/activation: ${counts.card || 0}`,
    `- Rechargement/alimentation: ${counts.recharge || 0}`,
    `- Balans/solde: ${counts.balance || 0}`,
    `- Verification phone/email: ${counts.verification || 0}`,
    `- Pwoblèm/TXID/USDT/blokaj: ${counts.problem || 0}`,
    `- API/reseller/biznis: ${counts.api || 0}`,
    `- Demann rapo/admin: ${counts.adminReport || 0}`,
    "",
    "Kliyan pou relance",
    unresolvedLeads.length ? formatTop(unresolvedLeads) : "Pa gen lead kat/activation detekte nan peryòd la.",
    "",
    "Verification pou swiv",
    verificationIssues.length ? formatTop(verificationIssues) : "Pa gen gwo pwoblèm verification detekte.",
    "",
    "Demann rapo/admin pou swiv",
    adminReportRequests.length ? formatTop(adminReportRequests) : "Pa gen demann rapo/admin non-otorize detekte.",
    "",
    "Rekòmandasyon AI-based",
    recommendations.map((item) => `- ${item}`).join("\n")
  ].join("\n");

  const reportDir = path.join(config.dataDir, "reports");
  await fs.mkdir(reportDir, { recursive: true });
  const fileName = `report-${new Date().toISOString().replace(/[:.]/g, "-")}-${HOURS}h.txt`;
  await fs.writeFile(path.join(reportDir, fileName), report, "utf8");

  if (SEND) {
    await sendTelegramAlert(report.slice(0, 3900));
  }

  console.log(report);
  return report;
}

if (require.main === module) {
  generateReport().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { generateReport };
