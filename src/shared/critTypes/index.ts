// The one shared definition of "what crit tiers exist" — CRIT_TIER_CONFIG,
// CritTier, and every pure tier-comparison/ordering helper live here so any
// module (floors/upgradeButton's stateful roll/consume logic, floorInteractions,
// critCelebration, background/cityMap, gameState's own Floor type, main.ts) can
// read the exact same canonical data without going through floors/'s facade or
// duplicating a plain string union to dodge a circular import (gameState.ts
// used to do exactly that for Floor.critMultiplierTier before this move).
//
// Adding a new tier is meant to be a two-line change: add its entry to
// CRIT_TIER_CONFIG below, and its name to CRIT_TIER_ORDER (rarest-first) —
// every consumer (rollCritUpgrade's roll cascade, rollFloorBuyCrit,
// nextCritTier's promotion chain) already reads that ordering generically
// instead of a hardcoded if/else per tier.
import type { Floor } from "../../gameState";
import type { ImageName } from "../../loadAssets";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";

export type CritTier = "crit" | "mega" | "ultra";

export interface CritTierDef {
  chance: number; // rolled once per completed upgrade click, see rollCritUpgrade
  multiplier: number;
  color: string;
  label: string; // canonical "xN" text — shared by the button AND the flash text
}

// chance/multiplier per tier live in src/config.ts (CONFIG.crit) — only the
// cosmetic color/label stay here
export const CRIT_TIER_CONFIG: Record<CritTier, CritTierDef> = {
  crit: {
    ...CONFIG.crit.crit,
    color: COLOR.purple,
    label: "x5",
  },
  mega: {
    // ~1 in 100 upgrade clicks — deliberately much rarer than crit's so it reads
    // as a genuine jackpot moment, not just a bigger version of the common crit
    ...CONFIG.crit.mega,
    color: COLOR.starYellow,
    label: "x25",
  },
  ultra: {
    // rarer still than mega's — the true jackpot-of-jackpots moment
    ...CONFIG.crit.ultra,
    color: COLOR.red,
    label: "x125",
  },
};

// rarest-first — the single order rollCritUpgrade/rollFloorBuyCrit iterate to
// decide which tier (if any) a roll lands on; a FUTURE tier just needs an
// entry added to CRIT_TIER_CONFIG above and its name inserted here at the
// right rarity position, no roll-cascade code to touch
export const CRIT_TIER_ORDER: CritTier[] = ["ultra", "mega", "crit"];

// back-compat convenience re-exports for callers that just want one tier's
// multiplier — still sourced from CRIT_TIER_CONFIG above, never a separate
// hardcoded number
export const CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.crit.multiplier;
export const MEGA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.mega.multiplier;
export const ULTRA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.ultra.multiplier;

// "chain crit" — an extra roll on top of an already-landed crit/mega/ultra (see
// upgradeButton.ts's rollCritUpgrade): applies that same tier's upgrade to the
// next floor too, then has chainContinueChance to keep going up the building
// one floor at a time
export const CHAIN_CRIT_CHANCE = CONFIG.crit.chainChance;
export const CHAIN_CRIT_CONTINUE_CHANCE = CONFIG.crit.chainContinueChance;
// chain has no dedicated color (its celebration always uses the landed
// tier's own color instead, see critCelebration.ts's tierColor) — only a
// label, kept here for symmetry with every other proc's own exported label
export const CHAIN_CRIT_LABEL = "Chain";

// "boost crit" — another proc riding on an already-landed crit/mega/ultra (see
// rollCrit below), same as chain: instead of extra upgrades it grants a
// free worker boost. Neither proc's button EVER changes appearance on its
// own — both are invisible until the already-armed tier is actually clicked,
// only then do they reveal themselves via their own celebration flash
export const BOOST_CRIT_CHANCE = CONFIG.crit.boostChance;
export const BOOST_CRIT_COLOR = COLOR.blue;
export const BOOST_CRIT_LABEL = "Boost";

// "bounce crit" — a third piggyback proc, same shape as chain (extends the
// landed tier's free-upgrade payout floor by floor) but the walk starts from
// the BOTTOM of the building (floor 0) and climbs up, instead of starting at
// the floor that actually crit — see floorInteractions.ts's applyChainCrit
// call with startIndex -1
export const BOUNCE_CRIT_CHANCE = CONFIG.crit.bounceChance;
export const BOUNCE_CRIT_CONTINUE_CHANCE = CONFIG.crit.bounceContinueChance;
export const BOUNCE_CRIT_LABEL = "Bounce";

// "explosion crit" — a fourth piggyback proc, same shape as chain again, but
// spreads BOTH directions (up AND down) from the floor that actually crit,
// instead of only upward — see floorInteractions.ts's applyExplosionCrit
export const EXPLOSION_CRIT_CHANCE = CONFIG.crit.explosionChance;
export const EXPLOSION_CRIT_CONTINUE_CHANCE =
  CONFIG.crit.explosionContinueChance;
export const EXPLOSION_CRIT_LABEL = "Boom";

