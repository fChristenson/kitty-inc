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
import type { BigNumber } from "../../shared/bigNumber";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { recordCritProcLanded } from "./critProcCounts";

export { getCritProcCount, recordCritProcLanded } from "./critProcCounts";

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
// chain has no dedicated celebration color (its flash always uses the landed
// tier's own color instead, see critCelebration.ts's tierColor) — this one is
// only CRIT_PROC_INFO's display color, same for bounce/explosion below
export const CHAIN_CRIT_COLOR = COLOR.blue;
export const CHAIN_CRIT_LABEL = "Chain";

// "domino effect" — starts with one free upgrade on the floor that crit,
// then has a 50% chance to reach each floor above it with double the previous
// floor's upgrade count. Its reward is applied by floorInteractions.ts.
export const DOMINO_EFFECT_CRIT_CHANCE = CONFIG.crit.dominoEffectChance;
export const DOMINO_EFFECT_CONTINUE_CHANCE =
  CONFIG.crit.dominoEffectContinueChance;
export const DOMINO_EFFECT_CRIT_COLOR = COLOR.blue;
export const DOMINO_EFFECT_CRIT_LABEL = "Domino Effect";

export const BLUEPRINT_CRIT_CHANCE = CONFIG.crit.blueprintChance;
export const BLUEPRINT_CRIT_COLOR = COLOR.blue;
export const BLUEPRINT_CRIT_LABEL = "Blueprint";

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
export const BOUNCE_CRIT_COLOR = COLOR.blue;
export const BOUNCE_CRIT_LABEL = "Bounce";

// "explosion crit" — a fourth piggyback proc, same shape as chain again, but
// spreads BOTH directions (up AND down) from the floor that actually crit,
// instead of only upward — see floorInteractions.ts's applyExplosionCrit
export const EXPLOSION_CRIT_CHANCE = CONFIG.crit.explosionChance;
export const EXPLOSION_CRIT_CONTINUE_CHANCE =
  CONFIG.crit.explosionContinueChance;
export const EXPLOSION_CRIT_COLOR = COLOR.blue;
export const EXPLOSION_CRIT_LABEL = "Boom";

// "booty crit" — a fifth piggyback proc, a flat one-time effect (not
// tier-scaled) like boost: doubles the CURRENTLY ACTIVE company's total
// income once, applied by floorInteractions.ts
export const BOOTY_CRIT_CHANCE = CONFIG.crit.bootyChance;
export const BOOTY_CRIT_COLOR = COLOR.gold;
export const BOOTY_CRIT_LABEL = "Booty";

// "cash flow crit" — a flat one-time effect that pays one combined income
// cycle across every corporation (see floorInteractions.ts)
export const CASH_FLOW_CRIT_CHANCE = CONFIG.crit.cashFlowChance;
export const CASH_FLOW_CRIT_COLOR = COLOR.moneyGreen;
export const CASH_FLOW_CRIT_LABEL = "Cash Flow";

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
  royalFlush: 6,
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

export const ROYAL_FLUSH_CRIT_CHANCE = CONFIG.crit.royalFlushChance;
export const ROYAL_FLUSH_CRIT_COLOR = COLOR.royalFlushPurple;
export const ROYAL_FLUSH_CRIT_LABEL = "Royal Flush";

export const LUCKY_NUMBER_CRIT_CHANCE = CONFIG.crit.luckyNumberChance;
export const LUCKY_NUMBER_CRIT_COLOR = COLOR.gold;
export const LUCKY_NUMBER_CRIT_LABEL = "Lucky Number";
export const LUCKY_NUMBER_MIN_FLOORS = 2;
export const LUCKY_NUMBER_MAX_FLOORS = 12;
export const OPEN_BOOK_CRIT_CHANCE = CONFIG.crit.openBookChance;
export const OPEN_BOOK_CRIT_COLOR = COLOR.cyan;
export const OPEN_BOOK_CRIT_LABEL = "Open Book";

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

// "easter sale" crit — same shape/same steeper discount again as halloween
// sale above (its own multiplier, never reuses SEASONAL_SALE_DISCOUNT_
// MULTIPLIER or HALLOWEEN_SALE_DISCOUNT_MULTIPLIER), just its own icon/
// label/color
export const EASTER_SALE_DISCOUNT_MULTIPLIER =
  1 - CONFIG.crit.easterSaleDiscount;

export const EASTER_SALE_CRIT_CHANCE = CONFIG.crit.easterSaleChance;
export const EASTER_SALE_CRIT_COLOR = COLOR.easterSalePink;
export const EASTER_SALE_CRIT_LABEL = "Easter Sale";

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
// floor so that, once the crit is actually clicked, triggerFrozenCrit below
// starts a CONFIG.crit.frozenDurationMs window during which this floor's
// own upgradeCost stops growing entirely (see incomePanel.ts's
// increaseIncomeRate) — upgrades still cost real money and behave
// completely normally otherwise, just at whatever price was already locked
// in when the window started
export const FROZEN_CRIT_CHANCE = CONFIG.crit.frozenChance;
export const FROZEN_CRIT_COLOR = COLOR.frozenIceBlue;
export const FROZEN_CRIT_LABEL = "Frozen";
export const FROZEN_DURATION_MS = CONFIG.crit.frozenDurationMs;
// a per-floor start timestamp, not a plain WeakSet flag like every other
// proc — the price-freeze needs to know WHEN its window ends, not just
// whether it landed
const frozenStartedAt = new WeakMap<Floor, number>();

export function triggerFrozenCrit(floor: Floor): void {
  frozenStartedAt.set(floor, Date.now());
}

export function isFrozenActive(floor: Floor, now: number): boolean {
  const startedAt = frozenStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < FROZEN_DURATION_MS;
}

// "spending freeze crit" — building-wide counterpart to Frozen: every
// currently unlocked floor shares one start timestamp, so all prices expire
// together while each floor retains the price it had when the window began.
export const SPENDING_FREEZE_CRIT_CHANCE = CONFIG.crit.spendingFreezeChance;
export const SPENDING_FREEZE_CRIT_COLOR = COLOR.spendingFreezeTeal;
export const SPENDING_FREEZE_CRIT_LABEL = "Spending Freeze";
export const SPENDING_FREEZE_DURATION_MS = CONFIG.crit.spendingFreezeDurationMs;
const spendingFreezeStartedAt = new WeakMap<Floor, number>();

export function triggerSpendingFreeze(floors: Floor[]): void {
  const now = Date.now();
  for (const floor of floors) {
    if (floor.unlocked) spendingFreezeStartedAt.set(floor, now);
  }
}

export function isSpendingFreezeActive(floor: Floor, now: number): boolean {
  const startedAt = spendingFreezeStartedAt.get(floor);
  return (
    startedAt !== undefined && now - startedAt < SPENDING_FREEZE_DURATION_MS
  );
}

// "snowball crit" — a flat, not-tier-scaled proc (same shape as tick tock/
// fast forward): instantly credits every unlocked floor 1 extra payout's
// worth of income at its own current rate, multiplied by however many
// floors are currently unlocked (the more floors owned, the bigger the
// snowball) — see floorInteractions.ts's applySnowballCrit, which reuses
// applyTickTockCrit with that count as its own multiplier
export const SNOWBALL_CRIT_CHANCE = CONFIG.crit.snowballChance;
export const SNOWBALL_CRIT_COLOR = COLOR.snowballBlue;
export const SNOWBALL_CRIT_LABEL = "Snowball";

// "free sale crit" — also no instant reward: arming this proc just marks
// the floor so that, once the crit is actually clicked, floorInteractions.ts's
// applyFreeSaleCrit calls the SAME triggerSaleBoost hud/boostMenu.ts's paid
// purchase already uses — a free ride on the existing "Sale" event (own
// window/button state/payout math all reused as-is, see upgradeButton.ts's
// sale.ts), just armed by a crit roll instead of spent cash
export const FREE_SALE_CRIT_CHANCE = CONFIG.crit.freeSaleChance;
export const FREE_SALE_CRIT_COLOR = COLOR.amber;
export const FREE_SALE_CRIT_LABEL = "Sales event";

// "bull market crit" — an instant, flat, building-wide reward: doubles
// every unlocked floor's own upgradeCount at once (see
// floorInteractions.ts's applyBullMarketCrit, which reads each floor's
// current count once then replays that many more direct increaseIncomeRate
// bumps, same perf-conscious approach applyHeavenlyCrit already uses)
export const BULL_MARKET_CRIT_CHANCE = CONFIG.crit.bullMarketChance;
export const BULL_MARKET_CRIT_COLOR = COLOR.bullMarketGreen;
export const BULL_MARKET_CRIT_LABEL = "Bull Market";

// "payday crit" — a flat, not-tier-scaled proc like booty: triples the
// CURRENTLY ACTIVE company's total income once (see
// floorInteractions.ts's applyPaydayCrit)
export const PAYDAY_CRIT_CHANCE = CONFIG.crit.paydayChance;
export const PAYDAY_CRIT_COLOR = COLOR.paydayEmerald;
export const PAYDAY_CRIT_LABEL = "Payday";

// "gold standard crit" — same flat one-time effect as payday, just a
// steeper multiplier (see floorInteractions.ts's applyGoldStandardCrit)
export const GOLD_STANDARD_CRIT_CHANCE = CONFIG.crit.goldStandardChance;
export const GOLD_STANDARD_CRIT_COLOR = COLOR.goldStandardAmber;
export const GOLD_STANDARD_CRIT_LABEL = "Gold Standard";

// "night shift crit" — same building-wide free-worker-boost reward as
// boost/sunshine/snowday above, but its own SHORTER duration, and while
// active also temporarily counts as +1 worker for boost-strength purposes
// (see floorInteractions.ts's applyNightShiftCrit, which activates a
// "virtual" boosted worker slot one past each floor's own last rendered
// worker index — countBoostedWorkers counts it toward incomePanel's own
// boost-speed exponent, but rendering never draws it since it's past
// getRenderedWorkerCount)
export const NIGHT_SHIFT_CRIT_CHANCE = CONFIG.crit.nightShiftChance;
export const NIGHT_SHIFT_CRIT_COLOR = COLOR.nightShiftIndigo;
export const NIGHT_SHIFT_CRIT_LABEL = "Night Shift";

// "Intern"/"Union Boss" crits — two more flat, not-tier-scaled procs: grant
// the floor being upgraded one free worker/manager (see hud/upgradeMenu's
// buyWorker/buyManager), for free — same shape as Chair Giveaway/Supplies
// Giveaway above, just a counted resource (workerCount) instead of a
// one-time flag for Intern. Their own backdrop icons reuse the SAME
// camera-facing worker/manager crop hud/upgradeMenu's own "hire worker"/
// "hire manager" icons use (see scripts/process-intern.mjs/process-union-
// boss.mjs, which crop that same frame at build time instead of runtime)
export const INTERN_CRIT_CHANCE = CONFIG.crit.internChance;
export const INTERN_CRIT_COLOR = COLOR.internSkyBlue;
export const INTERN_CRIT_LABEL = "Intern";

// "Talent Scout" crit — adds one capped worker, then boosts every actual
// worker on the critted floor for the normal boost duration
export const TALENT_SCOUT_CRIT_CHANCE = CONFIG.crit.talentScoutChance;
export const TALENT_SCOUT_CRIT_COLOR = COLOR.talentScoutOrange;
export const TALENT_SCOUT_CRIT_LABEL = "Talent Scout";

export const UNION_BOSS_CRIT_CHANCE = CONFIG.crit.unionBossChance;
export const UNION_BOSS_CRIT_COLOR = COLOR.unionBossSlate;
export const UNION_BOSS_CRIT_LABEL = "Union Boss";

