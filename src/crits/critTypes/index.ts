import {
  snapshotMap,
  snapshotSet as snapshotWeakSet,
} from "../../shared/snapshotState";
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
import { critRandom } from "./critRandom";
import type { ProcMeta } from "../floorCrits/procMeta";
import chainMeta from "../floorCrits/procs/chain/meta";
import dominoEffectMeta from "../floorCrits/procs/dominoEffect/meta";
import bounceMeta from "../floorCrits/procs/bounce/meta";
import explosionMeta from "../floorCrits/procs/explosion/meta";
import mysticMeta from "../floorCrits/procs/mystic/meta";
import keynoteMeta from "../floorCrits/procs/keynote/meta";
import pairMeta from "../floorCrits/procs/pair/meta";
import threeOfAKindMeta from "../floorCrits/procs/threeOfAKind/meta";
import fourOfAKindMeta from "../floorCrits/procs/fourOfAKind/meta";
import fullHouseMeta from "../floorCrits/procs/fullHouse/meta";
import royalFlushMeta from "../floorCrits/procs/royalFlush/meta";
import luckyNumberMeta from "../floorCrits/procs/luckyNumber/meta";
import winterSaleMeta from "../floorCrits/procs/winterSale/meta";
import springSaleMeta from "../floorCrits/procs/springSale/meta";
import summerSaleMeta from "../floorCrits/procs/summerSale/meta";
import autumnSaleMeta from "../floorCrits/procs/autumnSale/meta";
import halloweenSaleMeta from "../floorCrits/procs/halloweenSale/meta";
import easterSaleMeta from "../floorCrits/procs/easterSale/meta";
import frozenMeta from "../floorCrits/procs/frozen/meta";
import spendingFreezeMeta from "../floorCrits/procs/spendingFreeze/meta";
import rushHourMeta from "../floorCrits/procs/rushHour/meta";
import rateLockMeta from "../floorCrits/procs/rateLock/meta";
import luckyCloverMeta from "../floorCrits/procs/luckyClover/meta";
import roundUpMeta from "../floorCrits/procs/roundUp/meta";
import safetyNetMeta from "../floorCrits/procs/safetyNet/meta";
import casualFridayMeta from "../floorCrits/procs/casualFriday/meta";
import fancyFridayMeta from "../floorCrits/procs/fancyFriday/meta";
import doubleDownMeta from "../floorCrits/procs/doubleDown/meta";
import rainCheckMeta from "../floorCrits/procs/rainCheck/meta";
import priceMatchMeta from "../floorCrits/procs/priceMatch/meta";
import {
  PLAYED_CRITS,
  FLOOR_CRIT_KINDS,
  INCOME_CRIT_KINDS,
  BUTTON_CRIT_KINDS,
  LOCK_CRIT_KINDS,
  RATE_CRIT_KINDS,
  isFloorCritKind,
  isIncomeCritKind,
  isButtonCritKind,
  isLockCritKind,
  isRateCritKind,
  type FloorCritKind,
  type IncomeCritKind,
  type ButtonCritKind,
  type LockCritKind,
  type RateCritKind,
  type CritPlayKind,
} from "../critKit";
import { COLOR } from "../../palette";
import {
  recordCritProcLanded,
  type BadgeFoil,
} from "../badgeCrits/critProcCounts";
import {
  BADGE_CRIT_KINDS,
  getBadgeRewards,
  isBadgeCritKind,
  onBadgeCatalog,
  rollBadgeCrit,
  type BadgeCritKind,
} from "../badgeCrits/badgeProcs";

export {
  BADGE_CRIT_KINDS,
  badgeCritFlags,
  badgeCritImages,
  isBadgeCritKind,
  isBadgeCatalogLoaded,
  loadBadgeCatalog,
  loadBadgeRewards,
  getBadgeRewards,
  onBadgeCatalog,
  withBadgeCatalog,
  type BadgeCritKind,
} from "../badgeCrits/badgeProcs";
export {
  createRewardHelpers,
  type BadgeRewardActions,
  type RewardHelpers,
} from "../badgeCrits/rewards/rewardHelpers";
export type { BadgeCritData } from "../badgeCrits/critData/types";
export type {
  BadgeReward,
  BadgeRewardContext,
} from "../badgeCrits/rewards/types";