// "booty crit" — a fifth piggyback proc, a flat one-time effect (not
// tier-scaled) like boost: doubles the CURRENTLY ACTIVE company's total
// income once, applied by floorInteractions.ts
export const BOOTY_CRIT_CHANCE = CONFIG.crit.bootyChance;
export const BOOTY_CRIT_COLOR = COLOR.gold;
export const BOOTY_CRIT_LABEL = "Booty";

// "upgrade crit" — a sixth piggyback proc, a flat one-time effect (not
// tier-scaled) like boost/booty: permanently promotes the affected floor's
// (or, for a building-unlock crit, every floor in that building's) own
// critMultiplierTier one step further — applied by floorInteractions.ts/
// main.ts using nextCritTier (defined further down this file)
export const UPGRADE_CRIT_CHANCE = CONFIG.crit.upgradeChance;
export const UPGRADE_CRIT_COLOR = COLOR.cyan;
export const UPGRADE_CRIT_LABEL = "Upgrade";

// "peppermint crit" — a seventh piggyback proc, a flat one-time effect (not
// tier-scaled) like booty/upgrade: promotes every OTHER unlocked floor in the
// building one tier step at once (same nextCritTier promotion upgrade crit
// uses, just applied to alternating floors building-wide) — applied by
// floorInteractions.ts
export const PEPPERMINT_CRIT_CHANCE = CONFIG.crit.peppermintChance;
export const PEPPERMINT_CRIT_COLOR = COLOR.peppermintPink;
export const PEPPERMINT_CRIT_LABEL = "Peppermint";

// "heavenly crit" — an eighth piggyback proc, the single biggest reward in the
// game: unlocks every remaining floor in the building for free, promotes
// every floor (including newly-unlocked ones) straight to the strongest tier,
// then grants that tier's own free-upgrade batch to every floor — applied by
// floorInteractions.ts
export const HEAVENLY_CRIT_CHANCE = CONFIG.crit.heavenlyChance;
export const HEAVENLY_CRIT_COLOR = COLOR.heavenlyGold;
export const HEAVENLY_CRIT_LABEL = "Heavenly";

// "pair"/"three of a kind"/"four of a kind"/"full house" crits — four more
// flat, not-tier-scaled piggyback procs (same shape as booty/upgrade/
// peppermint/heavenly): each promotes a FIXED number of floors' (or, at
// building-unlock scope, buildings') own permanent crit tier one step,
// starting at whatever just landed the proc and walking upward — auto-
// unlocking any locked floor/building in its path for free instead of
// stopping early if there aren't enough already-unlocked ones yet (same as
// applyChainCrit's own walk, just a fixed count instead of a probabilistic
// continue-chance). POKER_HAND_CRIT_COUNTS is the ONE place that "how many"
// number for each is ever named — every consumer (floorInteractions.ts's
// per-click/floor-unlock reward, main.ts's building-unlock reward) reads it
// from here instead of re-hardcoding it
export const POKER_HAND_CRIT_COUNTS = {
  pair: 2,
  threeOfAKind: 3,
  fourOfAKind: 4,
  fullHouse: 5,
} as const;

export const PAIR_CRIT_CHANCE = CONFIG.crit.pairChance;
export const PAIR_CRIT_COLOR = COLOR.pairBlue;
export const PAIR_CRIT_LABEL = "Pair";

export const THREE_OF_A_KIND_CRIT_CHANCE = CONFIG.crit.threeOfAKindChance;
export const THREE_OF_A_KIND_CRIT_COLOR = COLOR.threeOfAKindGreen;
export const THREE_OF_A_KIND_CRIT_LABEL = "Three of a Kind";

export const FOUR_OF_A_KIND_CRIT_CHANCE = CONFIG.crit.fourOfAKindChance;
export const FOUR_OF_A_KIND_CRIT_COLOR = COLOR.fourOfAKindIndigo;
export const FOUR_OF_A_KIND_CRIT_LABEL = "Four of a Kind";

export const FULL_HOUSE_CRIT_CHANCE = CONFIG.crit.fullHouseChance;
export const FULL_HOUSE_CRIT_COLOR = COLOR.fullHouseCrimson;
export const FULL_HOUSE_CRIT_LABEL = "Full House";

// "tick tock crit" — a flat, not-tier-scaled proc: instantly grants every
// unlocked floor 2 extra payouts' worth of income at its own current rate,
// without touching its fill-cycle progress (floor.lastCollectedAt is never
// changed) — the bar keeps ticking from exactly where it was, it just also
// gets 2 payouts credited on top right now. Reuses the clock icon already
// shipped for hud/boostMenu's "Work overtime" menu entry
export const TICK_TOCK_CRIT_CHANCE = CONFIG.crit.tickTockChance;
export const TICK_TOCK_CRIT_COLOR = COLOR.teal;
export const TICK_TOCK_CRIT_LABEL = "Tick Tock";

// "Chair Giveaway"/"Supplies Giveaway" crits — two more flat, not-tier-scaled procs:
// grant the floor being upgraded its one-time office chairs/supplies
// purchase (see hud/upgradeMenu's buyOfficeChairs/buyOfficeSupplies) for
// free, if it doesn't already have it. Reuse the icons already shipped for
// those exact menu entries
export const CHAIR_GIVEAWAY_CRIT_CHANCE = CONFIG.crit.chairGiveawayChance;
export const CHAIR_GIVEAWAY_CRIT_COLOR = COLOR.chairGiveawayBrown;
export const CHAIR_GIVEAWAY_CRIT_LABEL = "Chair Giveaway";

