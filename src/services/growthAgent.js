const { config } = require("../config");
const { logger } = require("../logger");
const { readJson, writeJson } = require("./storage");
const { createOpportunity, createSocialPost } = require("./operationsApi");
const { createDailyPostDraft } = require("./socialAutomation");

const STATE_FILE = "growth-agent-state.json";
let timer = null;
let running = false;

function dailyHandyPayDraft(date) {
  return {
    platform: "x",
    objective: "HandyPay Digital adoption and customer education",
    audience: "HandyPay users and international payment customers",
    language: "ht",
    content:
      "HandyPay ap vin pi fasil sou mobil ak PC. Jere kont, kat ak tranzaksyon ou nan yon sèl eksperyans. Vèsyon Windows la toujou anba sètifikasyon Microsoft.",
    cta: "Open HandyPay and explore your services",
    scheduled_at: `${date}T15:00:00Z`
  };
}

async function runDailyGrowthCycle(force = false) {
  if (!config.growthAgentEnabled || running) return { skipped: true };
  running = true;

  try {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const state = await readJson(STATE_FILE, {});

    if (!force && (state.lastRunDate === date || now.getUTCHours() < config.growthAgentRunHourUtc)) {
      return { skipped: true, reason: "not_due" };
    }

    const post = config.socialDailyPostEnabled
      ? await createDailyPostDraft(now)
      : await createSocialPost(dailyHandyPayDraft(date));
    const opportunity = await createOpportunity({
      title: "Prepare customers for the HandyPay Digital Windows launch",
      description:
        "Educate verified users about the desktop experience while Microsoft certification is pending.",
      category: "growth",
      priority: 2,
      confidence: 78,
      expected_impact: "Higher product awareness, card activation and desktop adoption",
      source: "kethura_daily_cycle",
      metadata: { campaign: "windows_store_launch", public_action_executed: false }
    });

    await writeJson(STATE_FILE, {
      lastRunDate: date,
      lastRunAt: now.toISOString(),
      postCreated: Boolean(post.ok),
      opportunityCreated: Boolean(opportunity.ok)
    });

    logger.info(
      { date, postCreated: Boolean(post.ok), opportunityCreated: Boolean(opportunity.ok) },
      "Kethura daily growth cycle completed in draft-only mode"
    );
    return { skipped: false, post, opportunity };
  } catch (error) {
    logger.warn(
      { errorCode: error?.code || error?.name, message: error?.message },
      "Kethura daily growth cycle failed"
    );
    return { skipped: false, ok: false };
  } finally {
    running = false;
  }
}

function startGrowthAgent() {
  if (!config.growthAgentEnabled) {
    logger.info("Kethura growth agent disabled");
    return;
  }

  const intervalMs = Math.max(10, config.growthAgentCheckMinutes) * 60 * 1000;
  setTimeout(() => runDailyGrowthCycle(), 15000);
  timer = setInterval(() => runDailyGrowthCycle(), intervalMs);
  logger.info({ intervalMs, mode: "draft_only" }, "Kethura growth agent started");
}

function stopGrowthAgent() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runDailyGrowthCycle, startGrowthAgent, stopGrowthAgent };
