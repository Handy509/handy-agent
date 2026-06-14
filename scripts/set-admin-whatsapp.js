const fs = require("fs");

const envPath = "/home/codex/handypay-ai-agent/.env";
let text = fs.readFileSync(envPath, "utf8");
const value = process.argv[2] || "";
const lines = text.split(/\r?\n/).filter((line) => !line.startsWith("ADMIN_WHATSAPP_NUMBERS="));
lines.push(`ADMIN_WHATSAPP_NUMBERS=${value}`);
text = lines.join("\n");
fs.writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`);