export {
  getCritProcCount,
  recordCritProcLanded,
} from "../badgeCrits/critProcCounts";
export {
  withDraftCritCounts,
  commitCritCounts,
} from "../badgeCrits/critProcCounts";
export {
  type BadgeFoil,
  BADGE_SHIMMER_AT,
  BADGE_GLITTER_AT,
  getBadgeFoil,
  rollBadgeFoil,
  queueBadgeFoilReveal,
} from "../badgeCrits/critProcCounts";

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
    label: `x${CONFIG.crit.crit.multiplier}`,
  },
  mega: {
    // ~1 in 100 upgrade clicks — deliberately much rarer than crit's so it reads
    // as a genuine jackpot moment, not just a bigger version of the common crit
    ...CONFIG.crit.mega,
    color: COLOR.starYellow,
    label: `x${CONFIG.crit.mega.multiplier}`,
  },
  ultra: {
    // rarer still than mega's — the true jackpot-of-jackpots moment
    ...CONFIG.crit.ultra,
    color: COLOR.red,
    label: `x${CONFIG.crit.ultra.multiplier}`,
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

// procs' own amounts, from their meta.ts (floorCrits/procs/<kind>)
export const CHAIN_CRIT_CONTINUE_CHANCE = chainMeta.values.continueChance;
export const DOMINO_EFFECT_CONTINUE_CHANCE =
  dominoEffectMeta.values.continueChance;
export const BOUNCE_CRIT_CONTINUE_CHANCE = bounceMeta.values.continueChance;
export const EXPLOSION_CRIT_CONTINUE_CHANCE =
  explosionMeta.values.continueChance;
export const MYSTIC_UPGRADE_COUNT = mysticMeta.values.upgrades;
export const KEYNOTE_UPGRADE_COUNT = keynoteMeta.values.upgrades;
// floors (or, at building-unlock scope, buildings) each poker hand promotes
export const POKER_HAND_CRIT_COUNTS = {
  pair: pairMeta.values.floors,
  threeOfAKind: threeOfAKindMeta.values.floors,
  fourOfAKind: fourOfAKindMeta.values.floors,
  fullHouse: fullHouseMeta.values.floors,
  royalFlush: royalFlushMeta.values.floors,
} as const;
export const LUCKY_NUMBER_MIN_FLOORS = luckyNumberMeta.values.minFloors;
export const LUCKY_NUMBER_MAX_FLOORS = luckyNumberMeta.values.maxFloors;
// what each sale multiplies a building's costs by
export const SALE_DISCOUNT_MULTIPLIERS = {
  winterSale: 1 - winterSaleMeta.values.discount,
  springSale: 1 - springSaleMeta.values.discount,
  summerSale: 1 - summerSaleMeta.values.discount,
  autumnSale: 1 - autumnSaleMeta.values.discount,
  halloweenSale: 1 - halloweenSaleMeta.values.discount,
  easterSale: 1 - easterSaleMeta.values.discount,
} as const;

// "frozen crit" — also no instant reward: arming this proc just marks the
// floor so that, once the crit is actually clicked, triggerFrozenCrit below
// starts a FROZEN_DURATION_MS window during which this floor's
// own upgradeCost stops growing entirely (see incomePanel.ts's
// increaseIncomeRate) — upgrades still cost real money and behave
// completely normally otherwise, just at whatever price was already locked
// in when the window started
export const FROZEN_DURATION_MS = frozenMeta.values.durationMs;
// a per-floor start timestamp, not a plain WeakSet flag like every other
// proc — the price-freeze needs to know WHEN its window ends, not just
// whether it landed
const frozenStartedAt = snapshotMap<Floor, number>();

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
export const SPENDING_FREEZE_DURATION_MS = spendingFreezeMeta.values.durationMs;
const spendingFreezeStartedAt = snapshotMap<Floor, number>();

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

// "Rush Hour" crit — also no instant reward: arming this proc just marks the
// floor so that, once the crit is actually clicked, triggerRushHourCrit below
// starts a RUSH_HOUR_DURATION_MS window across the WHOLE building
// during which every unlocked floor's own income timer is capped at
// RUSH_HOUR_INTERVAL_SECONDS (see incomePanel.ts's currentSpeedMultiplier) —
// this stacks with (never undoes) whatever worker-boost/office-upgrade speedup
// already applies, and a floor already faster than the cap is left untouched
export const RUSH_HOUR_DURATION_MS = rushHourMeta.values.durationMs;
export const RUSH_HOUR_INTERVAL_SECONDS = rushHourMeta.values.intervalSeconds;
// a per-floor start timestamp, not a plain WeakSet flag — same shape as
// Frozen's own frozenStartedAt, since this needs to know WHEN its window ends
const rushHourStartedAt = snapshotMap<Floor, number>();

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

export const RATE_LOCK_DURATION_MS = rateLockMeta.values.durationMs;
export const RATE_LOCK_SPEED_MULTIPLIER = rateLockMeta.values.speedMultiplier;
const rateLockStartedAt = snapshotMap<Floor, number>();

export function triggerRateLockCrit(floor: Floor): void {
  rateLockStartedAt.set(floor, Date.now());
}

export function isRateLockActive(floor: Floor, now: number): boolean {
  const startedAt = rateLockStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < RATE_LOCK_DURATION_MS;
}

// how many back-to-back ultra-tier crit payouts the clover instantly grants
export const LUCKY_CLOVER_CRIT_COUNT = luckyCloverMeta.values.crits;
export const LUCKY_CLOVER_CRIT_TIER: CritTier = "ultra";
export const ROUND_UP_CRIT_STEP = roundUpMeta.values.step;
export const SAFETY_NET_CRIT_UPGRADES = safetyNetMeta.values.upgrades;
export const CASUAL_FRIDAY_CRIT_UPGRADES = casualFridayMeta.values.upgrades;
export const FANCY_FRIDAY_CRIT_UPGRADES = fancyFridayMeta.values.upgrades;
export const DOUBLE_DOWN_CRIT_REPEATS = doubleDownMeta.values.repeats;

export function isTeaBreakCrit(floor: Floor): boolean {
  return teaBreakCrits.has(floor);
}

export const RAIN_CHECK_CRIT_SECONDS = rainCheckMeta.values.seconds;
export const PRICE_MATCH_DURATION_MS = priceMatchMeta.values.durationMs;
const priceMatchCosts = snapshotMap<
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

// state for all eight piggyback procs lives here too (not upgradeButton.ts) so
// the whole "what can ride along with a landed crit" system stays in one place.
// Every proc set counts, per floor, how many procs are armed on it, so a
// crit's reads, clears and dispatch skip all ~1,700 kinds when none are
const armedProcCounts = new WeakMap<Floor, number>();

class ProcSet extends WeakSet<Floor> {
  add(floor: Floor): this {
    if (!super.has(floor))
      armedProcCounts.set(floor, (armedProcCounts.get(floor) ?? 0) + 1);
    return super.add(floor);
  }
  delete(floor: Floor): boolean {
    if (!super.delete(floor)) return false;
    armedProcCounts.set(floor, (armedProcCounts.get(floor) ?? 1) - 1);
    return true;
  }
}

// every proc set in this file: a counted snapshotSet
function snapshotSet<_ extends Floor>(): WeakSet<Floor> {
  return snapshotWeakSet<Floor>(new ProcSet());
}

const chainCrits = snapshotSet<Floor>();
const dominoEffectCrits = snapshotSet<Floor>();
const blueprintCrits = snapshotSet<Floor>();
const boostCrits = snapshotSet<Floor>();
const bounceCrits = snapshotSet<Floor>();
const explosionCrits = snapshotSet<Floor>();
const bootyCrits = snapshotSet<Floor>();
const cashFlowCrits = snapshotSet<Floor>();
const upgradeCrits = snapshotSet<Floor>();
const peppermintCrits = snapshotSet<Floor>();
const heavenlyCrits = snapshotSet<Floor>();
const mysticCrits = snapshotSet<Floor>();
const keynoteCrits = snapshotSet<Floor>();
const pairCrits = snapshotSet<Floor>();
const threeOfAKindCrits = snapshotSet<Floor>();
const fourOfAKindCrits = snapshotSet<Floor>();
const fullHouseCrits = snapshotSet<Floor>();
const royalFlushCrits = snapshotSet<Floor>();
const luckyNumberCrits = snapshotSet<Floor>();
const openBookCrits = snapshotSet<Floor>();
const tickTockCrits = snapshotSet<Floor>();
const chairGiveawayCrits = snapshotSet<Floor>();
const suppliesGiveawayCrits = snapshotSet<Floor>();
const winterSaleCrits = snapshotSet<Floor>();
const springSaleCrits = snapshotSet<Floor>();
const summerSaleCrits = snapshotSet<Floor>();
const autumnSaleCrits = snapshotSet<Floor>();
const halloweenSaleCrits = snapshotSet<Floor>();
const easterSaleCrits = snapshotSet<Floor>();
const sunshineCrits = snapshotSet<Floor>();
const snowdayCrits = snapshotSet<Floor>();
const fastForwardCrits = snapshotSet<Floor>();
const frozenCrits = snapshotSet<Floor>();
const spendingFreezeCrits = snapshotSet<Floor>();
const snowballCrits = snapshotSet<Floor>();
const bullMarketCrits = snapshotSet<Floor>();
const paydayCrits = snapshotSet<Floor>();
const goldStandardCrits = snapshotSet<Floor>();
const nightShiftCrits = snapshotSet<Floor>();
const internCrits = snapshotSet<Floor>();
const talentScoutCrits = snapshotSet<Floor>();
const unionBossCrits = snapshotSet<Floor>();
const rushHourCrits = snapshotSet<Floor>();
const rateLockCrits = snapshotSet<Floor>();
const goldenTicketCrits = snapshotSet<Floor>();
const silverTicketCrits = snapshotSet<Floor>();
const goldenParachuteCrits = snapshotSet<Floor>();
const rainCheckCrits = snapshotSet<Floor>();
const executiveBonusCrits = snapshotSet<Floor>();
const powerSurgeCrits = snapshotSet<Floor>();
const priceMatchCrits = snapshotSet<Floor>();
const firstClassCrits = snapshotSet<Floor>();
const payoutCrits = snapshotSet<Floor>();
const grandOpeningCrits = snapshotSet<Floor>();
const fullyStaffedCrits = snapshotSet<Floor>();
const skipCrits = snapshotSet<Floor>();
const shiftChangeCrits = snapshotSet<Floor>();
const espressoShotCrits = snapshotSet<Floor>();
const dejaVuCrits = snapshotSet<Floor>();
const cloneArmyCrits = snapshotSet<Floor>();
const luckyCloverCrits = snapshotSet<Floor>();
const secondWindCrits = snapshotSet<Floor>();
const executiveOrderCrits = snapshotSet<Floor>();
const roundUpCrits = snapshotSet<Floor>();
const safetyNetCrits = snapshotSet<Floor>();
const floorShareCrits = snapshotSet<Floor>();
const sameBoatCrits = snapshotSet<Floor>();
const goldenHandshakeCrits = snapshotSet<Floor>();
const supplyRunCrits = snapshotSet<Floor>();
const casualFridayCrits = snapshotSet<Floor>();
const fancyFridayCrits = snapshotSet<Floor>();
const fireDrillCrits = snapshotSet<Floor>();
const bonusRoundCrits = snapshotSet<Floor>();
const overflowCrits = snapshotSet<Floor>();
const performanceBonusCrits = snapshotSet<Floor>();
const teaBreakCrits = snapshotSet<Floor>();
const doubleDownCrits = snapshotSet<Floor>();
const coffeeRunCrits = snapshotSet<Floor>();
const teamBuildingCrits = snapshotSet<Floor>();
const teamLunchCrits = snapshotSet<Floor>();
const nightOwlCrits = snapshotSet<Floor>();
const headhunterCrits = snapshotSet<Floor>();
const dressCodeCrits = snapshotSet<Floor>();
const recruitmentDriveCrits = snapshotSet<Floor>();
const mergerCrits = snapshotSet<Floor>();
const shareholdersCrits = snapshotSet<Floor>();

// call once a tier has just landed (see rollCrit below) to roll every
// piggyback proc independently, each against its own chance — then, if one
// or more actually landed, pick up to MAX_SPECIAL_CRIT_PROCS of them uniformly
// at random (pickAtMost) to actually apply. Only one
// proc can land on a base crit; Deja Vu's two follow-ups are spawned later by
// its dedicated follow-up path and are intentionally unaffected by this cap.
export const MAX_SPECIAL_CRIT_PROCS = 1;

// gateway roll checked ONCE before any individual proc chance is even rolled
// (see CONFIG.crit's own comment) — a miss here skips the whole system
// silently for this crit, no procs possible at all this time. An object so the
// perf rig can switch procs and events off
export const SPECIAL_CRIT_GATEWAY: { chance: number } = {
  chance: CONFIG.crit.specialCritGatewayChance,
};

// uniformly random ordered pick of up to `max` items — a partial Fisher-Yates
// that tracks only the swapped slots, so it costs O(max) and never copies or
// mutates `items`
export function pickAtMost<T>(
  items: readonly T[],
  max: number,
  random: () => number = Math.random,
): T[] {
  const count = Math.min(max, items.length);
  const swapped = new Map<number, number>();
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (items.length - i));
    picked.push(items[swapped.get(j) ?? j]);
    swapped.set(j, swapped.get(i) ?? i);
  }
  return picked;
}

