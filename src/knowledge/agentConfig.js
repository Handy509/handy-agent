const AGENT_NAMES = ["Kethura", "Mika", "Nadia", "Samy", "Lina", "Aland"];

function pickAgentName(customerPhone = "", date = new Date()) {
  const value = String(customerPhone || "");
  let hash = 0;

  for (const char of value) {
    hash = (hash + char.charCodeAt(0)) % AGENT_NAMES.length;
  }

  const hourSlot = Math.floor(date.getTime() / (60 * 60 * 1000));
  const index = (hash + hourSlot) % AGENT_NAMES.length;

  return AGENT_NAMES[index] || AGENT_NAMES[0];
}

module.exports = { AGENT_NAMES, pickAgentName };