// "Rush Hour" crit — also no instant reward: arming this proc just marks the
// floor so that, once the crit is actually clicked, triggerRushHourCrit below
// starts a CONFIG.crit.rushHourDurationMs window across the WHOLE building
// during which every unlocked floor's own income timer is capped at
// RUSH_HOUR_INTERVAL_SECONDS (see incomePanel.ts's currentSpeedMultiplier) —
// this stacks with (never undoes) whatever worker-boost/office-upgrade speedup
// already applies, and a floor already faster than the cap is left untouched
export const RUSH_HOUR_CRIT_CHANCE = CONFIG.crit.rushHourChance;
export const RUSH_HOUR_CRIT_COLOR = COLOR.orange;
export const RUSH_HOUR_CRIT_LABEL = "Rush Hour";
export const RUSH_HOUR_DURATION_MS = CONFIG.crit.rushHourDurationMs;
export const RUSH_HOUR_INTERVAL_SECONDS = CONFIG.crit.rushHourIntervalSeconds;
// a per-floor start timestamp, not a plain WeakSet flag — same shape as
// Frozen's own frozenStartedAt, since this needs to know WHEN its window ends
const rushHourStartedAt = new WeakMap<Floor, number>();

// building-wide: arms every currently-unlocked floor at once (see
// floorInteractions.ts's applyRushHourCrit)
export function triggerRushHourCrit(floors: Floor[]): void {
  const now = Date.now();
  for (const floor of floors) {
    if (floor.unlocked) rushHourStartedAt.set(floor, now);
  }
}

export function isRushHourActive(floor: Floor, now: number): boolean {
  const startedAt = rushHourStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < RUSH_HOUR_DURATION_MS;
}

export const RATE_LOCK_CRIT_CHANCE = CONFIG.crit.rateLockChance;
export const RATE_LOCK_CRIT_COLOR = COLOR.rateLockBlue;
export const RATE_LOCK_CRIT_LABEL = "Rate Lock";
export const RATE_LOCK_DURATION_MS = CONFIG.crit.rateLockDurationMs;
export const RATE_LOCK_SPEED_MULTIPLIER = CONFIG.crit.rateLockSpeedMultiplier;
const rateLockStartedAt = new WeakMap<Floor, number>();

export function triggerRateLockCrit(floor: Floor): void {
  rateLockStartedAt.set(floor, Date.now());
}

export function isRateLockActive(floor: Floor, now: number): boolean {
  const startedAt = rateLockStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < RATE_LOCK_DURATION_MS;
}

// "Golden Ticket" crit — also no instant reward: arming this proc just marks
// the floor so that, once the crit is actually clicked, floorInteractions.ts's
// applyGoldenTicketCrit arms upgradeButton.ts's own armGuaranteedUltraCrit —
// the very next rollCritUpgrade call on that floor skips the tier/proc
// chances entirely and forces a plain ultra tier, guaranteed
export const GOLDEN_TICKET_CRIT_CHANCE = CONFIG.crit.goldenTicketChance;
export const GOLDEN_TICKET_CRIT_COLOR = COLOR.goldenTicketYellow;
export const GOLDEN_TICKET_CRIT_LABEL = "Golden Ticket";

// "Silver Ticket" crit — same shape as Golden Ticket, but arms
// upgradeButton.ts's own armGuaranteedMegaCrit instead — the very next
// rollCritUpgrade call on that floor is forced to a plain mega tier
// (a smaller guaranteed swing than Golden Ticket's ultra)
export const SILVER_TICKET_CRIT_CHANCE = CONFIG.crit.silverTicketChance;
export const SILVER_TICKET_CRIT_COLOR = COLOR.silverTicketGray;
export const SILVER_TICKET_CRIT_LABEL = "Silver Ticket";

// "Grand Opening" crit — dual-scope unlock proc: on a map building purchase,
// buys the next building for free; on an upgrade/floor unlock, unlocks every
// remaining floor in that same building for free
export const GRAND_OPENING_CRIT_CHANCE = CONFIG.crit.grandOpeningChance;
export const GRAND_OPENING_CRIT_COLOR = COLOR.grandOpeningRose;
export const GRAND_OPENING_CRIT_LABEL = "Grand Opening";

// "Fully Staffed" crit — fills every unlocked floor to its worker cap and
// grants every manager-eligible unlocked floor a manager for free
export const FULLY_STAFFED_CRIT_CHANCE = CONFIG.crit.fullyStaffedChance;
export const FULLY_STAFFED_CRIT_COLOR = COLOR.fullyStaffedGreen;
export const FULLY_STAFFED_CRIT_LABEL = "Fully Staffed";

// "Shift Change" crit — fills the critted floor and the immediately lower
// unlocked floor to their rendered worker cap
export const SHIFT_CHANGE_CRIT_CHANCE = CONFIG.crit.shiftChangeChance;
export const SHIFT_CHANGE_CRIT_COLOR = COLOR.teamBuildingCoral;
export const SHIFT_CHANGE_CRIT_LABEL = "Shift Change";

// "Espresso Shot" crit — boosts every unlocked floor's workers using the
// canonical worker-boost behavior for the regular 15-second duration
export const ESPRESSO_SHOT_CRIT_CHANCE = CONFIG.crit.espressoShotChance;
export const ESPRESSO_SHOT_CRIT_COLOR = COLOR.espressoShotBrown;
export const ESPRESSO_SHOT_CRIT_LABEL = "Espresso Shot";

// "Deja Vu" crit — chooses a random crit tier when consumed and applies that
// tier's free-upgrade batch twice, without recursively rolling more procs
export const DEJA_VU_CRIT_CHANCE = CONFIG.crit.dejaVuChance;
export const DEJA_VU_CRIT_COLOR = COLOR.dejaVuBlue;
export const DEJA_VU_CRIT_LABEL = "Deja Vu";

// "Reinforcements" crit - copies the largest unlocked floor workforce to every
// other unlocked floor for free
export const CLONE_ARMY_CRIT_CHANCE = CONFIG.crit.cloneArmyChance;
export const CLONE_ARMY_CRIT_COLOR = COLOR.cloneArmyViolet;
export const CLONE_ARMY_CRIT_LABEL = "Reinforcements";

export const LUCKY_CLOVER_CRIT_CHANCE = CONFIG.crit.luckyCloverChance;
export const LUCKY_CLOVER_CRIT_COLOR = COLOR.luckyCloverGreen;
export const LUCKY_CLOVER_CRIT_LABEL = "Lucky Clover";
// how many back-to-back ultra-tier crit payouts the clover instantly grants
export const LUCKY_CLOVER_CRIT_COUNT = 4;
export const LUCKY_CLOVER_CRIT_TIER: CritTier = "ultra";

// "Second Wind" crit — refunds every dollar the active company has sunk into
// upgrades, floor unlocks and building purchases
export const SECOND_WIND_CRIT_CHANCE = CONFIG.crit.secondWindChance;
export const SECOND_WIND_CRIT_COLOR = COLOR.secondWindSky;
export const SECOND_WIND_CRIT_LABEL = "Second Wind";

// "Executive Order" crit — promotes EVERY floor in the building one permanent
// crit tier step at once (Peppermint's reward without the every-other-floor
// stride)
export const EXECUTIVE_ORDER_CRIT_CHANCE = CONFIG.crit.executiveOrderChance;
export const EXECUTIVE_ORDER_CRIT_COLOR = COLOR.executiveOrderTeal;
export const EXECUTIVE_ORDER_CRIT_LABEL = "Executive Order";

// "Round Up" crit — tops every unlocked floor's own upgradeCount up to the
// next multiple of ROUND_UP_CRIT_STEP, for free
export const ROUND_UP_CRIT_CHANCE = CONFIG.crit.roundUpChance;
export const ROUND_UP_CRIT_COLOR = COLOR.roundUpOrange;
export const ROUND_UP_CRIT_LABEL = "Round Up";
export const ROUND_UP_CRIT_STEP = 10;

// "Safety Net" crit — gives five normal free upgrades to the most expensive
// unlocked floor in the current building
export const SAFETY_NET_CRIT_CHANCE = CONFIG.crit.safetyNetChance;
export const SAFETY_NET_CRIT_COLOR = COLOR.safetyNetOrange;
export const SAFETY_NET_CRIT_LABEL = "Safety Net";
export const SAFETY_NET_CRIT_UPGRADES = 5;

// "Floor Share" crit - gives the critted floor one temporary upgrade reward
// scaled by its own level plus every unlocked floor below it
export const FLOOR_SHARE_CRIT_CHANCE = CONFIG.crit.floorShareChance;
export const FLOOR_SHARE_CRIT_COLOR = COLOR.floorShareBlue;
export const FLOOR_SHARE_CRIT_LABEL = "Floor Share";

// "Same Boat" crit — Floor Share's temporary reward at twice the level
export const SAME_BOAT_CRIT_CHANCE = CONFIG.crit.sameBoatChance;
export const SAME_BOAT_CRIT_COLOR = COLOR.sameBoatCoral;
export const SAME_BOAT_CRIT_LABEL = "Same Boat";

// "Golden Handshake" crit — Union Boss's building-wide sibling: a free
// manager on every unlocked floor at once
export const GOLDEN_HANDSHAKE_CRIT_CHANCE = CONFIG.crit.goldenHandshakeChance;
export const GOLDEN_HANDSHAKE_CRIT_COLOR = COLOR.goldenHandshakeGold;
export const GOLDEN_HANDSHAKE_CRIT_LABEL = "Golden Handshake";

// "Supply Run" crit — Chair Giveaway and Supplies Giveaway at once, on the
// floor that actually crit
export const SUPPLY_RUN_CRIT_CHANCE = CONFIG.crit.supplyRunChance;
export const SUPPLY_RUN_CRIT_COLOR = COLOR.supplyRunTan;
export const SUPPLY_RUN_CRIT_LABEL = "Supply Run";

// "Casual Friday" crit — a flat CASUAL_FRIDAY_CRIT_UPGRADES free upgrades on
// every unlocked floor at once, no tier scaling
export const CASUAL_FRIDAY_CRIT_CHANCE = CONFIG.crit.casualFridayChance;
export const CASUAL_FRIDAY_CRIT_COLOR = COLOR.casualFridayTeal;
export const CASUAL_FRIDAY_CRIT_LABEL = "Casual Friday";
export const CASUAL_FRIDAY_CRIT_UPGRADES = 5;

// "Fancy Friday" crit — Casual Friday's bigger sibling, same flat shape
export const FANCY_FRIDAY_CRIT_CHANCE = CONFIG.crit.fancyFridayChance;
export const FANCY_FRIDAY_CRIT_COLOR = COLOR.fancyFridayIndigo;
export const FANCY_FRIDAY_CRIT_LABEL = "Fancy Friday";
export const FANCY_FRIDAY_CRIT_UPGRADES = 10;

// "Fire Drill" crit — unlike tick tock (which pays out without disturbing
// any bar), this actually COMPLETES every unlocked floor's income timer:
// full payout, then the bar restarts from empty
export const FIRE_DRILL_CRIT_CHANCE = CONFIG.crit.fireDrillChance;
export const FIRE_DRILL_CRIT_COLOR = COLOR.fireDrillRed;
export const FIRE_DRILL_CRIT_LABEL = "Fire Drill";

// "Bonus Round" crit — completes only the critted floor's income timer twice
export const BONUS_ROUND_CRIT_CHANCE = CONFIG.crit.bonusRoundChance;
export const BONUS_ROUND_CRIT_COLOR = COLOR.bonusRoundGold;
export const BONUS_ROUND_CRIT_LABEL = "Bonus Round";

// "Overflow" crit — pays five current income timer payouts on only the floor
// where the crit landed, then restarts that floor's timer
export const OVERFLOW_CRIT_CHANCE = CONFIG.crit.overflowChance;
export const OVERFLOW_CRIT_COLOR = COLOR.overflowBlue;
export const OVERFLOW_CRIT_LABEL = "Overflow";

// "Performance Bonus" crit — completes one current income timer for every
// actual worker and manager on every unlocked floor
export const PERFORMANCE_BONUS_CRIT_CHANCE = CONFIG.crit.performanceBonusChance;
export const PERFORMANCE_BONUS_CRIT_COLOR = COLOR.performanceBonusBlue;
export const PERFORMANCE_BONUS_CRIT_LABEL = "Performance Bonus";