// full result of one rollCrit() call once a tier has actually landed — the
// one shape both rollCritUpgrade (per-click, upgradeButton.ts) and
// rollFloorBuyCrit (one-shot floor/building purchase, also upgradeButton.ts)
// now get back from the exact same shared roll
export interface CritRollResult extends Record<BadgeCritKind, boolean> {
  tier: CritTier;
  // a cash crit: pays its upgrades' price instead of them
  cash?: boolean;
  // a floor crit: its number playing out onto the bars once it has flashed
  floorCrit?: FloorCritKind;
  // an income crit: its number playing out onto the total income
  incomeCrit?: IncomeCritKind;
  // a button crit: its number playing out onto the upgrade buttons in view
  buttonCrit?: ButtonCritKind;
  // a lock crit: its number playing out onto the locked floor
  lockCrit?: LockCritKind;
  // a rate crit: its number playing out onto the income bars' rates
  rateCrit?: RateCritKind;
  // a badge crit whose landed badges turn this foil, once they qualify
  badgeFoil?: BadgeFoil;
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
  mystic: boolean;
  keynote: boolean;
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
  rainCheck: boolean;
  executiveBonus: boolean;
  powerSurge: boolean;
  priceMatch: boolean;
  firstClass: boolean;
  payout: boolean;
  grandOpening: boolean;
  fullyStaffed: boolean;
  skip: boolean;
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
// dispatch site by hand
export type CritProcKind = Exclude<
  keyof CritRollResult,
  | "tier"
  | "cash"
  | "floorCrit"
  | "incomeCrit"
  | "buttonCrit"
  | "lockCrit"
  | "rateCrit"
  | "badgeFoil"
>;

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
  "mystic",
  "keynote",
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
  "rainCheck",
  "executiveBonus",
  "powerSurge",
  "priceMatch",
  "firstClass",
  "payout",
  "grandOpening",
  "fullyStaffed",
  "skip",
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
  "nightOwl",
  "headhunter",
  "dressCode",
  "recruitmentDrive",
  "merger",
  "shareholders",
  ...BADGE_CRIT_KINDS,
];