export const SUPPLIES_GIVEAWAY_CRIT_CHANCE = CONFIG.crit.suppliesGiveawayChance;
export const SUPPLIES_GIVEAWAY_CRIT_COLOR = COLOR.suppliesGiveawayLime;
export const SUPPLIES_GIVEAWAY_CRIT_LABEL = "Supplies Giveaway";

// "winter sale"/"spring sale"/"summer sale"/"autumn sale" crits — four more
// flat, not-tier-scaled procs, all sharing the exact same reward (only the
// season/icon/label/color differ): permanently cuts every unlocked floor's
// own upgrade AND worker/office chairs/supplies/manager costs by 25%, for
// the WHOLE building the roll happened in (see floorInteractions.ts's
// applySeasonalSaleCrit and hud/upgradeMenu's getFloorPrice, which folds
// Floor.priceDiscountMultiplier into every worker-derived cost).
// SEASONAL_SALE_DISCOUNT_MULTIPLIER is the ONE place "25% off" is ever named
export const SEASONAL_SALE_DISCOUNT_MULTIPLIER =
  1 - CONFIG.crit.seasonalSaleDiscount;

export const WINTER_SALE_CRIT_CHANCE = CONFIG.crit.winterSaleChance;
export const WINTER_SALE_CRIT_COLOR = COLOR.winterSaleIceBlue;
export const WINTER_SALE_CRIT_LABEL = "Winter Sale";

export const SPRING_SALE_CRIT_CHANCE = CONFIG.crit.springSaleChance;
export const SPRING_SALE_CRIT_COLOR = COLOR.springSalePink;
export const SPRING_SALE_CRIT_LABEL = "Spring Sale";

export const SUMMER_SALE_CRIT_CHANCE = CONFIG.crit.summerSaleChance;
export const SUMMER_SALE_CRIT_COLOR = COLOR.summerSaleOrange;
export const SUMMER_SALE_CRIT_LABEL = "Summer Sale";

export const AUTUMN_SALE_CRIT_CHANCE = CONFIG.crit.autumnSaleChance;
export const AUTUMN_SALE_CRIT_COLOR = COLOR.autumnSaleAmber;
export const AUTUMN_SALE_CRIT_LABEL = "Autumn Sale";

// "halloween sale" crit — same shape as the 4 seasonal sales above, but its
// own steeper discount (its own multiplier, never reuses
// SEASONAL_SALE_DISCOUNT_MULTIPLIER) — see floorInteractions.ts's
// applySeasonalSaleCrit, which takes the discount multiplier as a param so
// this and the 4 seasonal sales can share the one reward function
export const HALLOWEEN_SALE_DISCOUNT_MULTIPLIER =
  1 - CONFIG.crit.halloweenSaleDiscount;

export const HALLOWEEN_SALE_CRIT_CHANCE = CONFIG.crit.halloweenSaleChance;
export const HALLOWEEN_SALE_CRIT_COLOR = COLOR.halloweenSalePurple;
export const HALLOWEEN_SALE_CRIT_LABEL = "Halloween Sale";

// "sunshine crit" — same reward as boost above (a free worker boost on
// every unlocked floor), just lasting twice as long — see floorInteractions.ts's
// applyFloorBoost, which takes the boost's own duration as a param so this
// and plain boost can share the one reward function
export const SUNSHINE_CRIT_CHANCE = CONFIG.crit.sunshineChance;
export const SUNSHINE_CRIT_COLOR = COLOR.sunshineGold;
export const SUNSHINE_CRIT_LABEL = "Sunshine";

// "snowday crit" — same reward as sunshine above (a free worker boost on
// every unlocked floor), just its own even longer duration — see
// floorInteractions.ts's applySnowdayCrit
export const SNOWDAY_CRIT_CHANCE = CONFIG.crit.snowdayChance;
export const SNOWDAY_CRIT_COLOR = COLOR.snowdayFrost;
export const SNOWDAY_CRIT_LABEL = "Snowday";

// "fast forward crit" — same reward as tick tock above (instantly credits
// every unlocked floor extra payouts' worth of income at its own current
// rate, without touching its fill-cycle progress), just a steeper multiplier
// — see floorInteractions.ts's applyFastForwardCrit
export const FAST_FORWARD_CRIT_CHANCE = CONFIG.crit.fastForwardChance;
export const FAST_FORWARD_CRIT_COLOR = COLOR.fastForwardBlue;
export const FAST_FORWARD_CRIT_LABEL = "Fast Forward";

// "frozen crit" — also no instant reward: arming this proc just marks the
// floor so that, once the crit is actually clicked, upgradeButton.ts's
// triggerFrozenCrit starts a Sale-like free-click event for
// CONFIG.crit.frozenDurationMs of real time, during which each click
// credits floorIncomePerSecond * an ultra crit's own multiplier straight to
// the player's total INSTEAD of performing the normal paid upgrade — as if
// every click were its own free ultra crit's worth of cash (see
// floorInteractions.ts's own Frozen click branch)
export const FROZEN_CRIT_CHANCE = CONFIG.crit.frozenChance;
export const FROZEN_CRIT_COLOR = COLOR.frozenIceBlue;
export const FROZEN_CRIT_LABEL = "Frozen";

