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

  // src/floors/burstEvent — the rare "Burst" event: its crit's click freezes
  // the screen while its button blows out one explosion of coins and bills over
  // the whole screen; they hang there, then merge into the total, paying the
  // floor's income times its floor number
  burstEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    durationMs: 1_000, // ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500, // the last part, where the coins fly into the total
  },

  // src/floors/sprayEvent — the rare "Spray" event: like Burst, but the button
  // sprays a stream sweeping round it instead of one explosion
  sprayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 500, // how long the stream sprays
    durationMs: 1_500, // stream, ~0.3s last coin out, 0.2s hang, then the merge
    mergeMs: 500,
  },

  // src/floors/fountainEvent — the rare "Fountain" event: like Spray, but the
  // button jets the coins up so they arc over and rain down across the screen
  fountainEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 700, // how long the jet shoots
    travelMs: 700, // each coin's arc up and down
    durationMs: 2000, // jet, the last coin's arc, a short hang, then the merge
    mergeMs: 500,
  },

  // src/floors/vortexEvent — the rare "Vortex" event: like Stream, but the
  // coins pour in from every screen edge and swirl into the total
  vortexEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 900, // how long coins keep pouring in
    travelMs: 500, // each coin's swirl into the eye
  },

  // src/floors/ricochetEvent — the rare "Ricochet" event: one fat stream
  // bounces off the screen's edges 3-5 times before diving into the total,
  // paying the floor's payout once per bounce
  ricochetEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    travelMs: 500, // each coin's trip, bounces and all
  },

  // src/floors/paydayEvent — the rare "Payday" event: every on-screen worker
  // streams coins into the clicked floor's button, which fires them into the
  // total, paying the floor's payout once per worker
  paydayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    gatherMs: 700, // the workers paying into the button
    payoutMs: 700, // the button firing it all into the total
    maxWorkers: 12,
  },

  // src/floors/piggyBankEvent — the rare "Piggy Bank" event: the button streams
  // coins into a piggy bank that swells and wiggles, then bursts, showering
  // the screen with coins that merge into the total
  piggyBankEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 900, // the button filling the piggy
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    rewardMultiplier: 3, // on top of the floor's income times its floor number
  },

  // src/floors/jackpotReelsEvent — the rare "Jackpot Reels" event: the button
  // streams coins into three slot reels, which stop one by one with a slam;
  // it pays the floor's income times its floor number times the reels' sum
  jackpotReelsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spinMs: 1_000, // until the first reel stops
    stopGapMs: 400, // between one reel stopping and the next
    holdMs: 700, // after the last stop, before the reels burst into coins
    durationMs: 1_000, // after the burst: ~0.3s blast out, 0.2s hang, then the merge
    mergeMs: 500,
    // each reel's multipliers and how often it stops on them
    symbols: [
      { value: 1, weight: 60 },
      { value: 2, weight: 30 },
      { value: 5, weight: 10 },
    ],
    matchBonus: 3, // the sum's multiplier when all three reels match
  },

  // src/floors/chainPayEvent — the rare "Chain Pay" event: a coin stream hops
  // from the button through on-screen workers into the total; the n-th worker
  // reached pays the floor's payout n times over
  chainPayEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    hopMs: 450, // each hop from one stop to the next
    payoutMs: 700, // the last worker firing it all into the total
    maxWorkers: 8,
  },

  // src/floors/downpourEvent — the rare "Downpour" event: coins rain down from
  // above the screen and pool along its bottom, then drain into the total
  downpourEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 800, // how long it keeps raining
    travelMs: 500, // each drop's fall
    mergeMs: 500, // the pool draining into the total
    rewardMultiplier: 2, // on top of the floor's income times its floor number
  },

  // src/floors/magnetEvent — the rare "Magnet" event: a big magnet yanks coins
  // in from all over the screen, then flings them into the total, paying the
  // floor's income times its floor number once per floor on screen
  magnetEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 700, // how long coins keep popping up
    travelMs: 600, // each coin's pull into the magnet
    mergeMs: 500, // the fling into the total
  },

  // src/floors/spilloverEvent — the rare "Spillover" event: the button pours
  // coins into the income bar until it brims over and spills into the total;
  // pays the full bar plus bonusPayouts more, and restarts the bar
  spilloverEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    fillMs: 1_000, // the button filling the bar
    spillMs: 800, // the overflow spilling into the total
    bonusPayouts: 2,
  },

  // src/floors/constellationEvent — the rare "Constellation" event: a light
  // links several on-screen workers into a star, then each flares and climbs
  // one perma tier
  constellationEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    appearMs: 500, // the stars twinkling up over the workers
    linkMs: 1_000, // the light drawing the whole star
    flareGapMs: 220, // between one star flaring and the next
    maxStars: 7, // at least 3 promotable workers in view are needed
  },

  // src/floors/streamEvent — the rare "Stream" event: like Spray, but the coins
  // flow as a river winding and looping across the screen into the total; the
  // button pours until its head arrives, so the whole event lasts ~2x travelMs
  streamEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    travelMs: 8_00, // each coin's trip down the river
  },

  // src/floors/trailsEvent — the rare "Trails" event: like Stream, but many
  // short streams leave the button one after another, each winding into the total
  trailsEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    spreadMs: 900, // from the first trail leaving the button to the last
    pourMs: 200, // how long the button pours each trail
    travelMs: 400, // each coin's trip down its trail
  },

  // src/floors/drawEvent — the rare "Draw" event: like Spray, but the stream
  // draws the crit's own 5/25/125 and the payout is multiplied by it
  drawEvent: {
    chance: 0.01, // per crit whose special-crit gateway hit
    streamMs: 600, // how long the number takes to draw
    durationMs: 1_600, // stream, ~0.3s last coin out, 0.4s hang, then the merge
    mergeMs: 500,
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