// the one kind -> "is this proc armed on this floor" registry. Every per-proc
// WeakSet above is reachable from here, so anything that needs to act on procs
// generically (consumeCritProcs, readCritProcs, forceCritProc) walks
// CRIT_PROC_KINDS instead of hand-listing all 59 of them again. A badge
// crit's set is made the first time it's armed: thousands of empty sets made
// at load were a measurable slice of startup
const badgeProcSets = new Map<BadgeCritKind, WeakSet<Floor>>();
function procSet(kind: CritProcKind): WeakSet<Floor> | undefined {
  return isBadgeCritKind(kind) ? badgeProcSets.get(kind) : CRIT_PROC_SETS[kind];
}
const CRIT_PROC_SETS: Record<
  Exclude<CritProcKind, BadgeCritKind>,
  WeakSet<Floor>
> = {
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
  mystic: mysticCrits,
  keynote: keynoteCrits,
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
  rainCheck: rainCheckCrits,
  executiveBonus: executiveBonusCrits,
  powerSurge: powerSurgeCrits,
  priceMatch: priceMatchCrits,
  firstClass: firstClassCrits,
  payout: payoutCrits,
  grandOpening: grandOpeningCrits,
  fullyStaffed: fullyStaffedCrits,
  skip: skipCrits,
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
  // unset procs read false through the prototype (see critResult)
  const flags = Object.create(allCritProcFlagsFalse()) as CritProcFlags;
  if (!armedProcCounts.get(floor)) return flags;
  for (const kind of CRIT_PROC_KINDS) {
    if (procSet(kind)?.has(floor)) flags[kind] = true;
  }
  return flags;
}