// "Double Down" crit — unlike Deja Vu (which picks a RANDOM tier), this
// replays whatever tier actually landed, DOUBLE_DOWN_CRIT_REPEATS more times
export const DOUBLE_DOWN_CRIT_CHANCE = CONFIG.crit.doubleDownChance;
export const DOUBLE_DOWN_CRIT_COLOR = COLOR.doubleDownCrimson;
export const DOUBLE_DOWN_CRIT_LABEL = "Double Down";
export const DOUBLE_DOWN_CRIT_REPEATS = 2;

// "Coffee Run" crit — the boost/sunshine/snowday family's longest window: a
// full minute of boosted workers building-wide
export const COFFEE_RUN_CRIT_CHANCE = CONFIG.crit.coffeeRunChance;
export const COFFEE_RUN_CRIT_COLOR = COLOR.coffeeRunTeal;
export const COFFEE_RUN_CRIT_LABEL = "Coffee Run";

// "Team Building" crit — Intern's building-wide sibling: one free worker on
// every unlocked floor at once
export const TEAM_BUILDING_CRIT_CHANCE = CONFIG.crit.teamBuildingChance;
export const TEAM_BUILDING_CRIT_COLOR = COLOR.teamBuildingCoral;
export const TEAM_BUILDING_CRIT_LABEL = "Team Building";

// "Team Lunch" crit — doubles the normal boost duration for every actual
// worker on only the floor where the crit landed
export const TEAM_LUNCH_CRIT_CHANCE = CONFIG.crit.teamLunchChance;
export const TEAM_LUNCH_CRIT_COLOR = COLOR.teamBuildingCoral;
export const TEAM_LUNCH_CRIT_LABEL = "Team Lunch";

// "Spring Cleaning" crit — promotes every unlocked floor one tier and wipes it
// back to a brand new floor at that tier; a floor already at the top tier is
// skipped entirely, since there's nothing left to trade the upgrades for
export const SPRING_CLEANING_CRIT_CHANCE = CONFIG.crit.springCleaningChance;
export const SPRING_CLEANING_CRIT_COLOR = COLOR.springCleaningMint;
export const SPRING_CLEANING_CRIT_LABEL = "Spring Cleaning";

// "Night Owl" crit — Night Shift's exact reward, but worth +2 virtual boosted
// workers instead of +1
export const NIGHT_OWL_CRIT_CHANCE = CONFIG.crit.nightOwlChance;
export const NIGHT_OWL_CRIT_COLOR = COLOR.nightOwlIndigo;
export const NIGHT_OWL_CRIT_LABEL = "Night Owl";

// "Headhunter" crit — poaches the building's best headcount onto the floor
// that crit; a no-op when that floor already IS the best-staffed one
export const HEADHUNTER_CRIT_CHANCE = CONFIG.crit.headhunterChance;
export const HEADHUNTER_CRIT_COLOR = COLOR.headhunterRust;
export const HEADHUNTER_CRIT_LABEL = "Headhunter";

// "Dress Code" crit — adds a manager to each unlocked floor without one,
// otherwise adds one worker
export const DRESS_CODE_CRIT_CHANCE = CONFIG.crit.dressCodeChance;
export const DRESS_CODE_CRIT_COLOR = COLOR.dressCodeGreen;
export const DRESS_CODE_CRIT_LABEL = "Dress Code";

// "Tea Break" crit — grants one free upgrade to the floor that landed it
export const TEA_BREAK_CRIT_CHANCE = CONFIG.crit.teaBreakChance;
export const TEA_BREAK_CRIT_COLOR = COLOR.teaBreakBrown;
export const TEA_BREAK_CRIT_LABEL = "Tea Break";

export function isTeaBreakCrit(floor: Floor): boolean {
  return teaBreakCrits.has(floor);
}

// "Recruitment Drive" crit — fills this floor and contiguous unlocked floors
// above it to the rendered worker cap, stopping before the first maxed/locked
// floor
export const RECRUITMENT_DRIVE_CRIT_CHANCE = CONFIG.crit.recruitmentDriveChance;
export const RECRUITMENT_DRIVE_CRIT_COLOR = COLOR.recruitmentDriveBlue;
export const RECRUITMENT_DRIVE_CRIT_LABEL = "Recruitment Drive";
// "Merger" crit - synchronizes every unlocked lower floor to the landing
// floor's current upgrade level, without changing the landing floor itself
export const MERGER_CRIT_CHANCE = CONFIG.crit.mergerChance;
export const MERGER_CRIT_COLOR = COLOR.mergerGold;
export const MERGER_CRIT_LABEL = "Merger";
export const SHAREHOLDERS_CRIT_CHANCE = CONFIG.crit.shareholdersChance;
export const SHAREHOLDERS_CRIT_COLOR = COLOR.shareholdersGreen;
export const SHAREHOLDERS_CRIT_LABEL = "Shareholders";

// "Golden Parachute" crit — a flat, not-tier-scaled instant payout (see
// floorInteractions.ts's applyGoldenParachuteCrit): instantly adds 15
// seconds' worth of the currently active company's own combined income rate
// (every building, not just this one) straight to its total, same one-shot
// shape as booty/payday/gold standard
export const GOLDEN_PARACHUTE_CRIT_CHANCE = CONFIG.crit.goldenParachuteChance;
export const GOLDEN_PARACHUTE_CRIT_COLOR = COLOR.goldenParachuteMarigold;
export const GOLDEN_PARACHUTE_CRIT_LABEL = "Golden Parachute";

export const EXECUTIVE_BONUS_CRIT_CHANCE = CONFIG.crit.executiveBonusChance;
export const EXECUTIVE_BONUS_CRIT_COLOR = COLOR.gold;
export const EXECUTIVE_BONUS_CRIT_LABEL = "Executive Bonus";
export const POWER_SURGE_CRIT_CHANCE = CONFIG.crit.powerSurgeChance;
export const POWER_SURGE_CRIT_COLOR = COLOR.starYellow;
export const POWER_SURGE_CRIT_LABEL = "Power Surge";
export const PRICE_MATCH_CRIT_CHANCE = CONFIG.crit.priceMatchChance;
export const PRICE_MATCH_CRIT_COLOR = COLOR.cyan;
export const PRICE_MATCH_CRIT_LABEL = "Price Match";
export const PRICE_MATCH_DURATION_MS = CONFIG.crit.priceMatchDurationMs;
export const FIRST_CLASS_CRIT_CHANCE = CONFIG.crit.firstClassChance;
export const FIRST_CLASS_CRIT_COLOR = COLOR.blue;
export const FIRST_CLASS_CRIT_LABEL = "First Class";
const priceMatchCosts = new WeakMap<
  Floor,
  { cost: BigNumber; originalCost: BigNumber; startedAt: number }
>();

export function triggerPriceMatchCrit(floor: Floor, cost: BigNumber): void {
  const originalCost =
    priceMatchCosts.get(floor)?.originalCost ?? floor.upgradeCost;
  const startedAt = Date.now();
  floor.upgradeCost = cost;
  priceMatchCosts.set(floor, { cost, originalCost, startedAt });
  setTimeout(() => {
    const active = priceMatchCosts.get(floor);
    if (active?.startedAt === startedAt) {
      floor.upgradeCost = active.originalCost;
      priceMatchCosts.delete(floor);
    }
  }, PRICE_MATCH_DURATION_MS);
}

export function getPriceMatchCost(floor: Floor, now: number): BigNumber | null {
  const match = priceMatchCosts.get(floor);
  if (!match || now - match.startedAt >= PRICE_MATCH_DURATION_MS) {
    if (match) floor.upgradeCost = match.originalCost;
    priceMatchCosts.delete(floor);
    return null;
  }
  return match.cost;
}

// "Payout" crit — the biggest flat one-time jackpot (see
// floorInteractions.ts's applyPayoutCrit): instantly adds the combined total
// income + upgrades value across EVERY corporation, not just the active
// one, to the currently active company's own total
export const PAYOUT_CRIT_CHANCE = CONFIG.crit.payoutChance;
export const PAYOUT_CRIT_COLOR = COLOR.payoutOlive;
export const PAYOUT_CRIT_LABEL = "Payout";

// state for all eight piggyback procs lives here too (not upgradeButton.ts) so
// the whole "what can ride along with a landed crit" system stays in one place
const chainCrits = new WeakSet<Floor>();
const dominoEffectCrits = new WeakSet<Floor>();
const blueprintCrits = new WeakSet<Floor>();
const boostCrits = new WeakSet<Floor>();
const bounceCrits = new WeakSet<Floor>();
const explosionCrits = new WeakSet<Floor>();
const bootyCrits = new WeakSet<Floor>();
const cashFlowCrits = new WeakSet<Floor>();
const upgradeCrits = new WeakSet<Floor>();
const peppermintCrits = new WeakSet<Floor>();
const heavenlyCrits = new WeakSet<Floor>();
const pairCrits = new WeakSet<Floor>();
const threeOfAKindCrits = new WeakSet<Floor>();
const fourOfAKindCrits = new WeakSet<Floor>();
const fullHouseCrits = new WeakSet<Floor>();
const royalFlushCrits = new WeakSet<Floor>();
const luckyNumberCrits = new WeakSet<Floor>();
const openBookCrits = new WeakSet<Floor>();
const tickTockCrits = new WeakSet<Floor>();
const chairGiveawayCrits = new WeakSet<Floor>();
const suppliesGiveawayCrits = new WeakSet<Floor>();
const winterSaleCrits = new WeakSet<Floor>();
const springSaleCrits = new WeakSet<Floor>();
const summerSaleCrits = new WeakSet<Floor>();
const autumnSaleCrits = new WeakSet<Floor>();
const halloweenSaleCrits = new WeakSet<Floor>();
const easterSaleCrits = new WeakSet<Floor>();
const sunshineCrits = new WeakSet<Floor>();
const snowdayCrits = new WeakSet<Floor>();
const fastForwardCrits = new WeakSet<Floor>();
const frozenCrits = new WeakSet<Floor>();
const spendingFreezeCrits = new WeakSet<Floor>();
const snowballCrits = new WeakSet<Floor>();
const freeSaleCrits = new WeakSet<Floor>();
const bullMarketCrits = new WeakSet<Floor>();
const paydayCrits = new WeakSet<Floor>();
const goldStandardCrits = new WeakSet<Floor>();
const nightShiftCrits = new WeakSet<Floor>();
const internCrits = new WeakSet<Floor>();
const talentScoutCrits = new WeakSet<Floor>();
const unionBossCrits = new WeakSet<Floor>();
const rushHourCrits = new WeakSet<Floor>();
const rateLockCrits = new WeakSet<Floor>();
const goldenTicketCrits = new WeakSet<Floor>();
const silverTicketCrits = new WeakSet<Floor>();
const goldenParachuteCrits = new WeakSet<Floor>();
const executiveBonusCrits = new WeakSet<Floor>();
const powerSurgeCrits = new WeakSet<Floor>();
const priceMatchCrits = new WeakSet<Floor>();
const firstClassCrits = new WeakSet<Floor>();
const payoutCrits = new WeakSet<Floor>();
const grandOpeningCrits = new WeakSet<Floor>();
const fullyStaffedCrits = new WeakSet<Floor>();
const shiftChangeCrits = new WeakSet<Floor>();
const espressoShotCrits = new WeakSet<Floor>();
const dejaVuCrits = new WeakSet<Floor>();
const cloneArmyCrits = new WeakSet<Floor>();
const luckyCloverCrits = new WeakSet<Floor>();
const secondWindCrits = new WeakSet<Floor>();
const executiveOrderCrits = new WeakSet<Floor>();
const roundUpCrits = new WeakSet<Floor>();
const safetyNetCrits = new WeakSet<Floor>();
const floorShareCrits = new WeakSet<Floor>();
const sameBoatCrits = new WeakSet<Floor>();
const goldenHandshakeCrits = new WeakSet<Floor>();
const supplyRunCrits = new WeakSet<Floor>();
const casualFridayCrits = new WeakSet<Floor>();
const fancyFridayCrits = new WeakSet<Floor>();
const fireDrillCrits = new WeakSet<Floor>();
const bonusRoundCrits = new WeakSet<Floor>();
const overflowCrits = new WeakSet<Floor>();
const performanceBonusCrits = new WeakSet<Floor>();
const teaBreakCrits = new WeakSet<Floor>();
const doubleDownCrits = new WeakSet<Floor>();
const coffeeRunCrits = new WeakSet<Floor>();
const teamBuildingCrits = new WeakSet<Floor>();
const teamLunchCrits = new WeakSet<Floor>();
const springCleaningCrits = new WeakSet<Floor>();
const nightOwlCrits = new WeakSet<Floor>();
const headhunterCrits = new WeakSet<Floor>();
const dressCodeCrits = new WeakSet<Floor>();
const recruitmentDriveCrits = new WeakSet<Floor>();
const mergerCrits = new WeakSet<Floor>();
const shareholdersCrits = new WeakSet<Floor>();
// "special crit crit" bonus tier riding on an already-landed proc (see
// rollCrit's own bonusTier) — a CritTier value per floor, not a WeakSet, since
// unlike every other proc this one carries actual tier data, not just a flag
const bonusTierCrits = new WeakMap<Floor, CritTier>();

