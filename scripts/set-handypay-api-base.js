const fs = require("fs");

const path = "/home/codex/handypay-ai-agent/.env";
let text = fs.readFileSync(path, "utf8");

function setKv(key, value) {
  const lines = text.split(/\r?\n/).filter((line) => !line.startsWith(`${key}=`));
  lines.push(`${key}=${value}`);
  text = lines.join("\n");
}

setKv("HANDYPAY_API_BASE_URL", "https://beta.handypayhaiti.com");

if (!/^HANDYPAY_API_TOKEN=/m.test(text)) {
  text += "\nHANDYPAY_API_TOKEN=\n";
}

fs.writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