// a flags record with exactly one proc set — lets a single proc be pushed
// through the same applyCritProcs dispatcher everything else uses (see
// critCelebration's Deja Vu follow-ups)
export function tierOnlyCrit(tier: CritTier): CritRollResult {
  return critResult(tier);
}

export function onlyCritProc(kind: CritProcKind): CritProcFlags {
  const flags = {} as CritProcFlags;
  for (const other of CRIT_PROC_KINDS) flags[other] = other === kind;
  return flags;
}

const critProcArmedListeners: ((kinds: readonly CritProcKind[]) => void)[] = [];

// called whenever procs get armed (rolled or forced), ahead of their celebration
export function onCritProcsArmed(
  listener: (kinds: readonly CritProcKind[]) => void,
): void {
  critProcArmedListeners.push(listener);
}

function notifyCritProcsArmed(kinds: readonly CritProcKind[]): void {
  if (kinds.length === 0) return;
  for (const listener of critProcArmedListeners) listener(kinds);
}

export function forceCritProc(kind: CritProcKind, floor: Floor): void {
  let set = procSet(kind);
  if (!set)
    badgeProcSets.set(kind as BadgeCritKind, (set = snapshotSet<Floor>()));
  set.add(floor);
  notifyCritProcsArmed([kind]);
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
  badge?: (kind: BadgeCritKind, ctx: TContext) => void,
): void {
  for (const kind of landedProcKinds(result)) {
    const handler = handlers[kind];
    if (handler) handler(ctx);
    else if (badge && isBadgeCritKind(kind)) badge(kind, ctx);
  }
}

let procOrder: Map<string, number> | null = null;

// the procs set true on result, in CRIT_PROC_KINDS order: results keep only
// their landed procs as own fields (the rest read false through a
// prototype), so this skips walking every kind
export function landedProcKinds(
  result: Pick<CritRollResult, CritProcKind>,
): CritProcKind[] {
  const PROC_ORDER = (procOrder ??= new Map(
    CRIT_PROC_KINDS.map((kind, i) => [kind, i]),
  ));
  const landed: CritProcKind[] = [];
  for (const key of Object.keys(result))
    if (PROC_ORDER.has(key) && result[key as CritProcKind])
      landed.push(key as CritProcKind);
  if (landed.length > 1)
    landed.sort((a, b) => PROC_ORDER.get(a)! - PROC_ORDER.get(b)!);
  return landed;
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
  const kinds = order === CRIT_PROC_KINDS ? landedProcKinds(result) : order;
  for (const kind of kinds) {
    if (result[kind] && handlers[kind]) {
      handlers[kind]!(ctx);
      return true;
    }
  }
  return false;
}

