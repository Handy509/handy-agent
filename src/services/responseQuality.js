const RETIRED_FEATURES = [
  { pattern: /\bworld cup\b|\bmondyal\b/i, flag: "retired_world_cup" },
  { pattern: /\bopenclaw\b/i, flag: "retired_openclaw" },
  { pattern: /\bremote config\b/i, flag: "retired_remote_config" }
];

function analyzeResponse({ customerMessage, reply, intent = "unknown" }) {
  const question = String(customerMessage || "").trim();
  const answer = String(reply || "").trim();
  const flags = [];
  let score = 100;

  if (!answer || answer.length < 20) {
    flags.push("low_information");
    score -= 35;
  }
  if (/mwen pa (konnen|ka ede)|i don'?t know|je ne sais pas/i.test(answer)) {
    flags.push("unresolved_fallback");
    score -= 25;
  }
  for (const retired of RETIRED_FEATURES) {
    if (retired.pattern.test(answer)) {
      flags.push(retired.flag);
      score -= 40;
    }
  }
  if (/(kat|card).*(490000|2000000|31000000)|(490000|2000000|31000000).*(kat|card)/i.test(question)
      && !/(USD|dola|dollar|kontra|contract|endpoint)/i.test(answer)) {
    flags.push("ambiguous_money_scale");
    score -= 30;
  }
  if (/windows|pc|microsoft store/i.test(question)
      && /(disponib|available|telechaje|download).*(microsoft store|store)/i.test(answer)
      && !/(sètifik|certif|revizyon|review|ap tann|pending)/i.test(answer)) {
    flags.push("windows_release_overclaim");
    score -= 35;
  }
  if (answer.length > 1200) {
    flags.push("too_long");
    score -= 10;
  }

  return {
    score: Math.max(0, score),
    needsReview: score < 75,
    flags: [...new Set(flags)],
    intent
  };
}

module.exports = { analyzeResponse };
