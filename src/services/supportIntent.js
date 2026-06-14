function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const intents = [
  { name: "missing_deposit", risk: "high", words: ["depo pa monte", "deposit missing", "depot non credite", "lajan pa antre"] },
  { name: "blocked_card", risk: "high", words: ["kat bloke", "card blocked", "carte bloquee"] },
  { name: "refund", risk: "high", words: ["refund", "remboursement", "ranbousman"] },
  { name: "scam_accusation", risk: "high", words: ["scam", "vole lajan", "arnaque", "fraud"] },
  { name: "card_declined", risk: "medium", words: ["kat refize", "card declined", "carte refusee"] },
  { name: "kyc", risk: "medium", words: ["kyc", "verifikasyon", "verification"] },
  { name: "login", risk: "medium", words: ["login", "konekte", "connexion", "modpas", "password"] },
  { name: "pricing", risk: "low", words: ["pri", "price", "frais", "fee", "koute"] },
  { name: "card_activation", risk: "low", words: ["aktive kat", "activate card", "activer carte"] },
  { name: "agent_recharge", risk: "low", words: ["ajan", "agent", "orange money", "flooz", "t-money"] },
  { name: "partnership", risk: "medium", words: ["partenariat", "partnership", "patne"] }
];

function classifySupportIntent(message) {
  const value = normalize(message);
  const match = intents.find((item) => item.words.some((word) => value.includes(word)));
  return match || { name: "general_support", risk: "low" };
}

module.exports = { classifySupportIntent };