// display metadata for the player-facing "Special Crits" info menu (see
// hud/corporationBoostMenu's CRIT_INFO) AND the celebration flash each proc
// triggers (crits/floorCrits/critCelebration.ts) — one canonical table instead
// of those hand-duplicating every label/color a second time. `icon` is a
// loadAssets ImageName key; `description` is short display-only prose, never
// read by any game logic
export interface CritProcDisplayInfo {
  label: string;
  color: string;
  icon: ImageName;
  description: string;
}

// A proc's collection modifier is inverse to its configured roll chance:
// rarer crits grant a larger income bonus per collection milestone. Milestones
// are powers of ten (1, 10, 100, ...), not every tenth collection
export function getCritProcChance(kind: CritProcKind): number {
  if (!isBadgeCritKind(kind)) return PROC_METAS[kind].chance;
  const chance = CONFIG.crit[`${kind}Chance` as keyof typeof CONFIG.crit];
  return typeof chance === "number" ? chance : 0;
}

export function getCritProcMilestone(count: number): number {
  return count <= 0 ? 0 : Math.floor(Math.log10(count)) + 1;
}

export function getCritProcNextMilestoneCount(count: number): number {
  return 10 ** getCritProcMilestone(count);
}

// scales every badge's bonus at once — the whole collection was outpacing the
// rest of the economy at the previous 0.001
const CRIT_PROC_MODIFIER_WEIGHT = 0.0001;

export function getCritProcIncomeModifierPercent(
  kind: CritProcKind,
  count: number,
): number {
  const chance = getCritProcChance(kind);
  if (chance <= 0 || count <= 0) return 0;
  return getCritProcMilestone(count) * (CRIT_PROC_MODIFIER_WEIGHT / chance);
}

// every non-badge proc's meta.ts (floorCrits/procs/<kind>), by kind
export const PROC_METAS = Object.fromEntries(
  Object.entries(
    import.meta.glob<ProcMeta>("../floorCrits/procs/*/meta.ts", {
      eager: true,
      import: "default",
    }),
  ).map(([file, meta]) => [file.split("/")[3], meta]),
) as Record<Exclude<CritProcKind, BadgeCritKind>, ProcMeta>;

// badge crits join once their catalog loads (onBadgeCatalog below): a
// badge kind reads undefined till then; every other proc is here from the start
export const CRIT_PROC_INFO: Record<
  Exclude<CritProcKind, BadgeCritKind>,
  CritProcDisplayInfo
> &
  Partial<Record<BadgeCritKind, CritProcDisplayInfo>> = { ...PROC_METAS };

// loadAssets registers each badge crit's image under its kind
onBadgeCatalog((catalog) => {
  for (const kind of BADGE_CRIT_KINDS) {
    const { label, color, description } = catalog[kind];
    CRIT_PROC_INFO[kind] = { label, color, icon: kind, description };
  }
});

// a proc's icon, known before the badge catalog loads
export function critProcIcon(kind: CritProcKind): ImageName {
  return isBadgeCritKind(kind) ? kind : CRIT_PROC_INFO[kind].icon;
}

// walks CRIT_TIER_ORDER rarest-first, returning the first tier whose own
// chance hits (or null on a full miss)
function rollTier(): CritTier | null {
  for (const tier of CRIT_TIER_ORDER) {
    if (critRandom() < CRIT_TIER_CONFIG[tier].chance) return tier;
  }
  return null;
}

type SpecialCritType = keyof typeof CONFIG.specialCrits;
const SPECIAL_CRIT_TYPES = Object.keys(
  CONFIG.specialCrits,
) as SpecialCritType[];
// the special slots the floor crits' player plays
type PlayedSlotType = "floorCrit" | "buttonCrit" | "lockCrit" | "rateCrit";
// what a special slot ends up carrying: a played slot is one of its group's
// kinds
type SlotType = Exclude<SpecialCritType, PlayedSlotType> | CritPlayKind;

// the played crits (floor, income, button, lock and rate crits) are each
// their own folder, collected by critKit
export {
  FLOOR_CRIT_KINDS,
  INCOME_CRIT_KINDS,
  BUTTON_CRIT_KINDS,
  LOCK_CRIT_KINDS,
  RATE_CRIT_KINDS,
  isFloorCritKind,
  isIncomeCritKind,
  isButtonCritKind,
  isLockCritKind,
  isRateCritKind,
  type FloorCritKind,
  type IncomeCritKind,
  type ButtonCritKind,
  type LockCritKind,
  type RateCritKind,
  type CritPlayKind,
};

// one of `types`, each weighted by its chance in `table`
function pickByChance<K extends string>(
  table: Record<K, { chance: number }>,
  types: readonly K[],
): K {
  const total = types.reduce((sum, t) => sum + table[t].chance, 0);
  let roll = critRandom() * total;
  return types.find((t) => (roll -= table[t].chance) < 0) ?? types[0];
}

