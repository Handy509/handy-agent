const { dailyCustomerBehavior } = require("./customerBehavior");
const { createTask } = require("./tasks");

const MARKET_DEFAULTS = {
  HT: { language: "ht", hook: "Peye sou entènèt pi fasil ak HandyPay.", cta: "Kreye kont HandyPay ou jodi a." },
  FR: { language: "fr", hook: "Vos paiements numériques, plus simples avec HandyPay.", cta: "Découvrez HandyPay aujourd’hui." },
  US: { language: "en", hook: "Manage digital payments more easily with HandyPay.", cta: "Discover HandyPay today." },
  "US/CA": { language: "en", hook: "Manage digital payments more easily with HandyPay.", cta: "Discover HandyPay today." },
  BR: { language: "pt", hook: "Pagamentos digitais mais simples com HandyPay.", cta: "Conheça a HandyPay hoje." }
};

function marketPlan(country = "HT", behavior = {}) {
  const market = MARKET_DEFAULTS[country] || MARKET_DEFAULTS.HT;
  const topTopic = behavior.topics?.[0]?.name || "card";
  const localizedTopics = {
    ht: {
      card: "Kat dijital pou acha ak abònman sou entènèt.",
      new_visa: "Jere New USD Visa ou ak montan klè an USD.",
      funding: "Ajoute lajan epi swiv demann ou pi fasil.",
      mobile_recharge: "Rechaje telefòn ak sèvis dijital nan yon sèl app.",
      windows: "HandyPay Digital pou Windows ap vini apre sètifikasyon Microsoft.",
      other: "Kont, kat ak sèvis dijital nan yon sèl eksperyans."
    },
    fr: {
      card: "Une carte numérique pour vos achats et abonnements en ligne.",
      new_visa: "Gérez votre New USD Visa avec des montants clairement affichés en USD.",
      funding: "Alimentez votre compte et suivez vos demandes plus facilement.",
      mobile_recharge: "Recharge mobile et services numériques dans une seule application.",
      windows: "HandyPay Digital pour Windows arrive après la certification Microsoft.",
      other: "Compte, carte et services numériques dans une seule expérience."
    },
    en: {
      card: "A digital card for online purchases and subscriptions.",
      new_visa: "Manage your New USD Visa with amounts clearly displayed in USD.",
      funding: "Fund your account and track requests more easily.",
      mobile_recharge: "Mobile recharge and digital services in one app.",
      windows: "HandyPay Digital for Windows is coming after Microsoft certification.",
      other: "Account, card and digital services in one experience."
    },
    pt: {
      card: "Um cartão digital para compras e assinaturas online.",
      new_visa: "Gerencie seu New USD Visa com valores claros em USD.",
      funding: "Adicione saldo e acompanhe suas solicitações com facilidade.",
      mobile_recharge: "Recarga móvel e serviços digitais em um só aplicativo.",
      windows: "HandyPay Digital para Windows chegará após a certificação da Microsoft.",
      other: "Conta, cartão e serviços digitais em uma única experiência."
    }
  };
  const topicCopy = localizedTopics[market.language]?.[topTopic]
    || localizedTopics[market.language]?.other
    || localizedTopics.ht.other;

  return {
    country,
    language: market.language,
    topic: topTopic,
    hook: market.hook,
    value: topicCopy,
    cta: market.cta
  };
}

function creativePackage(plan, date = new Date()) {
  const shortText = `${plan.hook} ${plan.value} ${plan.cta}`;
  return {
    campaignId: `handypay-${plan.country.toLowerCase().replace(/\W/g, "-")}-${date.toISOString().slice(0, 10)}`,
    market: plan.country,
    language: plan.language,
    approvalRequired: true,
    publishingAllowed: false,
    copy: {
      x: `${shortText}\n\n#HandyPay #DigitalPayments`,
      instagram: `${plan.hook}\n\n${plan.value}\n\n${plan.cta}\n\n#HandyPay #Fintech`,
      facebook: `${plan.hook}\n${plan.value}\n${plan.cta}`,
      tiktokCaption: `${plan.hook} ${plan.cta} #HandyPay`
    },
    poster: {
      format: "1080x1350",
      headline: plan.hook,
      subheadline: plan.value,
      cta: plan.cta,
      prompt: `Premium fintech poster for HandyPay, market ${plan.country}, language ${plan.language}, orange and deep navy brand palette, smartphone showing a clean payment dashboard, trustworthy modern Caribbean fintech aesthetic, headline "${plan.hook}", subheadline "${plan.value}", CTA "${plan.cta}", no sensitive financial data, no bank logos, no unsupported promises, 1080x1350`
    },
    video: {
      format: "1080x1920",
      durationSeconds: 18,
      fps: 30,
      script: [
        { seconds: "0-3", visual: "Fast phone reveal with HandyPay logo", text: plan.hook },
        { seconds: "3-9", visual: "Animated app screens: account, card and transactions", text: plan.value },
        { seconds: "9-14", visual: "Simple secure-payment motion graphics", text: "Senp. Klè. HandyPay." },
        { seconds: "14-18", visual: "Logo, CTA and official website", text: plan.cta }
      ],
      remotionSpec: {
        compositionId: "HandyPayViralShort",
        width: 1080,
        height: 1920,
        fps: 30,
        durationInFrames: 540,
        props: {
          market: plan.country,
          language: plan.language,
          hook: plan.hook,
          value: plan.value,
          cta: plan.cta,
          brandColors: ["#F7931E", "#081A33", "#FFFFFF"]
        }
      }
    }
  };
}

async function createDailyCreativeBrief(date = new Date()) {
  const behavior = await dailyCustomerBehavior(24);
  const countries = behavior.countries.filter((item) => item.name !== "unknown").slice(0, 3);
  const markets = countries.length ? countries.map((item) => item.name) : ["HT"];
  const packages = markets.map((country) => creativePackage(marketPlan(country, behavior), date));
  const task = await createTask({
    type: "daily_creative_brief",
    status: "pending",
    source: "kethura_creative_studio",
    severity: "info",
    priority: 3,
    title: "Approve today’s HandyPay creative package",
    recommendedAction: "Review poster, video and social copy; approve, reject or request edits. Nothing is published automatically.",
    dedupeKey: `daily_creative:${date.toISOString().slice(0, 10)}`,
    payload: {
      behaviorSummary: {
        countries: behavior.countries,
        languages: behavior.languages,
        topics: behavior.topics
      },
      packages,
      approvalRequired: true,
      public_action_executed: false
    }
  });
  return { task, behavior, packages };
}

module.exports = { creativePackage, createDailyCreativeBrief, marketPlan };
