const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kethura-social-"));

const {
  classifyComment,
  createCommentReviewTask,
  createDailyPostDraft,
  proposedReplyForComment
} = require("../src/services/socialAutomation");

test("social comment classifier escalates sensitive public support questions", async () => {
  assert.equal(classifyComment("Kat mwen pa pase, verifye balance mwen"), "question carte");

  const proposal = proposedReplyForComment({ text: "KYC mwen bloke, balans mwen kote?" });
  assert.equal(proposal.sensitive, true);
  assert.match(proposal.reply, /support prive/i);

  const review = await createCommentReviewTask({
    platform: "facebook",
    externalId: "comment-1",
    text: "KYC mwen bloke",
    author: "Client"
  });

  assert.equal(review.task.status, "pending");
  assert.equal(review.proposal.sensitive, true);
  assert.equal(review.task.payload.publicPostingAllowed, false);
});

test("daily X post is created as draft review by default", async () => {
  const draft = await createDailyPostDraft(new Date("2026-06-20T12:00:00Z"));

  assert.equal(draft.payload.platform, "x");
  assert.equal(draft.payload.mode, "draft_review");
  assert.equal(draft.payload.public_action_executed, false);
  assert.match(draft.payload.content, /HandyPay/);
});