// call once a tier has just landed (see rollCrit below) to roll every
// piggyback proc independently, each against its own chance — then, if one
// or more actually landed, randomly pick up to MAX_SPECIAL_CRIT_PROCS of
// them (via pickAtMost's Fisher-Yates shuffle) to actually apply. Only one
// proc can land on a base crit; Deja Vu's two follow-ups are spawned later by
// its dedicated follow-up path and are intentionally unaffected by this cap.
export const MAX_SPECIAL_CRIT_PROCS = 1;

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
  // "special crit crit": set only when at least one piggyback proc below also
  // landed (see rollCrit) — an independent bonus x5/x25/x125 tier on top of
  // whichever proc(s) fired, never itself eligible to roll a further nested
  // bonus
  bonusTier: CritTier | null;
  chain: boolean;
  dominoEffect: boolean;
  blueprint: boolean;
  boost: boolean;
  bounce: boolean;
  explosion: boolean;
  booty: boolean;
  cashFlow: boolean;
  upgrade: boolean;
  peppermint: boolean;
  heavenly: boolean;
  pair: boolean;
  threeOfAKind: boolean;
  fourOfAKind: boolean;
  fullHouse: boolean;
  royalFlush: boolean;
  luckyNumber: boolean;
  openBook: boolean;
  tickTock: boolean;
  chairGiveaway: boolean;
  suppliesGiveaway: boolean;
  winterSale: boolean;
  springSale: boolean;
  summerSale: boolean;
  autumnSale: boolean;
  halloweenSale: boolean;
  easterSale: boolean;
  sunshine: boolean;
  snowday: boolean;
  fastForward: boolean;
  frozen: boolean;
  spendingFreeze: boolean;
  snowball: boolean;
  freeSale: boolean;
  bullMarket: boolean;
  payday: boolean;
  goldStandard: boolean;
  nightShift: boolean;
  intern: boolean;
  talentScout: boolean;
  unionBoss: boolean;
  rushHour: boolean;
  rateLock: boolean;
  goldenTicket: boolean;
  silverTicket: boolean;
  goldenParachute: boolean;
  executiveBonus: boolean;
  powerSurge: boolean;
  priceMatch: boolean;
  firstClass: boolean;
  payout: boolean;
  grandOpening: boolean;
  fullyStaffed: boolean;
  shiftChange: boolean;
  espressoShot: boolean;
  dejaVu: boolean;
  cloneArmy: boolean;
  luckyClover: boolean;
  secondWind: boolean;
  executiveOrder: boolean;
  roundUp: boolean;
  safetyNet: boolean;
  floorShare: boolean;
  sameBoat: boolean;
  goldenHandshake: boolean;
  supplyRun: boolean;
  casualFriday: boolean;
  fancyFriday: boolean;
  fireDrill: boolean;
  bonusRound: boolean;
  overflow: boolean;
  performanceBonus: boolean;
  teaBreak: boolean;
  doubleDown: boolean;
  coffeeRun: boolean;
  teamBuilding: boolean;
  teamLunch: boolean;
  springCleaning: boolean;
  nightOwl: boolean;
  headhunter: boolean;
  dressCode: boolean;
  recruitmentDrive: boolean;
  merger: boolean;
  shareholders: boolean;
}

// every piggyback proc's own field name on CritRollResult — the single
// canonical list every "for each landed proc" loop below (and rollCrit
// itself) iterates, so adding a brand new proc is a two-line change here
// (this array + CritRollResult's own field) instead of touching every
// dispatch site by hand. bonusTier is excluded — it's a CritTier | null
// modifier riding on an already-landed proc, not itself a boolean proc kind
export type CritProcKind = Exclude<keyof CritRollResult, "tier" | "bonusTier">;

export const CRIT_PROC_KINDS: readonly CritProcKind[] = [
  "chain",
  "dominoEffect",
  "blueprint",
  "boost",
  "bounce",
  "explosion",
  "booty",
  "cashFlow",
  "upgrade",
  "peppermint",
  "heavenly",
  "pair",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "royalFlush",
  "luckyNumber",
  "openBook",
  "tickTock",
  "chairGiveaway",
  "suppliesGiveaway",
  "winterSale",
  "springSale",
  "summerSale",
  "autumnSale",
  "halloweenSale",
  "easterSale",
  "sunshine",
  "snowday",
  "fastForward",
  "frozen",
  "spendingFreeze",
  "snowball",
  "freeSale",
  "bullMarket",
  "payday",
  "goldStandard",
  "nightShift",
  "intern",
  "talentScout",
  "unionBoss",
  "rushHour",
  "rateLock",
  "goldenTicket",
  "silverTicket",
  "goldenParachute",
  "executiveBonus",
  "powerSurge",
  "priceMatch",
  "firstClass",
  "payout",
  "grandOpening",
  "fullyStaffed",
  "shiftChange",
  "espressoShot",
  "dejaVu",
  "cloneArmy",
  "luckyClover",
  "secondWind",
  "executiveOrder",
  "roundUp",
  "safetyNet",
  "floorShare",
  "sameBoat",
  "goldenHandshake",
  "supplyRun",
  "casualFriday",
  "fancyFriday",
  "fireDrill",
  "bonusRound",
  "overflow",
  "performanceBonus",
  "teaBreak",
  "doubleDown",
  "coffeeRun",
  "teamBuilding",
  "teamLunch",
  "springCleaning",
  "nightOwl",
  "headhunter",
  "dressCode",
  "recruitmentDrive",
  "merger",
  "shareholders",
];

// the one kind -> "is this proc armed on this floor" registry. Every per-proc
// WeakSet above is reachable from here, so anything that needs to act on procs
// generically (consumeCritProcs, readCritProcs, forceCritProc) walks
// CRIT_PROC_KINDS instead of hand-listing all 59 of them again
const CRIT_PROC_SETS: Record<CritProcKind, WeakSet<Floor>> = {
  chain: chainCrits,
  dominoEffect: dominoEffectCrits,
  blueprint: blueprintCrits,
  boost: boostCrits,
  bounce: bounceCrits,
  explosion: explosionCrits,
  booty: bootyCrits,
  cashFlow: cashFlowCrits,
  upgrade: upgradeCrits,
  peppermint: peppermintCrits,
  heavenly: heavenlyCrits,
  pair: pairCrits,
  threeOfAKind: threeOfAKindCrits,
  fourOfAKind: fourOfAKindCrits,
  fullHouse: fullHouseCrits,
  royalFlush: royalFlushCrits,
  luckyNumber: luckyNumberCrits,
  openBook: openBookCrits,
  tickTock: tickTockCrits,
  chairGiveaway: chairGiveawayCrits,
  suppliesGiveaway: suppliesGiveawayCrits,
  winterSale: winterSaleCrits,
  springSale: springSaleCrits,
  summerSale: summerSaleCrits,
  autumnSale: autumnSaleCrits,
  halloweenSale: halloweenSaleCrits,
  easterSale: easterSaleCrits,
  sunshine: sunshineCrits,
  snowday: snowdayCrits,
  fastForward: fastForwardCrits,
  frozen: frozenCrits,
  spendingFreeze: spendingFreezeCrits,
  snowball: snowballCrits,
  freeSale: freeSaleCrits,
  bullMarket: bullMarketCrits,
  payday: paydayCrits,
  goldStandard: goldStandardCrits,
  nightShift: nightShiftCrits,
  intern: internCrits,
  talentScout: talentScoutCrits,
  unionBoss: unionBossCrits,
  rushHour: rushHourCrits,
  rateLock: rateLockCrits,
  goldenTicket: goldenTicketCrits,
  silverTicket: silverTicketCrits,
  goldenParachute: goldenParachuteCrits,
  executiveBonus: executiveBonusCrits,
  powerSurge: powerSurgeCrits,
  priceMatch: priceMatchCrits,
  firstClass: firstClassCrits,
  payout: payoutCrits,
  grandOpening: grandOpeningCrits,
  fullyStaffed: fullyStaffedCrits,
  shiftChange: shiftChangeCrits,
  espressoShot: espressoShotCrits,
  dejaVu: dejaVuCrits,
  cloneArmy: cloneArmyCrits,
  luckyClover: luckyCloverCrits,
  secondWind: secondWindCrits,
  executiveOrder: executiveOrderCrits,
  roundUp: roundUpCrits,
  safetyNet: safetyNetCrits,
  floorShare: floorShareCrits,
  sameBoat: sameBoatCrits,
  goldenHandshake: goldenHandshakeCrits,
  supplyRun: supplyRunCrits,
  casualFriday: casualFridayCrits,
  fancyFriday: fancyFridayCrits,
  fireDrill: fireDrillCrits,
  bonusRound: bonusRoundCrits,
  overflow: overflowCrits,
  performanceBonus: performanceBonusCrits,
  teaBreak: teaBreakCrits,
  doubleDown: doubleDownCrits,
  coffeeRun: coffeeRunCrits,
  teamBuilding: teamBuildingCrits,
  teamLunch: teamLunchCrits,
  springCleaning: springCleaningCrits,
  nightOwl: nightOwlCrits,
  headhunter: headhunterCrits,
  dressCode: dressCodeCrits,
  recruitmentDrive: recruitmentDriveCrits,
  merger: mergerCrits,
  shareholders: shareholdersCrits,
};

// every proc currently armed on this floor, as the same boolean-per-kind shape
// CritRollResult uses — so a consumption site can hand the whole set straight
// to applyCritProcs/triggerCritCelebration instead of reading 59 isXCrit()
// calls into 59 local consts
export type CritProcFlags = Record<CritProcKind, boolean>;

export function readCritProcs(floor: Floor): CritProcFlags {
  const flags = {} as CritProcFlags;
  for (const kind of CRIT_PROC_KINDS) {
    flags[kind] = CRIT_PROC_SETS[kind].has(floor);
  }
  return flags;
}

// a flags record with exactly one proc set — lets a single proc be pushed
// through the same applyCritProcs dispatcher everything else uses (see
// critCelebration's Deja Vu follow-ups)
export function onlyCritProc(kind: CritProcKind): CritProcFlags {
  const flags = {} as CritProcFlags;
  for (const other of CRIT_PROC_KINDS) flags[other] = other === kind;
  return flags;
}

export function forceCritProc(kind: CritProcKind, floor: Floor): void {
  CRIT_PROC_SETS[kind].add(floor);
}

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
// rest. The single selected landed proc gets its own independent call.
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
// hud/corporationBoostMenu's CRIT_INFO) AND the celebration flash each proc
// triggers (floorInteractions/critCelebration) — one canonical table instead
// of those hand-duplicating every label/color a second time. `icon` is a
// loadAssets ImageName key; `description` is short display-only prose, never
// read by any game logic
export interface CritProcDisplayInfo {
  label: string;
  color: string;
  icon: ImageName;
  description: string;
}

