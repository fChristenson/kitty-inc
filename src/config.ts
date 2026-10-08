// Central balance sheet for every number that feeds into "how much money is being
// made" — per-floor income growth, upgrade pricing, crit-tier odds/payouts, sale
// boosts, and corporation-wide modifiers. This is
// the one place to tune when rebalancing income across methods so they stay
// proportionate to each other — nothing else in the codebase should hardcode a
// balance number already owned here; add new tunable values as new fields instead
// of a fresh standalone constant elsewhere. Pure data whose only imports are the
// equally pure src/critBalance files (every proc's odds, grouped per file) —
// safe for any module (including circular-import-sensitive ones like
// floors/index.ts) to read.
import { FEATURED_CRIT_BALANCE } from "./critBalance";
import { PROC_CRIT_BALANCE } from "./critBalance/procs";
import { ANIMATED_EVENT_CONFIG } from "./animatedEventConfig";

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

  // src/floors/upgradeButton/index.ts's CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    ...FEATURED_CRIT_BALANCE,
    ...PROC_CRIT_BALANCE,
    crit: { chance: 0.08, multiplier: 3 },
    mega: { chance: 0.015, multiplier: 7 },
    ultra: { chance: 0.001, multiplier: 10 },
    // a boosted perma worker speeds its floor up by its tier's multiplier to
    // this power: 0.43 gives x1.6/x2.3/x2.7
    permaBoostExponent: 0.43,
    // one reward payout (payout crits, cash events) pays this many seconds of
    // its floor's income; a bar cycle is under a second, too small to feel
    payoutSeconds: 30,
    // a floor unlocked for free starts at this share of the level below it,
    // so a free floor is still worth having once floors are cheap
    freeFloorLevelShare: 0.5,
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the individual proc chances (src/critBalance) are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in shared/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.15,
    bonusTierGatewayChance: 0.01,
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Sale" boost.
  sale: {
    durationMs: 15_000,
  },

  // src/renovation — bulk "Renovate floors" purchases replay one upgrade at a
  // time, so a huge balance's plan is capped per floor
  renovation: {
    maxUpgradesPerFloor: 100_000,
  },

  // shared/critTypes' rollCrit — what a landed crit's special slot carries
  // once its gateway hits: exactly one of these, each with its chance (they
  // add up to 1). One that can't play (an animated crit cooling down) is a
  // badge crit instead
  specialCrits: {
    // a badge crit: the featured and other special crits in src/critBalance
    badgeCrit: {
      chance: 0.1,
    },
    // an animated event (src/animatedEventConfig.ts); none can land again
    // until cooldownMs after one has fully played out
    animatedCrit: {
      chance: 0.25,
      cooldownMs: 30_000,
    },
    // the crit also landing on the floor above / below
    critUp: {
      chance: 0.04,
    },
    critDown: {
      chance: 0.04,
    },
    // a second crit number (picked by the tiers' own odds) smashing into it,
    // paying their sum
    mergeCrit: {
      chance: 0.04,
    },
    // its number's characters firing into its floor's bar
    rapidFireCrit: {
      chance: 0.04,
    },
    // the crit moments: once its number has slammed in, it pinballs between
    // the bars in view, snowballs down them (growing a step a bar), is
    // juggled onto them, stomps onto all of them or rains onto them, each
    // other bar it hits landing levels
    pinballCrit: {
      chance: 0.03,
    },
    snowballCrit: {
      chance: 0.03,
    },
    juggleCrit: {
      chance: 0.03,
    },
    stompCrit: {
      chance: 0.03,
    },
    rainCrit: {
      chance: 0.03,
    },
    // it stamps down onto each bar leaving a glowing print, zips across each
    // like a sewing machine needle, is catapulted off the top to crash down
    // through them all, or whirls into a tornado flinging a copy onto each
    stampCrit: {
      chance: 0.03,
    },
    zipCrit: {
      chance: 0.03,
    },
    catapultCrit: {
      chance: 0.03,
    },
    tornadoCrit: {
      chance: 0.03,
    },
    // it flings copies of itself off its orbit, pulls a train of copies down
    // across the bars, or is blown into bubbles that pop on them
    orbitCrit: {
      chance: 0.03,
    },
    trainCrit: {
      chance: 0.03,
    },
    bubbleCrit: {
      chance: 0.03,
    },
    // a bolt cracking down from the sky and chaining through the bars, each
    // one it strikes paying out double
    lightningCrit: {
      chance: 0.03,
    },
    // a meteor slamming into one bar in view, paying it out x5
    meteorCrit: {
      chance: 0.03,
    },
    // a black hole swallowing the coins off every bar in view, then
    // collapsing and flinging them back, each paying out double
    blackHoleCrit: {
      chance: 0.03,
    },
    // a badge crit whose badge turns shimmer (landed 10+ times) or glitter
    // (100+) foil
    badgeShimmer: {
      chance: 0.03,
    },
    badgeGlitter: {
      chance: 0.01,
    },
  },

  // src/floors/revealStage — the stage every reveal event plays its reveal on
  revealStage: {
    windUpMs: 220, // the screen leaning in and rumbling before each whip
    slideMs: 420, // the whip pan in over the floors, and back out
  },

  // src/floors/badgeCapsule — the mystery badge capsule a building earns once
  // every floor is at the level cap with every upgrade bought, opened from its
  // marker on the city map: on the reveal stage, the capsule drops in and rolls
  // until a wisp dives into its seam and it pops open on a badge never landed,
  // which then lands on the ground floor
  badgeCapsule: {
    dropMs: 350, // the capsule falling onto the light
    rolls: 1, // back-and-forth rolls before the wisp dives
    rollMs: 1_200, // one roll to one side, over to the other and back
    flyMs: 750, // the wisp swooping in to hover over it
    diveMs: 220, // the wisp dipping to tap its seam
    warpMs: 420, // the tapped capsule wobbling and swelling until it bursts
    growMs: 450, // the badge popping out
    holdMs: 900, // the badge and its title
  },

  // src/floors/upgradeButton/index.ts — the purchasable "Work overtime" boost.
  // Each free click during the event adds a tick (crit-scaled, see
  // CRIT_TIER_CONFIG) to the floor's own overtime gauge (incomePanel.ts).
  overtime: {
    tickGoal: 125, // base goal for a floor with no permanent crit tier yet
    // a floor's CURRENT permanent crit tier raises its own gauge's goal further
    // (multiplies the base tickGoal above) — a higher tier already earns more
    // per tick, so its own gauge should take proportionally longer to fill
    tickGoalMultiplierByTier: {
      crit: 2,
      mega: 4,
      ultra: 4,
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

  // every animated event's own block (src/animatedEventConfig.ts)
  ...ANIMATED_EVENT_CONFIG,
} as const;
