const { config } = require("../config");
const { memoryText } = require("./memory");
const { createTask } = require("./tasks");
const { createSocialComment, createSocialPost } = require("./operationsApi");

const sensitiveTopics = ["balance", "balans", "kyc", "transaction", "tranzaksyon", "card", "kat", "cvv", "pin"];

function classifyComment(text = "") {
  const value = String(text).toLowerCase();
  const tests = [
    ["arnaque/spam", ["spam", "scam", "arnaque", "fake", "hack"]],
    ["plainte", ["vole", "fraud", "plent", "complaint", "pa mache", "fache"]],
    ["question carte", ["kat", "card", "visa", "mastercard", "cvv"]],
    ["dépôt/retrait", ["depo", "depot", "alimentation", "retrait", "withdraw", "moncash", "natcash"]],
    ["KYC", ["kyc", "verify", "verification", "id", "selfie"]],
    ["support", ["support", "help", "aide", "ede", "pwoblem"]],
    ["marketing opportunity", ["price", "business", "partnership", "api", "white label"]]
  ];
  const match = tests.find(([, words]) => words.some((word) => value.includes(word)));
  return match ? match[0] : "support";
}

function proposedReplyForComment({ text = "", author = "" }) {
  const category = classifyComment(text);
  const value = String(text).toLowerCase();
  const isSensitive = sensitiveTopics.some((word) => value.includes(word));

  if (isSensitive || ["plainte", "question carte", "dépôt/retrait", "KYC"].includes(category)) {
    return {
      category,
      sensitive: true,
      reply:
        "Mesi paske ou kontakte HandyPay. Pou sekirite kont ou, tanpri ekri support prive ak email kont ou + screenshot si sa nesese. Nou pa verifye balans, kat, KYC, oswa tranzaksyon nan komante piblik."
    };
  }

  if (category === "marketing opportunity") {
    return {
      category,
      sensitive: false,
      reply:
        "Mesi pou enterese w ak HandyPay. Ekri nou an prive ak detay bezwen ou a pou ekip la ka gide w sou solisyon ki pi bon an."
    };
  }

  return {
    category,
    sensitive: false,
    reply: `Mesi ${author ? author : ""}. Kethura ka ede w. Ekri nou an prive si ou bezwen suivi sou kont ou.`
  };
}

async function createCommentReviewTask(comment) {
  const proposal = proposedReplyForComment(comment);
  const task = await createTask({
    type: "social_comment_reply",
    status: "pending",
    source: comment.platform || "social",
    priority: proposal.sensitive ? 1 : 3,
    title: `Review ${proposal.category} comment reply`,
    payload: {
      ...comment,
      proposedReply: proposal.reply,
      category: proposal.category,
      publicPostingAllowed: !proposal.sensitive
    }
  });

  await createSocialComment({
    platform: comment.platform || "unknown",
    external_id: comment.externalId || task.id,
    category: proposal.category,
    original_text: comment.text || "",
    proposed_reply: proposal.reply,
    status: "draft_review",
    public_action_executed: false
  });

  return { task, proposal };
}

async function createDailyPostDraft(date = new Date()) {
  const memory = await memoryText();
  const day = date.toISOString().slice(0, 10);
  const content = [
    "HandyPay ap avanse chak jou pou rann kat, rechargement, ak support pi fasil.",
    "Swiv app la pou nouvo update yo, epi toujou itilize support prive pou kesyon kont ou."
  ].join(" ");

  const payload = {
    platform: "x",
    objective: "Daily HandyPay trust and product awareness",
    audience: "HandyPay users and prospects",
    language: "ht",
    content,
    source_memory_excerpt: memory.slice(0, 1200),
    scheduled_at: `${day}T${String(config.socialDailyPostHourUtc).padStart(2, "0")}:00:00Z`,
    mode: config.socialAutoPostEnabled && !config.socialDraftMode ? "auto_post" : "draft_review",
    public_action_executed: false
  };

  const task = await createTask({
    type: "social_daily_post",
    status: "pending",
    source: "kethura_social_scheduler",
    priority: 3,
    title: "Review daily X post draft",
    payload
  });

  const post = await createSocialPost(payload);
  return { task, post, payload };
}

module.exports = {
  classifyComment,
  createCommentReviewTask,
  createDailyPostDraft,
  proposedReplyForComment
};