// "snowball crit" — also no instant reward: arming this proc just marks the
// floor so that, once the crit is actually clicked, upgradeButton.ts's
// triggerSnowballCrit starts a Sale-like free-click event for
// CONFIG.crit.snowballDurationMs of real time, during which each click
// credits n^2 * floorIncomePerSecond (n = that click's own count) straight
// to the player's total income — same lump-sum-payout shape as Sale, just
// growing per click instead of a flat multiplier (see floorInteractions.ts's
// own Snowball click branch)
export const SNOWBALL_CRIT_CHANCE = CONFIG.crit.snowballChance;
export const SNOWBALL_CRIT_COLOR = COLOR.snowballBlue;
export const SNOWBALL_CRIT_LABEL = "Snowball";

// state for all eight piggyback procs lives here too (not upgradeButton.ts) so
// the whole "what can ride along with a landed crit" system stays in one place
const chainCrits = new WeakSet<Floor>();
const boostCrits = new WeakSet<Floor>();
const bounceCrits = new WeakSet<Floor>();
const explosionCrits = new WeakSet<Floor>();
const bootyCrits = new WeakSet<Floor>();
const upgradeCrits = new WeakSet<Floor>();
const peppermintCrits = new WeakSet<Floor>();
const heavenlyCrits = new WeakSet<Floor>();
const pairCrits = new WeakSet<Floor>();
const threeOfAKindCrits = new WeakSet<Floor>();
const fourOfAKindCrits = new WeakSet<Floor>();
const fullHouseCrits = new WeakSet<Floor>();
const tickTockCrits = new WeakSet<Floor>();
const chairGiveawayCrits = new WeakSet<Floor>();
const suppliesGiveawayCrits = new WeakSet<Floor>();
const winterSaleCrits = new WeakSet<Floor>();
const springSaleCrits = new WeakSet<Floor>();
const summerSaleCrits = new WeakSet<Floor>();
const autumnSaleCrits = new WeakSet<Floor>();
const halloweenSaleCrits = new WeakSet<Floor>();
const sunshineCrits = new WeakSet<Floor>();
const snowdayCrits = new WeakSet<Floor>();
const fastForwardCrits = new WeakSet<Floor>();
const frozenCrits = new WeakSet<Floor>();
const snowballCrits = new WeakSet<Floor>();

// call once a tier has just landed (see rollCrit below) to roll every
// piggyback proc independently, each against its own chance — then, if one
// or more actually landed, randomly pick up to MAX_SPECIAL_CRIT_PROCS of
// them (via pickAtMost's Fisher-Yates shuffle) to actually apply, so a
// single crit can never stack every proc at once even when several land
export const MAX_SPECIAL_CRIT_PROCS = 2;

// gateway roll checked ONCE before any individual proc chance is even rolled
// (see CONFIG.crit's own comment) — a miss here skips the whole system
// silently for this crit, no procs possible at all this time
export const SPECIAL_CRIT_GATEWAY_CHANCE = CONFIG.crit.specialCritGatewayChance;

// Fisher-Yates shuffle then keep only the first `max` — the generic mechanic
// behind capping how many piggyback procs land on the same crit at once,
// used by rollCrit below
export function pickAtMost<T>(items: T[], max: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, max);
}

// full result of one rollCrit() call once a tier has actually landed — the
// one shape both rollCritUpgrade (per-click, upgradeButton.ts) and
// rollFloorBuyCrit (one-shot floor/building purchase, also upgradeButton.ts)
// now get back from the exact same shared roll
export interface CritRollResult {
  tier: CritTier;
  chain: boolean;
  boost: boolean;
  bounce: boolean;
  explosion: boolean;
  booty: boolean;
  upgrade: boolean;
  peppermint: boolean;
  heavenly: boolean;
  pair: boolean;
  threeOfAKind: boolean;
  fourOfAKind: boolean;
  fullHouse: boolean;
  tickTock: boolean;
  chairGiveaway: boolean;
  suppliesGiveaway: boolean;
  winterSale: boolean;
  springSale: boolean;
  summerSale: boolean;
  autumnSale: boolean;
  halloweenSale: boolean;
  sunshine: boolean;
  snowday: boolean;
  fastForward: boolean;
  frozen: boolean;
  snowball: boolean;
}

// every piggyback proc's own field name on CritRollResult — the single
// canonical list every "for each landed proc" loop below (and rollCrit
// itself) iterates, so adding a brand new proc is a two-line change here
// (this array + CritRollResult's own field) instead of touching every
// dispatch site by hand
export type CritProcKind = Exclude<keyof CritRollResult, "tier">;

export const CRIT_PROC_KINDS: readonly CritProcKind[] = [
  "chain",
  "boost",
  "bounce",
  "explosion",
  "booty",
  "upgrade",
  "peppermint",
  "heavenly",
  "pair",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "tickTock",
  "chairGiveaway",
  "suppliesGiveaway",
  "winterSale",
  "springSale",
  "summerSale",
  "autumnSale",
  "halloweenSale",
  "sunshine",
  "snowday",
  "fastForward",
  "frozen",
  "snowball",
];

