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
  // interval only doubles. incomeGrowthFactor is deliberately equal to that
  // doubling (2) — NOT bigger — so a fresh, un-upgraded floor's base $/s is flat
  // across every floor level within a building; only accumulated upgrades (and
  // switching to a whole new, 1000x-richer building) grow $/s from there.
  // Previously this was 3 (a 1.5x-per-floor $/s runaway on floor depth ALONE),
  // which let endlessly climbing one building's floors always out-earn buying a
  // new building by an ever-widening margin — buildings stopped mattering once
  // a single building got tall enough. Keep this <= 2 (the interval-doubling
  // factor) so that snowball never comes back.
  floors: {
    baseIncomeAmount: 1,
    incomeGrowthFactor: 2,
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
    // "chain crit" — an extra roll on top of an already-landed crit/mega/ultra
    // (see rollCritUpgrade): applies that same tier's upgrade to the next floor
    // too, then has chainContinueChance to keep going up the building one floor
    // at a time
    chainChance: 0.05,
    chainContinueChance: 0.5,
    // "boost crit" — a separate, independent roll (not a tier: no free-upgrade
    // multiplier, its reward is a free worker boost instead) checked only if
    // no crit/mega/ultra tier landed on this same click
    boostChance: 0.1,
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

  // src/floors/upgradeButton/index.ts — the purchasable "Work overtime" boost.
  // Each free click during the event adds a tick (crit-scaled, see
  // CRIT_TIER_CONFIG) to the floor's own overtime gauge (incomePanel.ts).
  overtime: {
    durationMs: 15_000,
    tickGoal: 1000, // base goal for a floor with no permanent crit tier yet
    // a floor's CURRENT permanent crit tier raises its own gauge's goal further
    // (multiplies the base tickGoal above) — a higher tier already earns more
    // per tick, so its own gauge should take proportionally longer to fill
    tickGoalMultiplierByTier: {
      crit: 2,
      mega: 3,
      ultra: 4,
    },
    // once the 15s window ends, the gauge doesn't snap back to normal right
    // away — it ticks back down from wherever it ended toward 0 first, at this
    // fixed rate (1 tick per this many ms)
    drainMsPerTick: 500,
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
    // sqrt(log10(amount)) * this rate — the shared "$ amount -> a small,
    // steadily-growing global-boost %" conversion a company's own
    // size-based baseline contribution uses (see getCompanyBaseModifierPercent)
    baseModifierRate: 0.5,
    // cost to open any minigame: this many seconds of combined company income/sec
    minigameEntrySecondsCost: 10,
  },

  // Minigame reward rates — each banks straight into corporationBoostMenu's
  // matching modifier % (see economy.ts's addMarketInfluencePercent/
  // addSecuredAssetsPercent/addTaxRebatePercent), 1:1,
  // no leverage/cap. Keep these roughly proportionate to each other so no one
  // minigame is a strictly better use of the same entry cost than another.
  minigames: {
    // hud/pressConferenceGame — "Hold press conference" (Market Influence %)
    pressConference: {
      ambientInfluencePercentPerSecond: 0.05,
      goodHitInfluencePercent: 0.01,
    },
    // hud/liquidateAssetsGame — "Avoid market drop" (Secured Assets %)
    liquidateAssets: {
      ambientInfluencePercentPerSecond: 0.05,
      greenLineInfluencePercent: 0.01,
    },
    // hud/payTaxes — "Declare Taxes" (Tax Rebate %)
    payTaxes: {
      taxRebatePercentPerSecond: 0.05,
    },
  },
} as const;
