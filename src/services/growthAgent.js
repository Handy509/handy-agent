const { config } = require("../config");
const { logger } = require("../logger");
const { readJson, writeJson } = require("./storage");
const { createOpportunity, createSocialPost } = require("./operationsApi");
const { createDailyPostDraft } = require("./socialAutomation");

const STATE_FILE = "growth-agent-state.json";
let timer = null;
let running = false;

function dailyWorldCupDraft(date) {
  return {
    platform: "x",
    objective: "World Cup 2026 engagement and HandyPay activation",
    audience: "HandyPay users and international payment customers",
    language: "ht",
    content:
      "Mondyal 2026 la la. Fè prediksyon ou nan HandyPay, suiv pwen ou, epi pare kat ou pou peman entènasyonal. Louvri app HandyPay la pou patisipe.",
    cta: "Open HandyPay and make your prediction",
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
      : await createSocialPost(dailyWorldCupDraft(date));
    const opportunity = await createOpportunity({
      title: "Use World Cup predictions to recover KYC-to-card drop-off",
      description:
        "Invite verified users without an activated card to earn campaign tickets after card activation.",
      category: "growth",
      priority: 2,
      confidence: 78,
      expected_impact: "Higher card activation and daily app engagement",
      source: "kethura_daily_cycle",
      metadata: { campaign: "world_cup_2026", public_action_executed: false }
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