// a caller-supplied "what does this proc actually DO here" function per proc
// kind, keyed the same way as CritRollResult's own boolean fields — a proc
// with no entry is simply skipped by the dispatchers below, so a caller that
// only supports a subset of procs (e.g. the building-unlock event, which
// only ever wires up "upgrade"/"heavenly") never has to list the rest
export type CritProcHandlers<TContext> = Partial<
  Record<CritProcKind, (ctx: TContext) => void>
>;

// runs EVERY landed proc's own handler once, in CRIT_PROC_KINDS order — the
// shared "reward application" dispatcher: a caller (a per-floor upgrade
// click, a floor-unlock purchase, a whole building bought off the map) never
// re-checks `result.chain`/`result.boost`/... itself, it just supplies a
// small handlers map of "what this proc means for ME" and this loop does the
// rest. Up to MAX_SPECIAL_CRIT_PROCS landed procs each still get their own
// independent call, same as before this existed
export function applyCritProcs<TContext>(
  result: Pick<CritRollResult, CritProcKind>,
  ctx: TContext,
  handlers: CritProcHandlers<TContext>,
): void {
  for (const kind of CRIT_PROC_KINDS) {
    if (result[kind]) handlers[kind]?.(ctx);
  }
}

// same idea, but for a mutually-exclusive "only the FIRST matching landed
// proc's handler ever runs" dispatch — used by celebration/flash code, where
// only one visual can ever be shown at once (unlike reward application,
// where every landed proc's effect is independent and additive). Returns
// whether a handler actually ran, so the caller can fall back to its own
// default celebration (the plain landed tier's own flash) if not
export function runFirstCritProc<TContext>(
  result: Pick<CritRollResult, CritProcKind>,
  ctx: TContext,
  handlers: CritProcHandlers<TContext>,
  order: readonly CritProcKind[] = CRIT_PROC_KINDS,
): boolean {
  for (const kind of order) {
    if (result[kind] && handlers[kind]) {
      handlers[kind]!(ctx);
      return true;
    }
  }
  return false;
}

// display metadata for the player-facing "Special Crits" info menu (see
// hud/corporationBoostMenu's CRIT_INFO) — one canonical table instead of that
// menu hand-duplicating every label string a second time. `icon` is a
// loadAssets ImageName key; `description` is short display-only prose, never
// read by any game logic
export interface CritProcDisplayInfo {
  label: string;
  icon: ImageName;
  description: string;
}

