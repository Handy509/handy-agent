const fs = require("fs");

const envPath = "/home/codex/handypay-ai-agent/.env";
let text = fs.readFileSync(envPath, "utf8");

function setKv(key, value) {
  const lines = text.split(/\r?\n/).filter((line) => !line.startsWith(`${key}=`));
  lines.push(`${key}=${value}`);
  text = lines.join("\n");
}

setKv("TELEGRAM_BOT_TOKEN", process.argv[2]);
setKv("TELEGRAM_ADMIN_CHAT_ID", process.argv[3]);

fs.writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`);
