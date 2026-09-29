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
    baseRateStep: 2,
  },

  // src/buildings/index.ts — purchase prices only; floor scaling lives in floors.
  buildings: {
    basePrice: 125_000_000_000,
  },

  // src/floors/incomePanel/index.ts — how a floor's income/interval evolve as
  // it's upgraded, and the bounds its payout cycle is clamped to.
  incomePanel: {
    minIncomeIntervalSeconds: 0.5,
    maxIncomeIntervalSeconds: 1,
    upgradeSpeedLevelScale: 20,
    upgradeMilestoneStep: 10,
    upgradePriceLevelScale: 3,
  },

  // src/floors/upgradeButton/index.ts's CRIT_TIER_CONFIG — odds + free-upgrade/
  // sale-payout/permanent-rate multiplier per tier (color/label are cosmetic,
  // not balance, and stay defined alongside CRIT_TIER_CONFIG itself).
  crit: {
    ...FEATURED_CRIT_BALANCE,
    ...PROC_CRIT_BALANCE,
    crit: { chance: 0.08, multiplier: 5 },
    mega: { chance: 0.015, multiplier: 25 },
    ultra: { chance: 0.001, multiplier: 125 },
    // gateway roll for the whole "special crit" (chain/boost/bounce/
    // explosion/booty/upgrade) system: checked ONCE per landed crit/mega/
    // ultra, before any of the individual proc chances (src/critBalance) are even
    // rolled — a miss here means NONE of them get a chance to land at all
    // this time, silently (see rollCrit in shared/critTypes). A hit just
    // opens the door to the existing independent-roll-then-cap-at-2 logic,
    // it doesn't guarantee a proc actually lands
    specialCritGatewayChance: 0.25,
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

  // src/floors/eventProcs — every event button below (Boost, Hunt, ...) shares
  // one pool: an event only lands on a crit, taking its special-crit slot
  // instead of the piggyback procs, and none can land again until this long
  // after it has fully played out
  eventProcs: {
    cooldownMs: 30_000,
  },

  // src/floors/boostEvent — the rare "Boost" event button. A crit carrying it
  // arms it once clicked; clicking it freezes the screen, streams coins into
  // one random on-screen worker (or manager) below the top crit tier, and
  // promotes it one crit tier (x5 -> x25 -> x125, see CRIT_TIER_CONFIG): while
  // boosted it multiplies its floor's speed by that tier's multiplier.
  boostEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/unionEvent — the rare "Union" event button, only on a floor with
  // 2+ workers. Clicking it streams coins from the floor's other workers into
  // its manager (or a random worker) not yet at the top tier; the merged
  // workers leave and it gains one perma tier per merged worker plus their
  // own perma tiers, merging only as many as it needs to max out.
  unionEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/kickbackEvent — the rare "Kickback" event: its crit's click
  // streams coins from a random 1..maxParticipants of the on-screen workers and
  // managers into the total, which is then multiplied by one more than how many
  // took part
  kickbackEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    // each one streams a full coin burst per tick; more overflows the coin pool
    maxParticipants: 3,
  },

  // src/floors/glimmerEvent — the rare "Glimmer" event: its crit's click
  // streams coins into a golden light on the left of the floor, which then
  // sweeps across it, boosting and promoting one perma tier every worker and
  // manager it passes that isn't at the top tier yet
  glimmerEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    sweepMs: 2_000,
    // then hops to the floor above or below and sweeps it right to left
    moveFloorChance: 0.5,
  },

  // src/floors/huntEvent — the rare "Hunt" event button, only armed while the
  // mouse (src/mouse) is on screen. Clicking it streams coins into the mouse
  // (same freeze/stream/sound as boostEvent), which then grows, turns red and
  // restarts its time on screen; clicking that hunted mouse gives its normal
  // boost plus a guaranteed "special crit crit" bonus tier (5x/25x/125x total
  // income, weighted by the crit tier odds, see shared/bonusTierReward).
  huntEvent: {
    // the mouse is out ~5s of every ~32.5s (src/mouse), so ~6.5x the other
    // events' 0.01 makes Hunt land about as often overall
    chance: 0.065, // per crit whose special-crit gateway hit, mouse on screen
  },

  // src/floors/swarmEvent — the rare "Swarm" event: its proc animation leaves
  // that button armed; clicking it starts a timed swarm sale where every click
  // on it pays a Sale payout from it and each of its mirrored clones
  swarmEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    durationMs: 15_000,
  },

  // src/floors/renovateEvent — the rare "Renovate" event: its crit's click
  // streams coins into that floor's "Lvl N" label, then lands one regular crit
  // tier on the floor (x5/x25/x125, weighted by the crit tier odds)
  renovateEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/upgradeEvent — the rare "Upgrade" event: its crit's click
  // streams coins into that floor's income bar, then promotes the floor's
  // permanent crit tier to the crit's tier (or one above its own); never on a
  // top-tier floor
  upgradeEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
  },

  // src/floors/unlockEvent — the rare "Unlock" event, only on a floor one or
  // two below the locked floor: its crit's click streams coins into that
  // floor's unlock price, then unlocks it for free with its own unlock crit roll
  unlockEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
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
} as const;