export const CRIT_PROC_INFO: Record<CritProcKind, CritProcDisplayInfo> = {
  chain: {
    label: CHAIN_CRIT_LABEL,
    icon: "chain",
    description: "Repeats the crit on the floor above",
  },
  boost: {
    label: BOOST_CRIT_LABEL,
    icon: "mouse",
    description: "Boosts every worker for free",
  },
  bounce: {
    label: BOUNCE_CRIT_LABEL,
    icon: "ball",
    description: "Repeats the crit on the floor below",
  },
  explosion: {
    label: EXPLOSION_CRIT_LABEL,
    icon: "explosion",
    description: "Repeats the crit up and down at once",
  },
  booty: {
    label: BOOTY_CRIT_LABEL,
    icon: "booty",
    description: "Doubles your total income",
  },
  upgrade: {
    label: UPGRADE_CRIT_LABEL,
    icon: "upgrade",
    description: "Upgrades the floor's crit tier",
  },
  peppermint: {
    label: PEPPERMINT_CRIT_LABEL,
    icon: "peppermint",
    description: "Upgrades every other floor's tier",
  },
  heavenly: {
    label: HEAVENLY_CRIT_LABEL,
    icon: "heaven",
    description: "Unlocks, maxes, and upgrades every floor",
  },
  pair: {
    label: PAIR_CRIT_LABEL,
    icon: "pair",
    description: "Upgrades 2 floors' crit tier",
  },
  threeOfAKind: {
    label: THREE_OF_A_KIND_CRIT_LABEL,
    icon: "threeOfAKind",
    description: "Upgrades 3 floors' crit tier",
  },
  fourOfAKind: {
    label: FOUR_OF_A_KIND_CRIT_LABEL,
    icon: "fourOfAKind",
    description: "Upgrades 4 floors' crit tier",
  },
  fullHouse: {
    label: FULL_HOUSE_CRIT_LABEL,
    icon: "fullHouse",
    description: "Upgrades 5 floors' crit tier",
  },
  tickTock: {
    label: TICK_TOCK_CRIT_LABEL,
    icon: "clock",
    description: "Pays every floor twice, instantly",
  },
  chairGiveaway: {
    label: CHAIR_GIVEAWAY_CRIT_LABEL,
    icon: "officeChairsIcon",
    description: "Free office chairs for the floor",
  },
  suppliesGiveaway: {
    label: SUPPLIES_GIVEAWAY_CRIT_LABEL,
    icon: "officeSuppliesIcon",
    description: "Free office supplies for the floor",
  },
  winterSale: {
    label: WINTER_SALE_CRIT_LABEL,
    icon: "winter",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  springSale: {
    label: SPRING_SALE_CRIT_LABEL,
    icon: "spring",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  summerSale: {
    label: SUMMER_SALE_CRIT_LABEL,
    icon: "summer",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  autumnSale: {
    label: AUTUMN_SALE_CRIT_LABEL,
    icon: "autumn",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  halloweenSale: {
    label: HALLOWEEN_SALE_CRIT_LABEL,
    icon: "halloween",
    description: "Cuts upgrade/worker costs 50% building-wide",
  },
  sunshine: {
    label: SUNSHINE_CRIT_LABEL,
    icon: "sunny",
    description: "Boosts every worker, twice as long",
  },
  snowday: {
    label: SNOWDAY_CRIT_LABEL,
    icon: "snowman",
    description: "Boosts every worker, three times as long",
  },
  fastForward: {
    label: FAST_FORWARD_CRIT_LABEL,
    icon: "fastforward",
    description: "Instantly credits 4 payouts' worth of income",
  },
  frozen: {
    label: FROZEN_CRIT_LABEL,
    icon: "icecube",
    description: "Free clicks each pay out like an ultra crit",
  },
  snowball: {
    label: SNOWBALL_CRIT_LABEL,
    icon: "snowball",
    description: "Free clicks earn a growing lump sum of cash",
  },
};

// the ONE shared "roll a crit" entry point: walks CRIT_TIER_ORDER rarest-first
// for the tier (previously duplicated separately by rollCritUpgrade and
// rollFloorBuyCrit), then — only if a tier actually landed — rolls the
// special-proc gateway, every proc's own independent chance, and caps the
// result to MAX_SPECIAL_CRIT_PROCS. `onLanded` is called exactly once, with the full
// result, if and only if a tier landed — a miss is silent, onLanded is never
// invoked. Callers decide what "landing" means for their own case: mutating a
// Floor's armed state (rollCritUpgrade) vs. just capturing the result to
// return (rollFloorBuyCrit) — this function itself has no Floor/state
// dependency at all
export function rollCrit(onLanded: (result: CritRollResult) => void): void {
  for (const tier of CRIT_TIER_ORDER) {
    if (Math.random() < CRIT_TIER_CONFIG[tier].chance) {
      const landed: CritProcKind[] = [];
      if (Math.random() < SPECIAL_CRIT_GATEWAY_CHANCE) {
        if (Math.random() < CHAIN_CRIT_CHANCE) landed.push("chain");
        if (Math.random() < BOOST_CRIT_CHANCE) landed.push("boost");
        if (Math.random() < BOUNCE_CRIT_CHANCE) landed.push("bounce");
        if (Math.random() < EXPLOSION_CRIT_CHANCE) landed.push("explosion");
        if (Math.random() < BOOTY_CRIT_CHANCE) landed.push("booty");
        if (Math.random() < UPGRADE_CRIT_CHANCE) landed.push("upgrade");
        if (Math.random() < PEPPERMINT_CRIT_CHANCE) landed.push("peppermint");
        if (Math.random() < HEAVENLY_CRIT_CHANCE) landed.push("heavenly");
        if (Math.random() < PAIR_CRIT_CHANCE) landed.push("pair");
        if (Math.random() < THREE_OF_A_KIND_CRIT_CHANCE)
          landed.push("threeOfAKind");
        if (Math.random() < FOUR_OF_A_KIND_CRIT_CHANCE)
          landed.push("fourOfAKind");
        if (Math.random() < FULL_HOUSE_CRIT_CHANCE) landed.push("fullHouse");
        if (Math.random() < TICK_TOCK_CRIT_CHANCE) landed.push("tickTock");
        if (Math.random() < CHAIR_GIVEAWAY_CRIT_CHANCE)
          landed.push("chairGiveaway");
        if (Math.random() < SUPPLIES_GIVEAWAY_CRIT_CHANCE)
          landed.push("suppliesGiveaway");
        if (Math.random() < WINTER_SALE_CRIT_CHANCE) landed.push("winterSale");
        if (Math.random() < SPRING_SALE_CRIT_CHANCE) landed.push("springSale");
        if (Math.random() < SUMMER_SALE_CRIT_CHANCE) landed.push("summerSale");
        if (Math.random() < AUTUMN_SALE_CRIT_CHANCE) landed.push("autumnSale");
        if (Math.random() < HALLOWEEN_SALE_CRIT_CHANCE)
          landed.push("halloweenSale");
        if (Math.random() < SUNSHINE_CRIT_CHANCE) landed.push("sunshine");
        if (Math.random() < SNOWDAY_CRIT_CHANCE) landed.push("snowday");
        if (Math.random() < FAST_FORWARD_CRIT_CHANCE)
          landed.push("fastForward");
        if (Math.random() < FROZEN_CRIT_CHANCE) landed.push("frozen");
        if (Math.random() < SNOWBALL_CRIT_CHANCE) landed.push("snowball");
      }
      const kept = new Set(pickAtMost(landed, MAX_SPECIAL_CRIT_PROCS));
      onLanded({
        tier,
        chain: kept.has("chain"),
        boost: kept.has("boost"),
        bounce: kept.has("bounce"),
        explosion: kept.has("explosion"),
        booty: kept.has("booty"),
        upgrade: kept.has("upgrade"),
        peppermint: kept.has("peppermint"),
        heavenly: kept.has("heavenly"),
        pair: kept.has("pair"),
        threeOfAKind: kept.has("threeOfAKind"),
        fourOfAKind: kept.has("fourOfAKind"),
        fullHouse: kept.has("fullHouse"),
        tickTock: kept.has("tickTock"),
        chairGiveaway: kept.has("chairGiveaway"),
        suppliesGiveaway: kept.has("suppliesGiveaway"),
        winterSale: kept.has("winterSale"),
        springSale: kept.has("springSale"),
        summerSale: kept.has("summerSale"),
        autumnSale: kept.has("autumnSale"),
        halloweenSale: kept.has("halloweenSale"),
        sunshine: kept.has("sunshine"),
        snowday: kept.has("snowday"),
        fastForward: kept.has("fastForward"),
        frozen: kept.has("frozen"),
        snowball: kept.has("snowball"),
      });
      return;
    }
  }
}

// whether the CURRENTLY ARMED crit (if any) is also a chain/boost/bounce
// crit — see rollCrit/floorInteractions.ts's plain-click crit branch
export function isChainCrit(floor: Floor): boolean {
  return chainCrits.has(floor);
}

export function isBoostCrit(floor: Floor): boolean {
  return boostCrits.has(floor);
}

export function isBounceCrit(floor: Floor): boolean {
  return bounceCrits.has(floor);
}

export function isExplosionCrit(floor: Floor): boolean {
  return explosionCrits.has(floor);
}

export function isBootyCrit(floor: Floor): boolean {
  return bootyCrits.has(floor);
}

export function isUpgradeCrit(floor: Floor): boolean {
  return upgradeCrits.has(floor);
}

export function isPeppermintCrit(floor: Floor): boolean {
  return peppermintCrits.has(floor);
}

export function isHeavenlyCrit(floor: Floor): boolean {
  return heavenlyCrits.has(floor);
}

export function isPairCrit(floor: Floor): boolean {
  return pairCrits.has(floor);
}

export function isThreeOfAKindCrit(floor: Floor): boolean {
  return threeOfAKindCrits.has(floor);
}

export function isFourOfAKindCrit(floor: Floor): boolean {
  return fourOfAKindCrits.has(floor);
}

export function isFullHouseCrit(floor: Floor): boolean {
  return fullHouseCrits.has(floor);
}

export function isTickTockCrit(floor: Floor): boolean {
  return tickTockCrits.has(floor);
}

export function isChairGiveawayCrit(floor: Floor): boolean {
  return chairGiveawayCrits.has(floor);
}

export function isSuppliesGiveawayCrit(floor: Floor): boolean {
  return suppliesGiveawayCrits.has(floor);
}

export function isWinterSaleCrit(floor: Floor): boolean {
  return winterSaleCrits.has(floor);
}

export function isSpringSaleCrit(floor: Floor): boolean {
  return springSaleCrits.has(floor);
}

export function isSummerSaleCrit(floor: Floor): boolean {
  return summerSaleCrits.has(floor);
}

export function isAutumnSaleCrit(floor: Floor): boolean {
  return autumnSaleCrits.has(floor);
}

export function isHalloweenSaleCrit(floor: Floor): boolean {
  return halloweenSaleCrits.has(floor);
}

export function isSunshineCrit(floor: Floor): boolean {
  return sunshineCrits.has(floor);
}

export function isSnowdayCrit(floor: Floor): boolean {
  return snowdayCrits.has(floor);
}

export function isFastForwardCrit(floor: Floor): boolean {
  return fastForwardCrits.has(floor);
}

export function isFrozenCrit(floor: Floor): boolean {
  return frozenCrits.has(floor);
}

export function isSnowballCrit(floor: Floor): boolean {
  return snowballCrits.has(floor);
}

// call right when an armed crit's click is handled, before rolling the next one
export function consumeCritProcs(floor: Floor): void {
  chainCrits.delete(floor);
  boostCrits.delete(floor);
  bounceCrits.delete(floor);
  explosionCrits.delete(floor);
  bootyCrits.delete(floor);
  upgradeCrits.delete(floor);
  peppermintCrits.delete(floor);
  heavenlyCrits.delete(floor);
  pairCrits.delete(floor);
  threeOfAKindCrits.delete(floor);
  fourOfAKindCrits.delete(floor);
  fullHouseCrits.delete(floor);
  tickTockCrits.delete(floor);
  chairGiveawayCrits.delete(floor);
  suppliesGiveawayCrits.delete(floor);
  winterSaleCrits.delete(floor);
  springSaleCrits.delete(floor);
  summerSaleCrits.delete(floor);
  autumnSaleCrits.delete(floor);
  halloweenSaleCrits.delete(floor);
  sunshineCrits.delete(floor);
  snowdayCrits.delete(floor);
  fastForwardCrits.delete(floor);
  frozenCrits.delete(floor);
  snowballCrits.delete(floor);
}

// dev/test-only: force the proc onto whatever tier the caller already armed
// (see upgradeButton.ts's forceChainCritUpgrade/forceBoostCritUpgrade/
// forceBounceCritUpgrade), bypassing chance entirely
export function forceChainCritProc(floor: Floor): void {
  chainCrits.add(floor);
}

export function forceBoostCritProc(floor: Floor): void {
  boostCrits.add(floor);
}

export function forceBounceCritProc(floor: Floor): void {
  bounceCrits.add(floor);
}

export function forceExplosionCritProc(floor: Floor): void {
  explosionCrits.add(floor);
}

export function forceBootyCritProc(floor: Floor): void {
  bootyCrits.add(floor);
}

export function forceUpgradeCritProc(floor: Floor): void {
  upgradeCrits.add(floor);
}

export function forcePeppermintCritProc(floor: Floor): void {
  peppermintCrits.add(floor);
}

export function forceHeavenlyCritProc(floor: Floor): void {
  heavenlyCrits.add(floor);
}

export function forcePairCritProc(floor: Floor): void {
  pairCrits.add(floor);
}

export function forceThreeOfAKindCritProc(floor: Floor): void {
  threeOfAKindCrits.add(floor);
}

export function forceFourOfAKindCritProc(floor: Floor): void {
  fourOfAKindCrits.add(floor);
}

export function forceFullHouseCritProc(floor: Floor): void {
  fullHouseCrits.add(floor);
}

export function forceTickTockCritProc(floor: Floor): void {
  tickTockCrits.add(floor);
}

export function forceChairGiveawayCritProc(floor: Floor): void {
  chairGiveawayCrits.add(floor);
}

export function forceSuppliesGiveawayCritProc(floor: Floor): void {
  suppliesGiveawayCrits.add(floor);
}

export function forceWinterSaleCritProc(floor: Floor): void {
  winterSaleCrits.add(floor);
}

export function forceSpringSaleCritProc(floor: Floor): void {
  springSaleCrits.add(floor);
}

export function forceSummerSaleCritProc(floor: Floor): void {
  summerSaleCrits.add(floor);
}

export function forceAutumnSaleCritProc(floor: Floor): void {
  autumnSaleCrits.add(floor);
}

export function forceHalloweenSaleCritProc(floor: Floor): void {
  halloweenSaleCrits.add(floor);
}

export function forceSunshineCritProc(floor: Floor): void {
  sunshineCrits.add(floor);
}

export function forceSnowdayCritProc(floor: Floor): void {
  snowdayCrits.add(floor);
}

export function forceFastForwardCritProc(floor: Floor): void {
  fastForwardCrits.add(floor);
}

export function forceFrozenCritProc(floor: Floor): void {
  frozenCrits.add(floor);
}

export function forceSnowballCritProc(floor: Floor): void {
  snowballCrits.add(floor);
}

// rarer tiers always carry a bigger multiplier by design (see CRIT_TIER_CONFIG),
// so that's a safe, already-canonical rank to compare tiers by — null (no tier)
// always loses to any real tier
function critTierRank(tier: CritTier | null): number {
  return tier ? CRIT_TIER_CONFIG[tier].multiplier : 0;
}

// whichever of a/b is rarer/bigger; used when a fresh roll should only ever
// upgrade a floor's existing permanent tier, never downgrade it
export function pickHigherCritTier(
  a: CritTier | null,
  b: CritTier | null,
): CritTier | null {
  return critTierRank(b) > critTierRank(a) ? b : a;
}

// weakest-first promotion order — the reverse of CRIT_TIER_ORDER's rarest-first
const CRIT_TIER_PROMOTION_ORDER = [...CRIT_TIER_ORDER].reverse();

// the tier one step up from `tier` (null -> crit -> mega -> ultra, or whatever
// CRIT_TIER_ORDER ends up being once more tiers exist), capped at the top —
// see floorInteractions.ts's overtime-gauge-filled reward, which promotes a
// floor's permanent critMultiplierTier by exactly one step this way
export function nextCritTier(tier: CritTier | null): CritTier {
  if (tier === null) return CRIT_TIER_PROMOTION_ORDER[0];
  const index = CRIT_TIER_PROMOTION_ORDER.indexOf(tier);
  return CRIT_TIER_PROMOTION_ORDER[
    Math.min(index + 1, CRIT_TIER_PROMOTION_ORDER.length - 1)
  ];
}

// the building's own baseline crit tier — the LOWEST tier any current floor
// has, not "every floor must match exactly". A building-wide crit (see
// cityMap/index.ts) sets every floor to the same tier, but individual floors
// can then be promoted further above that (overtime-gauge promotion, a
// floor-buy crit roll) without ever demoting one below it — so requiring an
// EXACT match here used to make this flip back to null the moment just one
// floor got promoted past the rest, which made every floor unlocked
// afterward start back at "no crit" instead of the building's real baseline.
// Taking the lowest tier present is what a brand new floor
// (ensureLockedFloorAbove) should inherit as its own starting default.
export function getUniformCritTier(floors: Floor[]): CritTier | null {
  if (floors.length === 0) return null;
  return floors.reduce<CritTier | null>(
    (lowest, floor) =>
      critTierRank(floor.critMultiplierTier) < critTierRank(lowest)
        ? floor.critMultiplierTier
        : lowest,
    floors[0].critMultiplierTier,
  );
}