export const CRIT_PROC_INFO: Record<CritProcKind, CritProcDisplayInfo> = {
  chain: {
    label: CHAIN_CRIT_LABEL,

    color: CHAIN_CRIT_COLOR,
    icon: "chain",
    description: "Repeats the crit on the floor above",
  },
  dominoEffect: {
    label: DOMINO_EFFECT_CRIT_LABEL,
    color: DOMINO_EFFECT_CRIT_COLOR,
    icon: "dominoEffect",
    description: "Doubles upgrades across a lucky floor run",
  },
  blueprint: {
    label: BLUEPRINT_CRIT_LABEL,
    color: BLUEPRINT_CRIT_COLOR,
    icon: "blueprint",
    description: "Unlocks and copies the crit floor's upgrades and staff",
  },
  boost: {
    label: BOOST_CRIT_LABEL,

    color: BOOST_CRIT_COLOR,
    icon: "mouse",
    description: "Boosts every worker for free",
  },
  bounce: {
    label: BOUNCE_CRIT_LABEL,

    color: BOUNCE_CRIT_COLOR,
    icon: "ball",
    description: "Repeats the crit on the floor below",
  },
  explosion: {
    label: EXPLOSION_CRIT_LABEL,

    color: EXPLOSION_CRIT_COLOR,
    icon: "explosion",
    description: "Repeats the crit up and down at once",
  },
  booty: {
    label: BOOTY_CRIT_LABEL,

    color: BOOTY_CRIT_COLOR,
    icon: "booty",
    description: "Doubles your total income",
  },
  cashFlow: {
    label: CASH_FLOW_CRIT_LABEL,
    color: CASH_FLOW_CRIT_COLOR,
    icon: "cashFlow",
    description: "Pays one combined income cycle",
  },
  upgrade: {
    label: UPGRADE_CRIT_LABEL,

    color: UPGRADE_CRIT_COLOR,
    icon: "upgrade",
    description: "Upgrades the floor's crit tier",
  },
  peppermint: {
    label: PEPPERMINT_CRIT_LABEL,

    color: PEPPERMINT_CRIT_COLOR,
    icon: "peppermint",
    description: "Upgrades every other floor's tier",
  },
  heavenly: {
    label: HEAVENLY_CRIT_LABEL,

    color: HEAVENLY_CRIT_COLOR,
    icon: "heaven",
    description: "Unlocks, maxes, and upgrades every floor",
  },
  shiftChange: {
    label: SHIFT_CHANGE_CRIT_LABEL,
    color: SHIFT_CHANGE_CRIT_COLOR,
    icon: "shiftChange",
    description: "Fills this floor and the one below",
  },
  pair: {
    label: PAIR_CRIT_LABEL,

    color: PAIR_CRIT_COLOR,
    icon: "pair",
    description: "Upgrades 2 floors' crit tier",
  },
  threeOfAKind: {
    label: THREE_OF_A_KIND_CRIT_LABEL,

    color: THREE_OF_A_KIND_CRIT_COLOR,
    icon: "threeOfAKind",
    description: "Upgrades 3 floors' crit tier",
  },
  fourOfAKind: {
    label: FOUR_OF_A_KIND_CRIT_LABEL,

    color: FOUR_OF_A_KIND_CRIT_COLOR,
    icon: "fourOfAKind",
    description: "Upgrades 4 floors' crit tier",
  },
  fullHouse: {
    label: FULL_HOUSE_CRIT_LABEL,

    color: FULL_HOUSE_CRIT_COLOR,
    icon: "fullHouse",
    description: "Upgrades 5 floors' crit tier",
  },
  royalFlush: {
    label: ROYAL_FLUSH_CRIT_LABEL,

    color: ROYAL_FLUSH_CRIT_COLOR,
    icon: "royalFlush",
    description: "Upgrades 6 floors' crit tier",
  },
  luckyNumber: {
    label: LUCKY_NUMBER_CRIT_LABEL,
    color: LUCKY_NUMBER_CRIT_COLOR,
    icon: "luckyNumber",
    description: "Unlocks 2-12 floors for free",
  },
  openBook: {
    label: OPEN_BOOK_CRIT_LABEL,
    color: OPEN_BOOK_CRIT_COLOR,
    icon: "openBook",
    description: "Pays the value of all bought upgrades",
  },
  tickTock: {
    label: TICK_TOCK_CRIT_LABEL,

    color: TICK_TOCK_CRIT_COLOR,
    icon: "clock",
    description: "Pays every floor twice, instantly",
  },
  chairGiveaway: {
    label: CHAIR_GIVEAWAY_CRIT_LABEL,

    color: CHAIR_GIVEAWAY_CRIT_COLOR,
    icon: "officeChairsIcon",
    description: "Free office chairs for the floor",
  },
  suppliesGiveaway: {
    label: SUPPLIES_GIVEAWAY_CRIT_LABEL,

    color: SUPPLIES_GIVEAWAY_CRIT_COLOR,
    icon: "officeSuppliesIcon",
    description: "Free office supplies for the floor",
  },
  winterSale: {
    label: WINTER_SALE_CRIT_LABEL,

    color: WINTER_SALE_CRIT_COLOR,
    icon: "winter",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  springSale: {
    label: SPRING_SALE_CRIT_LABEL,

    color: SPRING_SALE_CRIT_COLOR,
    icon: "spring",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  summerSale: {
    label: SUMMER_SALE_CRIT_LABEL,

    color: SUMMER_SALE_CRIT_COLOR,
    icon: "summer",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  autumnSale: {
    label: AUTUMN_SALE_CRIT_LABEL,

    color: AUTUMN_SALE_CRIT_COLOR,
    icon: "autumn",
    description: "Cuts upgrade/worker costs 25% building-wide",
  },
  halloweenSale: {
    label: HALLOWEEN_SALE_CRIT_LABEL,

    color: HALLOWEEN_SALE_CRIT_COLOR,
    icon: "halloween",
    description: "Cuts upgrade/worker costs 50% building-wide",
  },
  easterSale: {
    label: EASTER_SALE_CRIT_LABEL,

    color: EASTER_SALE_CRIT_COLOR,
    icon: "easterBunny",
    description: "Cuts upgrade/worker costs 50% building-wide",
  },
  sunshine: {
    label: SUNSHINE_CRIT_LABEL,

    color: SUNSHINE_CRIT_COLOR,
    icon: "sunny",
    description: "Boosts every worker, twice as long",
  },
  snowday: {
    label: SNOWDAY_CRIT_LABEL,

    color: SNOWDAY_CRIT_COLOR,
    icon: "snowman",
    description: "Boosts every worker, three times as long",
  },
  fastForward: {
    label: FAST_FORWARD_CRIT_LABEL,

    color: FAST_FORWARD_CRIT_COLOR,
    icon: "fastforward",
    description: "Instantly credits 4 payouts' worth of income",
  },
  frozen: {
    label: FROZEN_CRIT_LABEL,

    color: FROZEN_CRIT_COLOR,
    icon: "icecube",
    description: "Locks this floor's upgrade price for 15s",
  },
  spendingFreeze: {
    label: SPENDING_FREEZE_CRIT_LABEL,
    color: SPENDING_FREEZE_CRIT_COLOR,
    icon: "spendingFreeze",
    description: "Locks every unlocked floor's upgrade price for 5s",
  },
  snowball: {
    label: SNOWBALL_CRIT_LABEL,

    color: SNOWBALL_CRIT_COLOR,
    icon: "snowball",
    description: "Pays every floor once, times floors unlocked",
  },
  freeSale: {
    label: FREE_SALE_CRIT_LABEL,

    color: FREE_SALE_CRIT_COLOR,
    icon: "cashRegister",
    description: "Starts a free Sales event on this floor",
  },
  bullMarket: {
    label: BULL_MARKET_CRIT_LABEL,

    color: BULL_MARKET_CRIT_COLOR,
    icon: "bull",
    description: "Doubles every unlocked floor's own upgrade count",
  },
  payday: {
    label: PAYDAY_CRIT_LABEL,

    color: PAYDAY_CRIT_COLOR,
    icon: "payday",
    description: "Triples your total income",
  },
  goldStandard: {
    label: GOLD_STANDARD_CRIT_LABEL,

    color: GOLD_STANDARD_CRIT_COLOR,
    icon: "goldStandard",
    description: "Quadruples your total income",
  },
  nightShift: {
    label: NIGHT_SHIFT_CRIT_LABEL,

    color: NIGHT_SHIFT_CRIT_COLOR,
    icon: "sleepyMoon",
    description: "Short worker boost, counts as +1 worker",
  },
  intern: {
    label: INTERN_CRIT_LABEL,

    color: INTERN_CRIT_COLOR,
    icon: "intern",
    description: "Grants the floor a free worker",
  },
  talentScout: {
    label: TALENT_SCOUT_CRIT_LABEL,
    color: TALENT_SCOUT_CRIT_COLOR,
    icon: "talentScout",
    description: "Adds and boosts a worker on this floor",
  },
  unionBoss: {
    label: UNION_BOSS_CRIT_LABEL,

    color: UNION_BOSS_CRIT_COLOR,
    icon: "unionBoss",
    description: "Grants the floor a free manager",
  },
  rushHour: {
    label: RUSH_HOUR_CRIT_LABEL,

    color: RUSH_HOUR_CRIT_COLOR,
    icon: "sportscar",
    description: "Caps every floor's income timer at 0.5s for 15s",
  },
  rateLock: {
    label: RATE_LOCK_CRIT_LABEL,
    color: RATE_LOCK_CRIT_COLOR,
    icon: "rateLock",
    description: "Locks this floor to at least 0.5x speed for 10s",
  },
  goldenTicket: {
    label: GOLDEN_TICKET_CRIT_LABEL,

    color: GOLDEN_TICKET_CRIT_COLOR,
    icon: "goldenTicket",
    description: "Guarantees this floor's next crit is ultra",
  },
  silverTicket: {
    label: SILVER_TICKET_CRIT_LABEL,

    color: SILVER_TICKET_CRIT_COLOR,
    icon: "silverTicket",
    description: "Guarantees this floor's next crit is mega",
  },
  goldenParachute: {
    label: GOLDEN_PARACHUTE_CRIT_LABEL,

    color: GOLDEN_PARACHUTE_CRIT_COLOR,
    icon: "goldenParachute",
    description: "Instantly adds 15s of your company's income",
  },
  executiveBonus: {
    label: EXECUTIVE_BONUS_CRIT_LABEL,
    color: EXECUTIVE_BONUS_CRIT_COLOR,
    icon: "executiveBonus",
    description: "Pays 25% of company value",
  },
  powerSurge: {
    label: POWER_SURGE_CRIT_LABEL,
    color: POWER_SURGE_CRIT_COLOR,
    icon: "powerSurge",
    description: "Boosts workers across every company building",
  },
  priceMatch: {
    label: PRICE_MATCH_CRIT_LABEL,
    color: PRICE_MATCH_CRIT_COLOR,
    icon: "priceMatch",
    description: "Matches this floor to the cheapest upgrade price for 5s",
  },
  firstClass: {
    label: FIRST_CLASS_CRIT_LABEL,
    color: FIRST_CLASS_CRIT_COLOR,
    icon: "firstClass",
    description: "Unlocks the next floor at the cheapest starting price",
  },
  payout: {
    label: PAYOUT_CRIT_LABEL,

    color: PAYOUT_CRIT_COLOR,
    icon: "payout",
    description: "Instantly adds every company's income + upgrades",
  },
  grandOpening: {
    label: GRAND_OPENING_CRIT_LABEL,

    color: GRAND_OPENING_CRIT_COLOR,
    icon: "grandOpening",
    description: "Buys the next building free, or unlocks all floors",
  },
  fullyStaffed: {
    label: FULLY_STAFFED_CRIT_LABEL,

    color: FULLY_STAFFED_CRIT_COLOR,
    icon: "fullyStaffed",
    description: "Hires workers and managers on every unlocked floor",
  },
  espressoShot: {
    label: ESPRESSO_SHOT_CRIT_LABEL,

    color: ESPRESSO_SHOT_CRIT_COLOR,
    icon: "espressoShot",
    description: "Boosts every worker for 15 seconds",
  },
  dejaVu: {
    label: DEJA_VU_CRIT_LABEL,

    color: DEJA_VU_CRIT_COLOR,
    icon: "dejaVu",
    description: "Repeats a random crit twice",
  },
  cloneArmy: {
    label: CLONE_ARMY_CRIT_LABEL,

    color: CLONE_ARMY_CRIT_COLOR,
    icon: "cloneArmy",
    description: "Copies the strongest workforce to every floor",
  },
  luckyClover: {
    label: LUCKY_CLOVER_CRIT_LABEL,

    color: LUCKY_CLOVER_CRIT_COLOR,
    icon: "luckyClover",
    description: "Triggers 4 x125 crits in succession",
  },
  secondWind: {
    label: SECOND_WIND_CRIT_LABEL,

    color: SECOND_WIND_CRIT_COLOR,
    icon: "secondWind",
    description: "Refunds every upgrade, floor and building bought",
  },
  executiveOrder: {
    label: EXECUTIVE_ORDER_CRIT_LABEL,

    color: EXECUTIVE_ORDER_CRIT_COLOR,
    icon: "executiveOrder",
    description: "Promotes every floor one crit tier",
  },
  roundUp: {
    label: ROUND_UP_CRIT_LABEL,

    color: ROUND_UP_CRIT_COLOR,
    icon: "roundUp",
    description: "Tops every floor up to the next 10 upgrades",
  },
  safetyNet: {
    label: SAFETY_NET_CRIT_LABEL,
    color: SAFETY_NET_CRIT_COLOR,
    icon: "safetyNet",
    description: "Adds 5 upgrades to the priciest floor",
  },
  floorShare: {
    label: FLOOR_SHARE_CRIT_LABEL,
    color: FLOOR_SHARE_CRIT_COLOR,
    icon: "floorShare",
    description: "Shares lower floors' levels for one reward",
  },
  sameBoat: {
    label: SAME_BOAT_CRIT_LABEL,
    color: SAME_BOAT_CRIT_COLOR,
    icon: "sameBoat",
    description: "Doubles the shared lower-floor level for one reward",
  },
  goldenHandshake: {
    label: GOLDEN_HANDSHAKE_CRIT_LABEL,

    color: GOLDEN_HANDSHAKE_CRIT_COLOR,
    icon: "goldenHandshake",
    description: "Gives every unlocked floor a free manager",
  },
  supplyRun: {
    label: SUPPLY_RUN_CRIT_LABEL,

    color: SUPPLY_RUN_CRIT_COLOR,
    icon: "supplyRun",
    description: "Free office chairs and supplies for the floor",
  },
  casualFriday: {
    label: CASUAL_FRIDAY_CRIT_LABEL,

    color: CASUAL_FRIDAY_CRIT_COLOR,
    icon: "casualFriday",
    description: "Five free upgrades on every unlocked floor",
  },
  fancyFriday: {
    label: FANCY_FRIDAY_CRIT_LABEL,

    color: FANCY_FRIDAY_CRIT_COLOR,
    icon: "fancyFriday",
    description: "Ten free upgrades on every unlocked floor",
  },
  fireDrill: {
    label: FIRE_DRILL_CRIT_LABEL,

    color: FIRE_DRILL_CRIT_COLOR,
    icon: "fireDrill",
    description: "Completes every floor's income timer at once",
  },
  bonusRound: {
    label: BONUS_ROUND_CRIT_LABEL,
    color: BONUS_ROUND_CRIT_COLOR,
    icon: "bonusRound",
    description: "Completes this floor's income timer twice",
  },
  overflow: {
    label: OVERFLOW_CRIT_LABEL,
    color: OVERFLOW_CRIT_COLOR,
    icon: "overflow",
    description: "Pays five timer payouts on this floor",
  },
  performanceBonus: {
    label: PERFORMANCE_BONUS_CRIT_LABEL,
    color: PERFORMANCE_BONUS_CRIT_COLOR,
    icon: "performanceBonus",
    description: "Completes one timer per worker and manager",
  },
  doubleDown: {
    label: DOUBLE_DOWN_CRIT_LABEL,

    color: DOUBLE_DOWN_CRIT_COLOR,
    icon: "doubleDown",
    description: "Replays the crit that spawned it twice more",
  },
  coffeeRun: {
    label: COFFEE_RUN_CRIT_LABEL,

    color: COFFEE_RUN_CRIT_COLOR,
    icon: "coffeeRun",
    description: "Boosts every worker for a full minute",
  },
  teamBuilding: {
    label: TEAM_BUILDING_CRIT_LABEL,

    color: TEAM_BUILDING_CRIT_COLOR,
    icon: "teamBuilding",
    description: "Hires a free worker on every unlocked floor",
  },
  teamLunch: {
    label: TEAM_LUNCH_CRIT_LABEL,
    color: TEAM_LUNCH_CRIT_COLOR,
    icon: "teamLunch",
    description: "Doubles every worker's boost duration",
  },
  springCleaning: {
    label: SPRING_CLEANING_CRIT_LABEL,

    color: SPRING_CLEANING_CRIT_COLOR,
    icon: "springCleaning",
    description: "Rebuilds every floor fresh, one tier higher",
  },
  nightOwl: {
    label: NIGHT_OWL_CRIT_LABEL,

    color: NIGHT_OWL_CRIT_COLOR,
    icon: "nightOwl",
    description: "Night Shift's boost, worth two extra workers",
  },
  headhunter: {
    label: HEADHUNTER_CRIT_LABEL,

    color: HEADHUNTER_CRIT_COLOR,
    icon: "headhunter",
    description: "Matches this floor to the best-staffed one",
  },
  dressCode: {
    label: DRESS_CODE_CRIT_LABEL,
    color: DRESS_CODE_CRIT_COLOR,
    icon: "dressCode",
    description: "Adds managers, then workers, building-wide",
  },
  teaBreak: {
    label: TEA_BREAK_CRIT_LABEL,
    color: TEA_BREAK_CRIT_COLOR,
    icon: "teaBreak",
    description: "Pauses every floor, then pays them together",
  },
  recruitmentDrive: {
    label: RECRUITMENT_DRIVE_CRIT_LABEL,
    color: RECRUITMENT_DRIVE_CRIT_COLOR,
    icon: "recruitmentDrive",
    description: "Fills this floor and unlocked floors above",
  },
  merger: {
    label: MERGER_CRIT_LABEL,
    color: MERGER_CRIT_COLOR,
    icon: "merger",
    description: "Raises lower unlocked floors to this level",
  },
  shareholders: {
    label: SHAREHOLDERS_CRIT_LABEL,
    color: SHAREHOLDERS_CRIT_COLOR,
    icon: "shareholders",
    description: "Pays 1% of income per staffing unit",
  },
};

// walks CRIT_TIER_ORDER rarest-first, returning the first tier whose own
// chance hits (or null on a full miss) — the single roll cascade shared by
// both the base tier roll in rollCrit below AND the "special crit crit"
// bonus roll (rollCrit's own bonusTier line), so both always use IDENTICAL
// odds, per-tier, with zero duplicated logic
function rollTier(): CritTier | null {
  for (const tier of CRIT_TIER_ORDER) {
    if (Math.random() < CRIT_TIER_CONFIG[tier].chance) return tier;
  }
  return null;
}

// the ONE shared "roll a crit" entry point: walks CRIT_TIER_ORDER rarest-first
// for the tier (previously duplicated separately by rollCritUpgrade and
// rollFloorBuyCrit), then — only if a tier actually landed — rolls the
// special-proc gateway, every proc's own independent chance, and caps the
// result to MAX_SPECIAL_CRIT_PROCS. `onLanded` is called exactly once, with the full
// result, if and only if a tier landed — a miss is silent, onLanded is never
// invoked. Callers decide what "landing" means for their own case: mutating a
// Floor's armed state (rollCritUpgrade) vs. just capturing the result to
// return (rollFloorBuyCrit) — this function itself has no Floor/state
// dependency at all.
// `allowSpecialProcs = false` (see floorInteractions.ts's Sale/Overtime/
// Frozen click branches) skips the entire gateway+proc roll —
// still rolls a plain tier crit normally, just never a piggyback proc on top,
// so re-arming the next crit while already inside one of those special
// events can only ever land a "regular" x5/x25/x125, never stack another
// special event (or any other proc) on top of the one already running
export function rollCrit(
  onLanded: (result: CritRollResult) => void,
  allowSpecialProcs = true,
): void {
  const tier = rollTier();
  if (tier === null) return;
  const landed: CritProcKind[] = [];
  if (allowSpecialProcs && Math.random() < SPECIAL_CRIT_GATEWAY_CHANCE) {
    if (Math.random() < CHAIN_CRIT_CHANCE) landed.push("chain");
    if (Math.random() < DOMINO_EFFECT_CRIT_CHANCE) landed.push("dominoEffect");
    if (Math.random() < BLUEPRINT_CRIT_CHANCE) landed.push("blueprint");
    if (Math.random() < BOOST_CRIT_CHANCE) landed.push("boost");
    if (Math.random() < BOUNCE_CRIT_CHANCE) landed.push("bounce");
    if (Math.random() < EXPLOSION_CRIT_CHANCE) landed.push("explosion");
    if (Math.random() < BOOTY_CRIT_CHANCE) landed.push("booty");
    if (Math.random() < CASH_FLOW_CRIT_CHANCE) landed.push("cashFlow");
    if (Math.random() < UPGRADE_CRIT_CHANCE) landed.push("upgrade");
    if (Math.random() < PEPPERMINT_CRIT_CHANCE) landed.push("peppermint");
    if (Math.random() < HEAVENLY_CRIT_CHANCE) landed.push("heavenly");
    if (Math.random() < PAIR_CRIT_CHANCE) landed.push("pair");
    if (Math.random() < THREE_OF_A_KIND_CRIT_CHANCE)
      landed.push("threeOfAKind");
    if (Math.random() < FOUR_OF_A_KIND_CRIT_CHANCE) landed.push("fourOfAKind");
    if (Math.random() < FULL_HOUSE_CRIT_CHANCE) landed.push("fullHouse");
    if (Math.random() < ROYAL_FLUSH_CRIT_CHANCE) landed.push("royalFlush");
    if (Math.random() < LUCKY_NUMBER_CRIT_CHANCE) landed.push("luckyNumber");
    if (Math.random() < OPEN_BOOK_CRIT_CHANCE) landed.push("openBook");
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
    if (Math.random() < EASTER_SALE_CRIT_CHANCE) landed.push("easterSale");
    if (Math.random() < SUNSHINE_CRIT_CHANCE) landed.push("sunshine");
    if (Math.random() < SNOWDAY_CRIT_CHANCE) landed.push("snowday");
    if (Math.random() < FAST_FORWARD_CRIT_CHANCE) landed.push("fastForward");
    if (Math.random() < FROZEN_CRIT_CHANCE) landed.push("frozen");
    if (Math.random() < SPENDING_FREEZE_CRIT_CHANCE)
      landed.push("spendingFreeze");
    if (Math.random() < SNOWBALL_CRIT_CHANCE) landed.push("snowball");
    if (Math.random() < FREE_SALE_CRIT_CHANCE) landed.push("freeSale");
    if (Math.random() < BULL_MARKET_CRIT_CHANCE) landed.push("bullMarket");
    if (Math.random() < PAYDAY_CRIT_CHANCE) landed.push("payday");
    if (Math.random() < GOLD_STANDARD_CRIT_CHANCE) landed.push("goldStandard");
    if (Math.random() < NIGHT_SHIFT_CRIT_CHANCE) landed.push("nightShift");
    if (Math.random() < INTERN_CRIT_CHANCE) landed.push("intern");
    if (Math.random() < TALENT_SCOUT_CRIT_CHANCE) landed.push("talentScout");
    if (Math.random() < UNION_BOSS_CRIT_CHANCE) landed.push("unionBoss");
    if (Math.random() < RUSH_HOUR_CRIT_CHANCE) landed.push("rushHour");
    if (Math.random() < RATE_LOCK_CRIT_CHANCE) landed.push("rateLock");
    if (Math.random() < GOLDEN_TICKET_CRIT_CHANCE) landed.push("goldenTicket");
    if (Math.random() < SILVER_TICKET_CRIT_CHANCE) landed.push("silverTicket");
    if (Math.random() < GRAND_OPENING_CRIT_CHANCE) landed.push("grandOpening");
    if (Math.random() < FULLY_STAFFED_CRIT_CHANCE) landed.push("fullyStaffed");
    if (Math.random() < SHIFT_CHANGE_CRIT_CHANCE) landed.push("shiftChange");
    if (Math.random() < ESPRESSO_SHOT_CRIT_CHANCE) landed.push("espressoShot");
    if (Math.random() < DEJA_VU_CRIT_CHANCE) landed.push("dejaVu");
    if (Math.random() < CLONE_ARMY_CRIT_CHANCE) landed.push("cloneArmy");
    if (Math.random() < GOLDEN_PARACHUTE_CRIT_CHANCE)
      landed.push("goldenParachute");
    if (Math.random() < EXECUTIVE_BONUS_CRIT_CHANCE)
      landed.push("executiveBonus");
    if (Math.random() < POWER_SURGE_CRIT_CHANCE) landed.push("powerSurge");
    if (Math.random() < PRICE_MATCH_CRIT_CHANCE) landed.push("priceMatch");
    if (Math.random() < FIRST_CLASS_CRIT_CHANCE) landed.push("firstClass");
    if (Math.random() < PAYOUT_CRIT_CHANCE) landed.push("payout");
    if (Math.random() < LUCKY_CLOVER_CRIT_CHANCE) landed.push("luckyClover");
    if (Math.random() < SECOND_WIND_CRIT_CHANCE) landed.push("secondWind");
    if (Math.random() < EXECUTIVE_ORDER_CRIT_CHANCE)
      landed.push("executiveOrder");
    if (Math.random() < ROUND_UP_CRIT_CHANCE) landed.push("roundUp");
    if (Math.random() < SAFETY_NET_CRIT_CHANCE) landed.push("safetyNet");
    if (Math.random() < FLOOR_SHARE_CRIT_CHANCE) landed.push("floorShare");
    if (Math.random() < SAME_BOAT_CRIT_CHANCE) landed.push("sameBoat");
    if (Math.random() < GOLDEN_HANDSHAKE_CRIT_CHANCE)
      landed.push("goldenHandshake");
    if (Math.random() < SUPPLY_RUN_CRIT_CHANCE) landed.push("supplyRun");
    if (Math.random() < CASUAL_FRIDAY_CRIT_CHANCE) landed.push("casualFriday");
    if (Math.random() < FANCY_FRIDAY_CRIT_CHANCE) landed.push("fancyFriday");
    if (Math.random() < FIRE_DRILL_CRIT_CHANCE) landed.push("fireDrill");
    if (Math.random() < BONUS_ROUND_CRIT_CHANCE) landed.push("bonusRound");
    if (Math.random() < OVERFLOW_CRIT_CHANCE) landed.push("overflow");
    if (Math.random() < PERFORMANCE_BONUS_CRIT_CHANCE)
      landed.push("performanceBonus");
    if (Math.random() < DOUBLE_DOWN_CRIT_CHANCE) landed.push("doubleDown");
    if (Math.random() < COFFEE_RUN_CRIT_CHANCE) landed.push("coffeeRun");
    if (Math.random() < TEAM_BUILDING_CRIT_CHANCE) landed.push("teamBuilding");
    if (Math.random() < TEAM_LUNCH_CRIT_CHANCE) landed.push("teamLunch");
    if (Math.random() < SPRING_CLEANING_CRIT_CHANCE)
      landed.push("springCleaning");
    if (Math.random() < NIGHT_OWL_CRIT_CHANCE) landed.push("nightOwl");
    if (Math.random() < HEADHUNTER_CRIT_CHANCE) landed.push("headhunter");
    if (Math.random() < DRESS_CODE_CRIT_CHANCE) landed.push("dressCode");
    if (Math.random() < TEA_BREAK_CRIT_CHANCE) landed.push("teaBreak");
    if (Math.random() < RECRUITMENT_DRIVE_CRIT_CHANCE)
      landed.push("recruitmentDrive");
    if (Math.random() < MERGER_CRIT_CHANCE) landed.push("merger");
    if (Math.random() < SHAREHOLDERS_CRIT_CHANCE) landed.push("shareholders");
  }
  const kept = new Set(pickAtMost(landed, MAX_SPECIAL_CRIT_PROCS));
  // real-roll-only tally for the "Special Crits" info menu's collectible
  // count badges — see shared/critTypes/critProcCounts.ts
  for (const kind of kept) recordCritProcLanded(kind);
  // "special crit crit": once at least one piggyback proc has actually
  // landed, it gets its own independent shot at a bonus x5/x25/x125 tier,
  // reusing the EXACT same rarest-first cascade/odds as the base tier roll
  // above (rollTier) — never rolled at all when no proc landed, and never
  // itself eligible to roll a further nested bonus (one level only). See
  // getBonusTierCrit/floorInteractions.ts's applyBonusTierCrit for the
  // reward (multiplies total income by the bonus tier's own multiplier) and
  // critCelebration.ts for the stacked celebration this triggers
  const bonusTier = kept.size > 0 ? rollTier() : null;
  onLanded({
    tier,
    bonusTier,
    chain: kept.has("chain"),
    dominoEffect: kept.has("dominoEffect"),
    blueprint: kept.has("blueprint"),
    boost: kept.has("boost"),
    bounce: kept.has("bounce"),
    explosion: kept.has("explosion"),
    booty: kept.has("booty"),
    cashFlow: kept.has("cashFlow"),
    upgrade: kept.has("upgrade"),
    peppermint: kept.has("peppermint"),
    heavenly: kept.has("heavenly"),
    pair: kept.has("pair"),
    threeOfAKind: kept.has("threeOfAKind"),
    fourOfAKind: kept.has("fourOfAKind"),
    fullHouse: kept.has("fullHouse"),
    royalFlush: kept.has("royalFlush"),
    luckyNumber: kept.has("luckyNumber"),
    openBook: kept.has("openBook"),
    tickTock: kept.has("tickTock"),
    chairGiveaway: kept.has("chairGiveaway"),
    suppliesGiveaway: kept.has("suppliesGiveaway"),
    winterSale: kept.has("winterSale"),
    springSale: kept.has("springSale"),
    summerSale: kept.has("summerSale"),
    autumnSale: kept.has("autumnSale"),
    halloweenSale: kept.has("halloweenSale"),
    easterSale: kept.has("easterSale"),
    sunshine: kept.has("sunshine"),
    snowday: kept.has("snowday"),
    fastForward: kept.has("fastForward"),
    frozen: kept.has("frozen"),
    spendingFreeze: kept.has("spendingFreeze"),
    snowball: kept.has("snowball"),
    freeSale: kept.has("freeSale"),
    bullMarket: kept.has("bullMarket"),
    payday: kept.has("payday"),
    goldStandard: kept.has("goldStandard"),
    nightShift: kept.has("nightShift"),
    intern: kept.has("intern"),
    talentScout: kept.has("talentScout"),
    unionBoss: kept.has("unionBoss"),
    rushHour: kept.has("rushHour"),
    rateLock: kept.has("rateLock"),
    goldenTicket: kept.has("goldenTicket"),
    silverTicket: kept.has("silverTicket"),
    goldenParachute: kept.has("goldenParachute"),
    executiveBonus: kept.has("executiveBonus"),
    powerSurge: kept.has("powerSurge"),
    priceMatch: kept.has("priceMatch"),
    firstClass: kept.has("firstClass"),
    payout: kept.has("payout"),
    grandOpening: kept.has("grandOpening"),
    fullyStaffed: kept.has("fullyStaffed"),
    shiftChange: kept.has("shiftChange"),
    espressoShot: kept.has("espressoShot"),
    dejaVu: kept.has("dejaVu"),
    cloneArmy: kept.has("cloneArmy"),
    luckyClover: kept.has("luckyClover"),
    secondWind: kept.has("secondWind"),
    executiveOrder: kept.has("executiveOrder"),
    roundUp: kept.has("roundUp"),
    safetyNet: kept.has("safetyNet"),
    floorShare: kept.has("floorShare"),
    sameBoat: kept.has("sameBoat"),
    goldenHandshake: kept.has("goldenHandshake"),
    supplyRun: kept.has("supplyRun"),
    casualFriday: kept.has("casualFriday"),
    fancyFriday: kept.has("fancyFriday"),
    fireDrill: kept.has("fireDrill"),
    bonusRound: kept.has("bonusRound"),
    overflow: kept.has("overflow"),
    performanceBonus: kept.has("performanceBonus"),
    doubleDown: kept.has("doubleDown"),
    coffeeRun: kept.has("coffeeRun"),
    teamBuilding: kept.has("teamBuilding"),
    teamLunch: kept.has("teamLunch"),
    springCleaning: kept.has("springCleaning"),
    nightOwl: kept.has("nightOwl"),
    headhunter: kept.has("headhunter"),
    dressCode: kept.has("dressCode"),
    teaBreak: kept.has("teaBreak"),
    recruitmentDrive: kept.has("recruitmentDrive"),
    merger: kept.has("merger"),
    shareholders: kept.has("shareholders"),
  });
}

// whether the CURRENTLY ARMED crit (if any) is also a chain/boost/bounce
// crit — see rollCrit/floorInteractions.ts's plain-click crit branch
export function isChainCrit(floor: Floor): boolean {
  return chainCrits.has(floor);
}

export function isDominoEffectCrit(floor: Floor): boolean {
  return dominoEffectCrits.has(floor);
}

export function isBlueprintCrit(floor: Floor): boolean {
  return blueprintCrits.has(floor);
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

export function isCashFlowCrit(floor: Floor): boolean {
  return cashFlowCrits.has(floor);
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

export function isRoyalFlushCrit(floor: Floor): boolean {
  return royalFlushCrits.has(floor);
}

export function isLuckyNumberCrit(floor: Floor): boolean {
  return luckyNumberCrits.has(floor);
}

export function isOpenBookCrit(floor: Floor): boolean {
  return openBookCrits.has(floor);
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

export function isEasterSaleCrit(floor: Floor): boolean {
  return easterSaleCrits.has(floor);
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

export function isSpendingFreezeCrit(floor: Floor): boolean {
  return spendingFreezeCrits.has(floor);
}

export function isSnowballCrit(floor: Floor): boolean {
  return snowballCrits.has(floor);
}

export function isFreeSaleCrit(floor: Floor): boolean {
  return freeSaleCrits.has(floor);
}

export function isBullMarketCrit(floor: Floor): boolean {
  return bullMarketCrits.has(floor);
}

export function isPaydayCrit(floor: Floor): boolean {
  return paydayCrits.has(floor);
}

export function isGoldStandardCrit(floor: Floor): boolean {
  return goldStandardCrits.has(floor);
}

export function isNightShiftCrit(floor: Floor): boolean {
  return nightShiftCrits.has(floor);
}

export function isInternCrit(floor: Floor): boolean {
  return internCrits.has(floor);
}

export function isTalentScoutCrit(floor: Floor): boolean {
  return talentScoutCrits.has(floor);
}

export function isUnionBossCrit(floor: Floor): boolean {
  return unionBossCrits.has(floor);
}

export function isRushHourCrit(floor: Floor): boolean {
  return rushHourCrits.has(floor);
}

export function isRateLockCrit(floor: Floor): boolean {
  return rateLockCrits.has(floor);
}

export function isGoldenTicketCrit(floor: Floor): boolean {
  return goldenTicketCrits.has(floor);
}

export function isSilverTicketCrit(floor: Floor): boolean {
  return silverTicketCrits.has(floor);
}

export function isGoldenParachuteCrit(floor: Floor): boolean {
  return goldenParachuteCrits.has(floor);
}

export function isExecutiveBonusCrit(floor: Floor): boolean {
  return executiveBonusCrits.has(floor);
}

export function isPowerSurgeCrit(floor: Floor): boolean {
  return powerSurgeCrits.has(floor);
}

export function isPriceMatchCrit(floor: Floor): boolean {
  return priceMatchCrits.has(floor);
}

export function isFirstClassCrit(floor: Floor): boolean {
  return firstClassCrits.has(floor);
}

export function isPayoutCrit(floor: Floor): boolean {
  return payoutCrits.has(floor);
}

export function isGrandOpeningCrit(floor: Floor): boolean {
  return grandOpeningCrits.has(floor);
}

export function isFullyStaffedCrit(floor: Floor): boolean {
  return fullyStaffedCrits.has(floor);
}

export function isShiftChangeCrit(floor: Floor): boolean {
  return shiftChangeCrits.has(floor);
}

export function isEspressoShotCrit(floor: Floor): boolean {
  return espressoShotCrits.has(floor);
}

export function isDejaVuCrit(floor: Floor): boolean {
  return dejaVuCrits.has(floor);
}

export function isCloneArmyCrit(floor: Floor): boolean {
  return cloneArmyCrits.has(floor);
}

export function isLuckyCloverCrit(floor: Floor): boolean {
  return luckyCloverCrits.has(floor);
}

export function isSecondWindCrit(floor: Floor): boolean {
  return secondWindCrits.has(floor);
}

export function isExecutiveOrderCrit(floor: Floor): boolean {
  return executiveOrderCrits.has(floor);
}

export function isRoundUpCrit(floor: Floor): boolean {
  return roundUpCrits.has(floor);
}

export function isSafetyNetCrit(floor: Floor): boolean {
  return safetyNetCrits.has(floor);
}

export function isFloorShareCrit(floor: Floor): boolean {
  return floorShareCrits.has(floor);
}

export function isSameBoatCrit(floor: Floor): boolean {
  return sameBoatCrits.has(floor);
}

export function isGoldenHandshakeCrit(floor: Floor): boolean {
  return goldenHandshakeCrits.has(floor);
}

export function isSupplyRunCrit(floor: Floor): boolean {
  return supplyRunCrits.has(floor);
}

export function isCasualFridayCrit(floor: Floor): boolean {
  return casualFridayCrits.has(floor);
}

export function isFancyFridayCrit(floor: Floor): boolean {
  return fancyFridayCrits.has(floor);
}

export function isFireDrillCrit(floor: Floor): boolean {
  return fireDrillCrits.has(floor);
}

export function isBonusRoundCrit(floor: Floor): boolean {
  return bonusRoundCrits.has(floor);
}

export function isOverflowCrit(floor: Floor): boolean {
  return overflowCrits.has(floor);
}

export function isPerformanceBonusCrit(floor: Floor): boolean {
  return performanceBonusCrits.has(floor);
}

export function isDoubleDownCrit(floor: Floor): boolean {
  return doubleDownCrits.has(floor);
}

export function isCoffeeRunCrit(floor: Floor): boolean {
  return coffeeRunCrits.has(floor);
}

export function isTeamBuildingCrit(floor: Floor): boolean {
  return teamBuildingCrits.has(floor);
}

export function isTeamLunchCrit(floor: Floor): boolean {
  return teamLunchCrits.has(floor);
}

export function isSpringCleaningCrit(floor: Floor): boolean {
  return springCleaningCrits.has(floor);
}

export function isNightOwlCrit(floor: Floor): boolean {
  return nightOwlCrits.has(floor);
}

export function isHeadhunterCrit(floor: Floor): boolean {
  return headhunterCrits.has(floor);
}

export function isDressCodeCrit(floor: Floor): boolean {
  return dressCodeCrits.has(floor);
}

export function isRecruitmentDriveCrit(floor: Floor): boolean {
  return recruitmentDriveCrits.has(floor);
}

export function isMergerCrit(floor: Floor): boolean {
  return mergerCrits.has(floor);
}

export function isShareholdersCrit(floor: Floor): boolean {
  return shareholdersCrits.has(floor);
}

// the armed "special crit crit" bonus tier riding on this floor's already-
// landed proc(s), if any (see rollCrit's own bonusTier)
export function getBonusTierCrit(floor: Floor): CritTier | null {
  return bonusTierCrits.get(floor) ?? null;
}

// call once a landed floor-buy/unlock crit (see rollFloorBuyCrit) has picked
// up an armed bonus tier — unlike consumeCritProcs below, this leaves every
// OTHER per-floor armed test proc untouched, since a floor-buy roll never
// consults those
export function consumeBonusTierCrit(floor: Floor): void {
  bonusTierCrits.delete(floor);
}

// call right when an armed crit's click is handled, before rolling the next one
export function consumeCritProcs(floor: Floor): void {
  for (const kind of CRIT_PROC_KINDS) CRIT_PROC_SETS[kind].delete(floor);
  bonusTierCrits.delete(floor);
}

// dev/test-only: force the proc onto whatever tier the caller already armed
// (see upgradeButton.ts's forceChainCritUpgrade/forceBoostCritUpgrade/
// forceBounceCritUpgrade), bypassing chance entirely
export function forceChainCritProc(floor: Floor): void {
  chainCrits.add(floor);
}

export function forceDominoEffectCritProc(floor: Floor): void {
  dominoEffectCrits.add(floor);
}

export function forceBlueprintCritProc(floor: Floor): void {
  blueprintCrits.add(floor);
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

export function forceCashFlowCritProc(floor: Floor): void {
  cashFlowCrits.add(floor);
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

export function forceRoyalFlushCritProc(floor: Floor): void {
  royalFlushCrits.add(floor);
}

export function forceLuckyNumberCritProc(floor: Floor): void {
  luckyNumberCrits.add(floor);
}

export function forceOpenBookCritProc(floor: Floor): void {
  openBookCrits.add(floor);
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

export function forceEasterSaleCritProc(floor: Floor): void {
  easterSaleCrits.add(floor);
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

export function forceSpendingFreezeCritProc(floor: Floor): void {
  spendingFreezeCrits.add(floor);
}

export function forceSnowballCritProc(floor: Floor): void {
  snowballCrits.add(floor);
}

export function forceFreeSaleCritProc(floor: Floor): void {
  freeSaleCrits.add(floor);
}

export function forceBullMarketCritProc(floor: Floor): void {
  bullMarketCrits.add(floor);
}

export function forcePaydayCritProc(floor: Floor): void {
  paydayCrits.add(floor);
}

export function forceGoldStandardCritProc(floor: Floor): void {
  goldStandardCrits.add(floor);
}

export function forceNightShiftCritProc(floor: Floor): void {
  nightShiftCrits.add(floor);
}

export function forceInternCritProc(floor: Floor): void {
  internCrits.add(floor);
}

export function forceTalentScoutCritProc(floor: Floor): void {
  talentScoutCrits.add(floor);
}

export function forceUnionBossCritProc(floor: Floor): void {
  unionBossCrits.add(floor);
}

export function forceRushHourCritProc(floor: Floor): void {
  rushHourCrits.add(floor);
}

export function forceRateLockCritProc(floor: Floor): void {
  rateLockCrits.add(floor);
}

export function forceGoldenTicketCritProc(floor: Floor): void {
  goldenTicketCrits.add(floor);
}

export function forceSilverTicketCritProc(floor: Floor): void {
  silverTicketCrits.add(floor);
}

export function forceGoldenParachuteCritProc(floor: Floor): void {
  goldenParachuteCrits.add(floor);
}

export function forceExecutiveBonusCritProc(floor: Floor): void {
  executiveBonusCrits.add(floor);
}

export function forcePowerSurgeCritProc(floor: Floor): void {
  powerSurgeCrits.add(floor);
}

export function forcePriceMatchCritProc(floor: Floor): void {
  priceMatchCrits.add(floor);
}

export function forceFirstClassCritProc(floor: Floor): void {
  firstClassCrits.add(floor);
}

export function forcePayoutCritProc(floor: Floor): void {
  payoutCrits.add(floor);
}

export function forceGrandOpeningCritProc(floor: Floor): void {
  grandOpeningCrits.add(floor);
}

export function forceFullyStaffedCritProc(floor: Floor): void {
  fullyStaffedCrits.add(floor);
}

export function forceShiftChangeCritProc(floor: Floor): void {
  shiftChangeCrits.add(floor);
}

export function forceEspressoShotCritProc(floor: Floor): void {
  espressoShotCrits.add(floor);
}

export function forceDejaVuCritProc(floor: Floor): void {
  dejaVuCrits.add(floor);
}

export function forceCloneArmyCritProc(floor: Floor): void {
  cloneArmyCrits.add(floor);
}

export function forceLuckyCloverCritProc(floor: Floor): void {
  luckyCloverCrits.add(floor);
}

export function forceSecondWindCritProc(floor: Floor): void {
  secondWindCrits.add(floor);
}

export function forceExecutiveOrderCritProc(floor: Floor): void {
  executiveOrderCrits.add(floor);
}

export function forceRoundUpCritProc(floor: Floor): void {
  roundUpCrits.add(floor);
}

export function forceSafetyNetCritProc(floor: Floor): void {
  safetyNetCrits.add(floor);
}

export function forceFloorShareCritProc(floor: Floor): void {
  floorShareCrits.add(floor);
}

export function forceSameBoatCritProc(floor: Floor): void {
  sameBoatCrits.add(floor);
}

export function forceGoldenHandshakeCritProc(floor: Floor): void {
  goldenHandshakeCrits.add(floor);
}

export function forceSupplyRunCritProc(floor: Floor): void {
  supplyRunCrits.add(floor);
}

export function forceCasualFridayCritProc(floor: Floor): void {
  casualFridayCrits.add(floor);
}

export function forceFancyFridayCritProc(floor: Floor): void {
  fancyFridayCrits.add(floor);
}

export function forceFireDrillCritProc(floor: Floor): void {
  fireDrillCrits.add(floor);
}

export function forceBonusRoundCritProc(floor: Floor): void {
  bonusRoundCrits.add(floor);
}

export function forceOverflowCritProc(floor: Floor): void {
  overflowCrits.add(floor);
}

export function forcePerformanceBonusCritProc(floor: Floor): void {
  performanceBonusCrits.add(floor);
}

export function forceDoubleDownCritProc(floor: Floor): void {
  doubleDownCrits.add(floor);
}

export function forceCoffeeRunCritProc(floor: Floor): void {
  coffeeRunCrits.add(floor);
}

export function forceTeamBuildingCritProc(floor: Floor): void {
  teamBuildingCrits.add(floor);
}

export function forceTeamLunchCritProc(floor: Floor): void {
  teamLunchCrits.add(floor);
}

export function forceSpringCleaningCritProc(floor: Floor): void {
  springCleaningCrits.add(floor);
}

export function forceNightOwlCritProc(floor: Floor): void {
  nightOwlCrits.add(floor);
}

export function forceHeadhunterCritProc(floor: Floor): void {
  headhunterCrits.add(floor);
}

export function forceDressCodeCritProc(floor: Floor): void {
  dressCodeCrits.add(floor);
}

export function forceTeaBreakCritProc(floor: Floor): void {
  teaBreakCrits.add(floor);
}

export function forceRecruitmentDriveCritProc(floor: Floor): void {
  recruitmentDriveCrits.add(floor);
}

export function forceMergerCritProc(floor: Floor): void {
  mergerCrits.add(floor);
}

export function forceShareholdersCritProc(floor: Floor): void {
  shareholdersCrits.add(floor);
}

// dev/test-only: force a "special crit crit" bonus tier onto whatever proc(s)
// the caller already armed on this floor, bypassing chance entirely
export function forceBonusTierCritProc(floor: Floor, tier: CritTier): void {
  bonusTierCrits.set(floor, tier);
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
