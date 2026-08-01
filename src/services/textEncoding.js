const REPLACEMENTS = new Map([
  ["ðŸ‘‹", "👋"], ["ðŸ™‚", "🙂"], ["ðŸ¤–", "🤖"], ["âœ…", "✅"],
  ["â€œ", "“"], ["â€", "”"], ["â€™", "’"], ["â€“", "–"], ["â€”", "—"],
  ["â€¦", "…"], ["Â·", "·"], ["Â", ""], ["Ã€", "À"], ["Ã‰", "É"],
  ["Ãˆ", "È"], ["Ã‡", "Ç"], ["Ã ", "à"], ["Ã¡", "á"], ["Ã©", "é"],
  ["Ã¨", "è"], ["Ãª", "ê"], ["Ã«", "ë"], ["Ã­", "í"], ["Ã®", "î"],
  ["Ã¯", "ï"], ["Ã±", "ñ"], ["Ã²", "ò"], ["Ã³", "ó"], ["Ã´", "ô"],
  ["Ã¶", "ö"], ["Ã¹", "ù"], ["Ãº", "ú"], ["Ã»", "û"], ["Ã¼", "ü"],
  ["Ã§", "ç"], ["ï¿½", ""]
]);

function repairOutboundText(text) {
  let repaired = String(text || "");
  for (const [broken, correct] of REPLACEMENTS) {
    repaired = repaired.replaceAll(broken, correct);
  }
  return repaired.replace(/\uFFFD/g, "").normalize("NFC");
}

module.exports = { repairOutboundText };
