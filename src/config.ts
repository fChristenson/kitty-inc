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
  // A floor's interval runs from baseIncomeIntervalSeconds on the ground floor
  // to topIncomeIntervalSeconds on the top one; its $/s, upgrade and unlock
  // prices grow by the same factor. Buildings scale the whole economy.
  floors: {
    floorEconomyMultiplierPerBuilding: 1_000,
    floorsPerBuilding: 20,
    baseIncomeAmount: 1,
    baseIncomeIntervalSeconds: 1,
    topIncomeIntervalSeconds: 3_600,
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

  // the random spawns that wander onto the screen on their own every so
  // often, each tapped for a reward. While none of a kind is out, it rolls
  // every rollEveryMs and spawns with procChance, but not until cooldownMs
  // after the last one left
  randomSpawns: {
    // across every kind: at most `count` spawn within any windowMs
    gate: { count: 2, windowMs: 15_000 },
    // src/spawn/mouse — a mouse running about a random unlocked floor
    mouse: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // how long it runs about before leaving, pulsing over its last pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
    },
    // src/spawn/bubbles — bubbles blown up the screen: tap one to pop it for
    // what's inside
    bubbles: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // how long they float before vanishing, pulsing over its last pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
      count: [3, 7],
      // a bubble's odds of holding a crit number, a coin or a badge
      contentOdds: { tier: 0.45, coin: 0.4, badge: 0.15 },
    },
    // src/spawn/wisp — a wisp dashing across the screen, shedding glitter: a
    // swipe sweeps it up into the total
    wisp: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // its dash, then how long the glitter lingers, pulsing over its last
      // pulseMs
      dashMs: 1_600,
      // longer paths (loops, spirals, rows) at the dash's speed, capped here
      maxDashMs: 2_800,
      durationMs: 6_000,
      pulseMs: 2_000,
      specks: 380,
      // all its glitter swept up pays this many seconds of the company's income
      rewardSeconds: 30,
    },
    // src/spawn/coin — black holes opening on the floors, a coin hovering over
    // each: a tap flips one up and it's sucked into the total
    coin: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // how long each hovers before sinking back, pulsing over its last
      // pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
      count: [3, 7] as [number, number],
      // all of them tapped pay this many seconds of the company's income
      rewardSeconds: 20,
    },
    // src/spawn/fireflies — a flock of little wisps drifting along a floor:
    // a swipe catches them, each zipping onto a worker, promoting it
    fireflies: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // how long the flock stays, flying in and meandering over the floor,
      // blinking over its last pulseMs
      durationMs: 6_000,
      pulseMs: 2_000,
      count: [12, 16] as [number, number],
    },
    // src/spawn/gusher — a vent fizzing at the bottom of the screen: a tap
    // blows it into a stream of coins and cash flowing into the total
    gusher: {
      rollEveryMs: 5_000,
      procChance: 0.1,
      cooldownMs: 5_000,
      // how long it fizzes before vanishing, blinking over its last pulseMs
      durationMs: 6_000,
      pulseMs: 2_000,
      coins: 320,
      // all its coins landed pay this many seconds of the company's income
      rewardSeconds: 30,
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
