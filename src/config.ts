// Central balance sheet for every number that feeds into "how much money is being
// made" — per-floor income growth, upgrade pricing, crit-tier odds/payouts, sale
// boosts, and corporation-wide modifiers. This is
// the one place to tune when rebalancing income across methods so they stay
// proportionate to each other — nothing else in the codebase should hardcode a
// balance number already owned here; add new tunable values as new fields instead
// of a fresh standalone constant elsewhere. Pure data whose only imports are the
// equally pure crit tunables in src/crits/config.ts —
// safe for any module (including circular-import-sensitive ones like
// floors/index.ts) to read.
import { CRIT_CONFIG } from "./crits/config";

export const CONFIG = {
  // Floor income and interval scale together up to the starting interval limit.
  // With a 1s limit, floors share a base rate; buildings scale the whole economy.
  floors: {
    floorEconomyMultiplierPerBuilding: 1_000,
    baseIncomeAmount: 1,
    incomeGrowthFactor: 2,
    baseIncomeIntervalSeconds: 1,
    baseUpgradeCost: 2,
    baseUnlockCost: 200,
    unlockCostGrowthFactor: 2,
    // a floor's price is fixed by its position, never by earnings: at least
    // unlockIncomeSeconds of what the floors below earn at the level a building
    // is expected to reach by then (unlockLevelsPerFloor per floor up)
    unlockIncomeSeconds: 20,
    unlockLevelsPerFloor: 20,
    baseRateStep: 2,
  },

  // src/buildings/index.ts — the next building costs this many minutes of a
  // fully upgraded building's income (every floor at maxFloorLevel with its
  // office chairs, supplies and manager); floor scaling lives in floors.
  // Each building after scales by floorEconomyMultiplierPerBuilding
  buildings: {
    unlockMinutesAtMax: 600,
    // the next building can only be bought once the newest one is maxed out
    requireMaxedBuilding: true,
  },

  // src/floors/incomePanel/index.ts — how a floor's income/interval evolve as
  // it's upgraded, and the bounds its payout cycle is clamped to.
  incomePanel: {
    minIncomeIntervalSeconds: 0.5,
    maxIncomeIntervalSeconds: 1,
    upgradeSpeedLevelScale: 20,
    upgradeMilestoneStep: 10,
    // an upgrade costs baseUpgradeCost seconds of its floor's own income, a
    // span growing by this share per level: ~1000s at level 1000, so a building
    // takes about 9 hours of steady buying to max out
    upgradePaybackGrowth: 0.5,
    // a floor stops taking upgrades here; Sales and Overtime still play on it
    maxFloorLevel: 1000,
    // a floor at maxFloorLevel earns this many times its income, so finishing
    // a building pays far more than buying the next one early
    maxedFloorIncomeMultiplier: 10,
  },

  // every crit's own blocks: crit, specialCrits, revealStage, badgeCapsule
  // and one per animated crit (src/crits/config.ts)
  ...CRIT_CONFIG,

  // src/floors/upgradeButton/index.ts — the purchasable "Sale" boost.
  sale: {
    durationMs: 15_000,
  },

  // src/renovation — bulk "Renovate floors" purchases replay one upgrade at a
  // time, so a huge balance's plan is capped per floor
  renovation: {
    maxUpgradesPerFloor: 100_000,
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Work overtime" boost.
  // Each free click during the event adds a tick (crit-scaled, see
  // CRIT_TIER_CONFIG) to the floor's own overtime gauge (incomePanel.ts).
  overtime: {
    // ticks to fill the gauge, by the floor's CURRENT permanent crit tier:
    // filling it promotes the floor a tier (none -> crit -> mega -> ultra)
    tickGoalByTier: {
      none: 100,
      crit: 150,
      mega: 200,
      ultra: 200,
    },
  },

  // src/hud/upgradeMenu/index.ts — per-floor worker/office-upgrade pricing.
  upgradeMenu: {
    workerBasePriceFloor1: 100,
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
  },
} as const;