// game time before which each played slot (floor and income crits share
// one) is a badge crit instead
const playedFreeAt: Record<PlayedSlotType, number> = {
  floorCrit: 0,
  buttonCrit: 0,
  lockCrit: 0,
  rateCrit: 0,
};

function coolDown(type: PlayedSlotType): void {
  playedFreeAt[type] = Math.max(
    playedFreeAt[type],
    Date.now() + CONFIG.specialCrits[type].cooldownMs,
  );
}

// no crit of kind's group lands again until its CONFIG cooldown from now;
// called when one is picked and when it finishes playing
export function coolDownFloorCrits(kind: CritPlayKind): void {
  coolDown(
    isButtonCritKind(kind)
      ? "buttonCrit"
      : isLockCritKind(kind)
        ? "lockCrit"
        : isRateCritKind(kind)
          ? "rateCrit"
          : "floorCrit",
  );
}

// what a gateway-passing crit's special slot carries: a type by its
// CONFIG.specialCrits chance; a floorCrit slot is then a floor crit (by its
// meta.ts chance) on a multiplier crit, an income crit (by its
// CONFIG.incomeCrits chance) on a cash crit; a buttonCrit or lockCrit slot
// one of its group's kinds. `plays` turns down a slot that can't play
// where the crit was rolled (a lock crit with no locked floor in view)
function pickSpecialCrit(
  cash: boolean,
  plays?: (type: PlayedSlotType) => boolean,
): SlotType {
  const type = pickByChance(CONFIG.specialCrits, SPECIAL_CRIT_TYPES);
  if (
    type !== "floorCrit" &&
    type !== "buttonCrit" &&
    type !== "lockCrit" &&
    type !== "rateCrit"
  )
    return type;
  if (Date.now() < playedFreeAt[type] || (plays && !plays(type)))
    return "badgeCrit";
  coolDown(type);
  if (type === "buttonCrit")
    return pickByChance(PLAYED_CRITS.button, BUTTON_CRIT_KINDS);
  if (type === "lockCrit")
    return pickByChance(PLAYED_CRITS.lock, LOCK_CRIT_KINDS);
  if (type === "rateCrit")
    return pickByChance(PLAYED_CRITS.rate, RATE_CRIT_KINDS);
  return cash
    ? pickByChance(PLAYED_CRITS.income, INCOME_CRIT_KINDS)
    : pickByChance(PLAYED_CRITS.floor, FLOOR_CRIT_KINDS);
}

// always lands a tier, weighted by each tier's own relative chance
export function pickCritTierByOdds(): CritTier {
  const total = CRIT_TIER_ORDER.reduce(
    (sum, tier) => sum + CRIT_TIER_CONFIG[tier].chance,
    0,
  );
  let roll = critRandom() * total;
  for (const tier of CRIT_TIER_ORDER) {
    roll -= CRIT_TIER_CONFIG[tier].chance;
    if (roll < 0) return tier;
  }
  return CRIT_TIER_ORDER[CRIT_TIER_ORDER.length - 1];
}

// every non-badge proc bucketed by its exact chance, so rollLandedProcs can
// jump straight from one landed proc to the next inside a bucket; built at the
// first roll
type ProcChanceGroup = { logMiss: number; kinds: CritProcKind[] };
let procChanceGroups: ProcChanceGroup[] | null = null;
function getProcChanceGroups(): ProcChanceGroup[] {
  if (procChanceGroups) return procChanceGroups;
  const byChance = new Map<number, CritProcKind[]>();
  for (const kind of new Set(CRIT_PROC_KINDS)) {
    const chance = getCritProcChance(kind);
    if (!(chance >= 0 && chance <= 1)) {
      throw new Error(`CONFIG.crit.${kind}Chance must be in [0, 1]: ${chance}`);
    }
    if (chance === 0 || isBadgeCritKind(kind)) continue;
    const kinds = byChance.get(chance);
    if (kinds) kinds.push(kind);
    else byChance.set(chance, [kind]);
  }
  return (procChanceGroups = [...byChance].map(([chance, kinds]) => ({
    logMiss: Math.log1p(-chance),
    kinds,
  })));
}

// procs skipped before the next hit — Geometric(chance), the exact gap left by
// rolling each proc's own `Math.random() < chance` one at a time
function landedGap(logMiss: number): number {
  return Math.floor(Math.log(1 - critRandom()) / logMiss);
}

// every proc that lands this roll, each independently against its own chance
// (O(distinct chances + landed), not O(all procs)); plus one badge crit from
// a main category picked at random (rollBadgeCrit), so every one is seen as often
export function rollLandedProcs(): CritProcKind[] {
  const landed: CritProcKind[] = [];
  for (const { logMiss, kinds } of getProcChanceGroups()) {
    for (
      let i = landedGap(logMiss);
      i < kinds.length;
      i += 1 + landedGap(logMiss)
    )
      landed.push(kinds[i]);
  }
  if (getBadgeRewards() !== null) landed.push(...rollBadgeCrit(critRandom));
  return landed;
}

