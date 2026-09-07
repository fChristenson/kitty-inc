// Central balance sheet for every number that feeds into "how much money is being
// made" — per-floor income growth, upgrade pricing, crit-tier odds/payouts, sale
// boosts, corporation-wide modifiers, and every minigame's own reward rate. This is
// the one place to tune when rebalancing income across methods so they stay
// proportionate to each other — nothing else in the codebase should hardcode a
// balance number already owned here; add new tunable values as new fields instead
// of a fresh standalone constant elsewhere. Pure data, no imports — safe for any
// module (including circular-import-sensitive ones like floors/index.ts) to read.

export const CONFIG = {
  // src/floors/index.ts's buildFloor — a new floor's starting stats. Each floor
  // above the ground floor multiplies its income by incomeGrowthFactor while its
  // interval only doubles, so $/sec grows incomeGrowthFactor/2 per floor.
  floors: {
    baseIncomeAmount: 1,
    incomeGrowthFactor: 3,
    baseIncomeIntervalSeconds: 1,
    baseUpgradeCost: 1,
    baseUnlockCost: 200,
    baseRateStep: 2,
  },

  // src/floors/incomePanel/index.ts — how a floor's income/interval evolve as
  // it's upgraded, and the bounds its payout cycle is clamped to.
  incomePanel: {
    minIncomeIntervalSeconds: 1,
    maxIncomeIntervalSeconds: 3600,
    upgradesPerIntervalHalving: 10,
    upgradeCostGrowth: 1.3,
    // steeper growth for floors whose natural interval already exceeds
    // maxIncomeIntervalSeconds (see Floor.aboveCapTier) — offsets them
    // otherwise earning far more than their level was meant to
    upgradeCostGrowthAboveCap: 1.6,
  },

  // src/floors/upgradeButton/index.ts's CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    crit: { chance: 0.05, multiplier: 5 },
    mega: { chance: 0.01, multiplier: 25 },
    ultra: { chance: 0.001, multiplier: 125 },
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Sale" boost.
  sale: {
    durationMs: 15_000,
    // hud/boostMenu's own cost is priced off floorIncomePerSecond times this
    // many assumed clicks, halved (see getSaleBoostCost)
    assumedClicks: 10,
    // per-click payout multiplier applied only while a sale is active
    incomeMultiplier: 2,
  },

  // src/hud/boostMenu/index.ts — one-time paid boosts.
  boostMenu: {
    boostAllSecondsCost: 5, // "Boost all" costs this many seconds of current income
  },

  // src/hud/upgradeMenu/index.ts — per-floor worker/office-upgrade pricing.
  upgradeMenu: {
    workerBasePriceFloor1: 100, // floor 1's unlockCost is always 0, needs its own base
    managerMinUpgradeCount: 50, // a floor must be upgraded this many times to hire a manager
  },

  // src/floors/incomePanel/index.ts's officeUpgradeSpeedMultiplier — each of
  // office chairs / office supplies / a manager doubles a floor's speed once
  // owned; all three stack multiplicatively (up to 8x total).
  officeUpgrades: {
    speedMultiplierPerUpgrade: 2,
  },

  // src/hud/corporationBoostMenu/economy.ts — corporation-wide modifiers.
  corporation: {
    // sqrt(log10(amount)) * this rate — the one shared "$ amount -> a small,
    // steadily-growing global-boost %" conversion, reused by a company's own
    // size-based baseline contribution and investInMarket's own gain
    baseModifierRate: 0.5,
    // cost to open any minigame: this many seconds of combined company income/sec
    minigameEntrySecondsCost: 10,
    // "Invest in the market": % of a company's hold-start balance drained per press
    investPercent: 0.1,
  },

  // Minigame reward rates — each banks straight into corporationBoostMenu's
  // matching modifier % (see economy.ts's addMarketInfluencePercent/
  // addSecuredAssetsPercent/addTaxRebatePercent/addAssetsMovedPercent), 1:1,
  // no leverage/cap. Keep these roughly proportionate to each other so no one
  // minigame is a strictly better use of the same entry cost than another.
  minigames: {
    // hud/pressConferenceGame — "Hold press conference" (Market Influence %)
    pressConference: {
      ambientInfluencePercentPerSecond: 0.05,
      goodHitInfluencePercent: 0.1,
    },
    // hud/liquidateAssetsGame — "Avoid market drop" (Secured Assets %)
    liquidateAssets: {
      ambientInfluencePercentPerSecond: 0.05,
      greenLineInfluencePercent: 0.1,
    },
    // hud/payTaxes — "Declare Taxes" (Tax Rebate %)
    payTaxes: {
      taxRebatePercentPerSecond: 0.05,
    },
    // hud/taxHavenGame — "Tax Haven" (Assets Moved %)
    taxHaven: {
      assetsMovedPercentPerSecond: 0.05,
    },
  },
} as const;