let allCritProcFlagsFalseProto: CritProcFlags | null = null;
function allCritProcFlagsFalse(): CritProcFlags {
  return (allCritProcFlagsFalseProto ??= Object.fromEntries(
    CRIT_PROC_KINDS.map((kind) => [kind, false]),
  ) as CritProcFlags);
}

// a result whose procs all read false through the shared prototype, so a roll
// never copies every one of the ~1,700 proc flags (a renovation rolls thousands)
function critResult(tier: CritTier): CritRollResult {
  const result = Object.create(allCritProcFlagsFalse()) as CritRollResult;
  result.tier = tier;
  return result;
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
  // `landedProcs` is exactly the procs flagged true on `result` — a consumer
  // reacting to what landed can walk it instead of all of CRIT_PROC_KINDS
  onLanded: (result: CritRollResult, landedProcs: CritProcKind[]) => void,
  allowSpecialProcs = true,
  // an animated crit (crits/animatedCrits/eventProcs) taking the slot, true when it did;
  // false leaves the slot to a badge crit
  claimSpecialSlot?: () => boolean,
  // whether a played slot (pickSpecialCrit) can play where this was rolled
  slotPlays?: (type: PlayedSlotType) => boolean,
): void {
  const tier = rollTier();
  if (tier === null) return;
  // the starting crit is a multiplier or a cash crit, gateway or not
  const cashRoll = critRandom() < CONFIG.crit.cashCrit.chance;
  const slot =
    allowSpecialProcs && critRandom() < SPECIAL_CRIT_GATEWAY.chance
      ? pickSpecialCrit(cashRoll, slotPlays)
      : null;
  // a button, lock or rate crit plays its tier's number out: a multiplier crit
  const cash =
    cashRoll &&
    !isButtonCritKind(slot) &&
    !isLockCritKind(slot) &&
    !isRateCritKind(slot);
  const badge =
    slot === "badgeCrit" ||
    slot === "badgeShimmer" ||
    slot === "badgeGlitter" ||
    (slot === "animatedCrit" && !claimSpecialSlot?.());
  const landed = badge ? rollLandedProcs() : [];
  const kept = new Set(pickAtMost(landed, MAX_SPECIAL_CRIT_PROCS, critRandom));
  // real-roll-only tally for the "Special Crits" info menu's collectible
  // count badges — see crits/critTypes/critProcCounts.ts
  for (const kind of kept) recordCritProcLanded(kind);
  const landedProcs = [...kept];
  const result = critResult(tier);
  if (cash) result.cash = true;
  if (isFloorCritKind(slot)) result.floorCrit = slot;
  else if (isIncomeCritKind(slot)) result.incomeCrit = slot;
  else if (isButtonCritKind(slot)) result.buttonCrit = slot;
  else if (isLockCritKind(slot)) result.lockCrit = slot;
  else if (isRateCritKind(slot)) result.rateCrit = slot;
  else if (slot === "badgeShimmer") result.badgeFoil = "shimmer";
  else if (slot === "badgeGlitter") result.badgeFoil = "glitter";
  for (const kind of landedProcs) result[kind] = true;
  notifyCritProcsArmed(landedProcs);
  onLanded(result, landedProcs);
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

export function isMysticCrit(floor: Floor): boolean {
  return mysticCrits.has(floor);
}

export function isKeynoteCrit(floor: Floor): boolean {
  return keynoteCrits.has(floor);
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

export function isRainCheckCrit(floor: Floor): boolean {
  return rainCheckCrits.has(floor);
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

export function isSkipCrit(floor: Floor): boolean {
  return skipCrits.has(floor);
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

// call right when an armed crit's click is handled, before rolling the next one
export function consumeCritProcs(floor: Floor): void {
  if (armedProcCounts.get(floor))
    for (const kind of CRIT_PROC_KINDS) procSet(kind)?.delete(floor);
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

export function forceMysticCritProc(floor: Floor): void {
  mysticCrits.add(floor);
}

export function forceKeynoteCritProc(floor: Floor): void {
  keynoteCrits.add(floor);
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

export function forceRainCheckCritProc(floor: Floor): void {
  rainCheckCrits.add(floor);
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

export function forceSkipCritProc(floor: Floor): void {
  skipCrits.add(floor);
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

// rarer tiers always carry a bigger multiplier by design (see CRIT_TIER_CONFIG),
// so that's a safe, already-canonical rank to compare tiers by — null (no tier)
// always loses to any real tier
export function critTierRank(tier: CritTier | null): number {
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

export { setCritRandom } from "./critRandom";
