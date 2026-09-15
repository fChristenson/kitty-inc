// The base crit-TIER system (x5/x25/x125 jackpot rolls) — distinct from the
// "event crit" framework in shared.ts (Sale/Overtime and any future ones): a
// tier is what's rolled per click and what makes an event's own piggyback
// proc possible in the first place, not itself a timed window.
//
// "crit" upgrade: a rare, free, oversized upgrade — the slot-machine jackpot moment.
// Tiers (a variable-ratio reward schedule, not a flat one) roll independently
// each completed upgrade click (see floorInteractions/index.ts's rollCritUpgrade
// calls), rarest first (see CRIT_TIER_ORDER), so a click can never land more than
// one at once. While active, this floor's button recolors, wiggles, and shows
// "xN" instead of its price; clicking it costs nothing and instantly applies
// that tier's upgrade count at once.
//
// CritTier/CRIT_TIER_CONFIG/CRIT_TIER_ORDER and every pure tier-comparison
// helper now live in shared/critTypes (so other modules — gameState's Floor
// type, background/cityMap, main.ts — can read the same canonical data
// without going through this module or duplicating a plain string union) —
// re-exported here so every existing sibling import (incomePanel.ts,
// floorLock.ts, critCelebration.ts, floorInteractions.ts) keeps working
// unchanged
export {
  type CritTier,
  type CritTierDef,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  CRIT_UPGRADE_COUNT,
  MEGA_CRIT_UPGRADE_COUNT,
  ULTRA_CRIT_UPGRADE_COUNT,
  CHAIN_CRIT_CONTINUE_CHANCE,
  BOOST_CRIT_COLOR,
  BOOST_CRIT_LABEL,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  BOUNCE_CRIT_LABEL,
  EXPLOSION_CRIT_CONTINUE_CHANCE,
  EXPLOSION_CRIT_LABEL,
  BOOTY_CRIT_COLOR,
  BOOTY_CRIT_LABEL,
  UPGRADE_CRIT_COLOR,
  UPGRADE_CRIT_LABEL,
  PEPPERMINT_CRIT_COLOR,
  PEPPERMINT_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  POKER_HAND_CRIT_COUNTS,
  PAIR_CRIT_COLOR,
  PAIR_CRIT_LABEL,
  THREE_OF_A_KIND_CRIT_COLOR,
  THREE_OF_A_KIND_CRIT_LABEL,
  FOUR_OF_A_KIND_CRIT_COLOR,
  FOUR_OF_A_KIND_CRIT_LABEL,
  FULL_HOUSE_CRIT_COLOR,
  FULL_HOUSE_CRIT_LABEL,
  ROYAL_FLUSH_CRIT_COLOR,
  ROYAL_FLUSH_CRIT_LABEL,
  TICK_TOCK_CRIT_COLOR,
  TICK_TOCK_CRIT_LABEL,
  CHAIR_GIVEAWAY_CRIT_COLOR,
  CHAIR_GIVEAWAY_CRIT_LABEL,
  SUPPLIES_GIVEAWAY_CRIT_COLOR,
  SUPPLIES_GIVEAWAY_CRIT_LABEL,
  SEASONAL_SALE_DISCOUNT_MULTIPLIER,
  WINTER_SALE_CRIT_COLOR,
  WINTER_SALE_CRIT_LABEL,
  SPRING_SALE_CRIT_COLOR,
  SPRING_SALE_CRIT_LABEL,
  SUMMER_SALE_CRIT_COLOR,
  SUMMER_SALE_CRIT_LABEL,
  AUTUMN_SALE_CRIT_COLOR,
  AUTUMN_SALE_CRIT_LABEL,
  HALLOWEEN_SALE_DISCOUNT_MULTIPLIER,
  HALLOWEEN_SALE_CRIT_COLOR,
  HALLOWEEN_SALE_CRIT_LABEL,
  EASTER_SALE_DISCOUNT_MULTIPLIER,
  EASTER_SALE_CRIT_COLOR,
  EASTER_SALE_CRIT_LABEL,
  SUNSHINE_CRIT_COLOR,
  SUNSHINE_CRIT_LABEL,
  SNOWDAY_CRIT_COLOR,
  SNOWDAY_CRIT_LABEL,
  FAST_FORWARD_CRIT_COLOR,
  FAST_FORWARD_CRIT_LABEL,
  FROZEN_CRIT_COLOR,
  FROZEN_CRIT_LABEL,
  FROZEN_DURATION_MS,
  triggerFrozenCrit,
  isFrozenActive,
  SNOWBALL_CRIT_COLOR,
  SNOWBALL_CRIT_LABEL,
  FREE_SALE_CRIT_COLOR,
  FREE_SALE_CRIT_LABEL,
  BULL_MARKET_CRIT_COLOR,
  BULL_MARKET_CRIT_LABEL,
  PAYDAY_CRIT_COLOR,
  PAYDAY_CRIT_LABEL,
  GOLD_STANDARD_CRIT_COLOR,
  GOLD_STANDARD_CRIT_LABEL,
  NIGHT_SHIFT_CRIT_COLOR,
  NIGHT_SHIFT_CRIT_LABEL,
  INTERN_CRIT_COLOR,
  INTERN_CRIT_LABEL,
  UNION_BOSS_CRIT_COLOR,
  UNION_BOSS_CRIT_LABEL,
  RUSH_HOUR_CRIT_COLOR,
  RUSH_HOUR_CRIT_LABEL,
  RUSH_HOUR_DURATION_MS,
  RUSH_HOUR_INTERVAL_SECONDS,
  triggerRushHourCrit,
  isRushHourActive,
  GOLDEN_TICKET_CRIT_COLOR,
  GOLDEN_TICKET_CRIT_LABEL,
  SILVER_TICKET_CRIT_COLOR,
  SILVER_TICKET_CRIT_LABEL,
  GOLDEN_PARACHUTE_CRIT_COLOR,
  GOLDEN_PARACHUTE_CRIT_LABEL,
  PAYOUT_CRIT_COLOR,
  PAYOUT_CRIT_LABEL,
  GRAND_OPENING_CRIT_COLOR,
  GRAND_OPENING_CRIT_LABEL,
  FULLY_STAFFED_CRIT_COLOR,
  FULLY_STAFFED_CRIT_LABEL,
  ESPRESSO_SHOT_CRIT_COLOR,
  ESPRESSO_SHOT_CRIT_LABEL,
  DEJA_VU_CRIT_COLOR,
  DEJA_VU_CRIT_LABEL,
  CLONE_ARMY_CRIT_COLOR,
  CLONE_ARMY_CRIT_LABEL,
  LUCKY_CLOVER_CRIT_COLOR,
  LUCKY_CLOVER_CRIT_LABEL,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  SECOND_WIND_CRIT_COLOR,
  SECOND_WIND_CRIT_LABEL,
  EXECUTIVE_ORDER_CRIT_COLOR,
  EXECUTIVE_ORDER_CRIT_LABEL,
  ROUND_UP_CRIT_COLOR,
  ROUND_UP_CRIT_LABEL,
  ROUND_UP_CRIT_STEP,
  isChainCrit,
  isBoostCrit,
  isBounceCrit,
  isExplosionCrit,
  isBootyCrit,
  isUpgradeCrit,
  isPeppermintCrit,
  isHeavenlyCrit,
  isPairCrit,
  isThreeOfAKindCrit,
  isFourOfAKindCrit,
  isFullHouseCrit,
  isRoyalFlushCrit,
  isTickTockCrit,
  isChairGiveawayCrit,
  isSuppliesGiveawayCrit,
  isWinterSaleCrit,
  isSpringSaleCrit,
  isSummerSaleCrit,
  isAutumnSaleCrit,
  isHalloweenSaleCrit,
  isEasterSaleCrit,
  isSunshineCrit,
  isSnowdayCrit,
  isFastForwardCrit,
  isFrozenCrit,
  isSnowballCrit,
  isFreeSaleCrit,
  isBullMarketCrit,
  isPaydayCrit,
  isGoldStandardCrit,
  isNightShiftCrit,
  isInternCrit,
  isUnionBossCrit,
  isRushHourCrit,
  isGoldenTicketCrit,
  isSilverTicketCrit,
  isGoldenParachuteCrit,
  isPayoutCrit,
  isGrandOpeningCrit,
  isFullyStaffedCrit,
  isEspressoShotCrit,
  isDejaVuCrit,
  isCloneArmyCrit,
  isLuckyCloverCrit,
  isSecondWindCrit,
  isExecutiveOrderCrit,
  isRoundUpCrit,
  getBonusTierCrit,
  consumeBonusTierCrit,
  pickHigherCritTier,
  nextCritTier,
  getUniformCritTier,
} from "../../shared/critTypes";
import {
  type CritTier,
  type CritRollResult,
  rollCrit,
  consumeCritProcs,
  forceChainCritProc,
  forceBoostCritProc,
  forceBounceCritProc,
  forceExplosionCritProc,
  forceBootyCritProc,
  forceUpgradeCritProc,
  forcePeppermintCritProc,
  forceHeavenlyCritProc,
  forcePairCritProc,
  forceThreeOfAKindCritProc,
  forceFourOfAKindCritProc,
  forceFullHouseCritProc,
  forceRoyalFlushCritProc,
  forceTickTockCritProc,
  forceChairGiveawayCritProc,
  forceSuppliesGiveawayCritProc,
  forceWinterSaleCritProc,
  forceSpringSaleCritProc,
  forceSummerSaleCritProc,
  forceAutumnSaleCritProc,
  forceHalloweenSaleCritProc,
  forceEasterSaleCritProc,
  forceSunshineCritProc,
  forceSnowdayCritProc,
  forceFastForwardCritProc,
  forceFrozenCritProc,
  forceSnowballCritProc,
  forceFreeSaleCritProc,
  forceBullMarketCritProc,
  forcePaydayCritProc,
  forceGoldStandardCritProc,
  forceNightShiftCritProc,
  forceInternCritProc,
  forceUnionBossCritProc,
  forceRushHourCritProc,
  forceGoldenTicketCritProc,
  forceSilverTicketCritProc,
  forceGoldenParachuteCritProc,
  forcePayoutCritProc,
  forceGrandOpeningCritProc,
  forceFullyStaffedCritProc,
  forceEspressoShotCritProc,
  forceDejaVuCritProc,
  forceCloneArmyCritProc,
  forceLuckyCloverCritProc,
  forceSecondWindCritProc,
  forceExecutiveOrderCritProc,
  forceRoundUpCritProc,
  forceBonusTierCritProc,
} from "../../shared/critTypes";
import type { Floor } from "../../gameState";

const critTiers = new WeakMap<Floor, CritTier>();

// "Golden Ticket" crit's own reward (see floorInteractions.ts's
// applyGoldenTicketCrit): a one-shot flag consumed by the very next
// rollCritUpgrade call on this floor, forcing a guaranteed "ultra" tier and
// skipping rollCrit's own tier/proc chances entirely for that one roll
const guaranteedUltraCrits = new WeakSet<Floor>();

export function armGuaranteedUltraCrit(floor: Floor): void {
  guaranteedUltraCrits.add(floor);
}

// "Silver Ticket" crit's own reward (see floorInteractions.ts's
// applySilverTicketCrit): same one-shot shape as Golden Ticket above, but
// forces a guaranteed "mega" tier instead
const guaranteedMegaCrits = new WeakSet<Floor>();

export function armGuaranteedMegaCrit(floor: Floor): void {
  guaranteedMegaCrits.add(floor);
}

// call once per completed upgrade click (crit or normal) to roll the next
// one — delegates the entire roll (tier + gateway + procs + cap) to
// shared/critTypes's rollCrit, only reacting to the result: arms this
// floor's tier, then marks it with whichever piggyback procs landed (reusing
// the same forceXCritProc setters the dev-test "force" helpers below use —
// landing "for real" and being forced are the same underlying WeakSet add).
// `allowSpecialProcs = false` (see floorInteractions.ts's Sale/Overtime/
// Frozen click branches, re-arming the next crit while one of those is
// already active) forwards straight through to rollCrit — still arms a
// plain tier crit normally, just never a piggyback proc alongside it
export function rollCritUpgrade(floor: Floor, allowSpecialProcs = true): void {
  if (guaranteedUltraCrits.has(floor)) {
    guaranteedUltraCrits.delete(floor);
    critTiers.set(floor, "ultra");
    return;
  }
  if (guaranteedMegaCrits.has(floor)) {
    guaranteedMegaCrits.delete(floor);
    critTiers.set(floor, "mega");
    return;
  }
  rollCrit((result) => {
    critTiers.set(floor, result.tier);
    if (result.chain) forceChainCritProc(floor);
    if (result.boost) forceBoostCritProc(floor);
    if (result.bounce) forceBounceCritProc(floor);
    if (result.explosion) forceExplosionCritProc(floor);
    if (result.booty) forceBootyCritProc(floor);
    if (result.upgrade) forceUpgradeCritProc(floor);
    if (result.peppermint) forcePeppermintCritProc(floor);
    if (result.heavenly) forceHeavenlyCritProc(floor);
    if (result.pair) forcePairCritProc(floor);
    if (result.threeOfAKind) forceThreeOfAKindCritProc(floor);
    if (result.fourOfAKind) forceFourOfAKindCritProc(floor);
    if (result.fullHouse) forceFullHouseCritProc(floor);
    if (result.royalFlush) forceRoyalFlushCritProc(floor);
    if (result.tickTock) forceTickTockCritProc(floor);
    if (result.chairGiveaway) forceChairGiveawayCritProc(floor);
    if (result.suppliesGiveaway) forceSuppliesGiveawayCritProc(floor);
    if (result.winterSale) forceWinterSaleCritProc(floor);
    if (result.springSale) forceSpringSaleCritProc(floor);
    if (result.summerSale) forceSummerSaleCritProc(floor);
    if (result.autumnSale) forceAutumnSaleCritProc(floor);
    if (result.halloweenSale) forceHalloweenSaleCritProc(floor);
    if (result.easterSale) forceEasterSaleCritProc(floor);
    if (result.sunshine) forceSunshineCritProc(floor);
    if (result.snowday) forceSnowdayCritProc(floor);
    if (result.fastForward) forceFastForwardCritProc(floor);
    if (result.frozen) forceFrozenCritProc(floor);
    if (result.snowball) forceSnowballCritProc(floor);
    if (result.freeSale) forceFreeSaleCritProc(floor);
    if (result.bullMarket) forceBullMarketCritProc(floor);
    if (result.payday) forcePaydayCritProc(floor);
    if (result.goldStandard) forceGoldStandardCritProc(floor);
    if (result.nightShift) forceNightShiftCritProc(floor);
    if (result.intern) forceInternCritProc(floor);
    if (result.unionBoss) forceUnionBossCritProc(floor);
    if (result.rushHour) forceRushHourCritProc(floor);
    if (result.goldenTicket) forceGoldenTicketCritProc(floor);
    if (result.silverTicket) forceSilverTicketCritProc(floor);
    if (result.goldenParachute) forceGoldenParachuteCritProc(floor);
    if (result.payout) forcePayoutCritProc(floor);
    if (result.grandOpening) forceGrandOpeningCritProc(floor);
    if (result.fullyStaffed) forceFullyStaffedCritProc(floor);
    if (result.espressoShot) forceEspressoShotCritProc(floor);
    if (result.dejaVu) forceDejaVuCritProc(floor);
    if (result.cloneArmy) forceCloneArmyCritProc(floor);
    if (result.secondWind) forceSecondWindCritProc(floor);
    if (result.executiveOrder) forceExecutiveOrderCritProc(floor);
    if (result.roundUp) forceRoundUpCritProc(floor);
    if (result.bonusTier) forceBonusTierCritProc(floor, result.bonusTier);
  }, allowSpecialProcs);
}

// same shared rollCrit as rollCritUpgrade, but a one-shot roll (not tied to
// any Floor's "next click" telegraph) for a floor-unlock purchase — see
// floorInteractions.ts's hitTestFloorLock branch, and cityMap.ts's own
// new-building purchase, which shares this exact same roll. Returns null on
// a miss (the common case, rollCrit's onLanded simply never fires). A forced
// tier (see forceFloorBuyCrit below) always wins and is consumed on the very
// next call
export type FloorBuyCritResult = CritRollResult;

let forcedFloorBuyCrit: FloorBuyCritResult | null = null;

export function rollFloorBuyCrit(): FloorBuyCritResult | null {
  if (forcedFloorBuyCrit) {
    const result = forcedFloorBuyCrit;
    forcedFloorBuyCrit = null;
    return result;
  }
  let rolled: FloorBuyCritResult | null = null;
  rollCrit((result) => {
    rolled = result;
  });
  return rolled;
}

// dev/test-only: guarantees the NEXT floor bought (or building bought — both
// share this same roll) crits at this tier, bypassing chance entirely (see
// hud/testButton's "Floor Crit"/"Floor Mega Crit"/"Floor Ultra Crit"/"Map
// Unlock Crit"/etc. and their own "Chain"/"Boost"/"Bounce"/"Explosion"/
// "Booty" siblings)
export function forceFloorBuyCrit(
  tier: CritTier,
  chain = false,
  boost = false,
  bounce = false,
  explosion = false,
  booty = false,
  upgrade = false,
  peppermint = false,
  heavenly = false,
  pair = false,
  threeOfAKind = false,
  fourOfAKind = false,
  fullHouse = false,
  tickTock = false,
  chairGiveaway = false,
  suppliesGiveaway = false,
  winterSale = false,
  springSale = false,
  summerSale = false,
  autumnSale = false,
  halloweenSale = false,
  sunshine = false,
  snowday = false,
  fastForward = false,
  frozen = false,
  snowball = false,
  freeSale = false,
  bullMarket = false,
  payday = false,
  goldStandard = false,
  royalFlush = false,
  nightShift = false,
  bonusTier: CritTier | null = null,
  intern = false,
  unionBoss = false,
  easterSale = false,
  rushHour = false,
  goldenTicket = false,
  silverTicket = false,
  goldenParachute = false,
  payout = false,
  grandOpening = false,
  fullyStaffed = false,
  espressoShot = false,
  dejaVu = false,
  cloneArmy = false,
): void {
  forcedFloorBuyCrit = {
    tier,
    bonusTier,
    chain,
    boost,
    bounce,
    explosion,
    booty,
    upgrade,
    peppermint,
    heavenly,
    pair,
    threeOfAKind,
    fourOfAKind,
    fullHouse,
    tickTock,
    chairGiveaway,
    suppliesGiveaway,
    winterSale,
    springSale,
    summerSale,
    autumnSale,
    halloweenSale,
    easterSale,
    sunshine,
    snowday,
    fastForward,
    frozen,
    snowball,
    freeSale,
    bullMarket,
    payday,
    goldStandard,
    royalFlush,
    nightShift,
    intern,
    unionBoss,
    rushHour,
    goldenTicket,
    silverTicket,
    goldenParachute,
    payout,
    grandOpening,
    fullyStaffed,
    espressoShot,
    dejaVu,
    cloneArmy,
    luckyClover: false,
    secondWind: false,
    executiveOrder: false,
    roundUp: false,
  };
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Grand Opening proc on top of the chosen tier (default "crit")
export function forceGrandOpeningFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.grandOpening = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Fully Staffed proc on top of the chosen tier
export function forceFullyStaffedFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.fullyStaffed = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries an
// Espresso Shot proc on top of the chosen tier
export function forceEspressoShotFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.espressoShot = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Deja Vu proc on top of the chosen tier
export function forceDejaVuFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.dejaVu = true;
}

export function forceCloneArmyFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.cloneArmy = true;
}

export function forceLuckyCloverFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.luckyClover = true;
}

export function forceSecondWindFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.secondWind = true;
}

export function forceExecutiveOrderFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.executiveOrder = true;
}

export function forceRoundUpFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.roundUp = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Payout proc on top of the chosen tier (default "crit")
export function forcePayoutFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.payout = true;
}

export function getCritTier(floor: Floor): CritTier | null {
  return critTiers.get(floor) ?? null;
}

export function isCritUpgrade(floor: Floor): boolean {
  return critTiers.has(floor);
}

// call right when a crit click is handled, before rolling the next one
export function consumeCritUpgrade(floor: Floor): void {
  critTiers.delete(floor);
  consumeCritProcs(floor);
}

// dev/test-only: force this floor's button into a crit state right away,
// bypassing chance entirely (see hud/testButton's "Spawn Crit"/"Spawn Mega Crit"/
// "Spawn Ultra Crit")
export function forceCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
}

export function forceMegaCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "mega");
}

export function forceUltraCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "ultra");
}

// dev/test-only: force this floor's already-armed tier to also carry a boost
// proc, bypassing chance entirely (see hud/testButton's "Spawn Boost Crit")
export function forceBoostCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceBoostCritProc(floor);
}

// dev/test-only: force this floor into a chain crit at the given tier
// (default "crit"), bypassing both the crit chance AND the 0.01% chain chance
// (see hud/testButton's "Spawn Chain Crit"/"Spawn Chain Mega Crit"/"Spawn Chain
// Ultra Crit") — the chain behavior itself doesn't depend on which tier chains,
// tier only changes how many free upgrades each chained floor gets
export function forceChainCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceChainCritProc(floor);
}

// dev/test-only: force this floor into a bounce crit at the given tier
// (default "crit"), bypassing chance entirely (see hud/testButton's "Spawn
// Bounce Crit") — same shape as forceChainCritUpgrade above, just arming
// the bounce proc instead of the chain one
export function forceBounceCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceBounceCritProc(floor);
}

// dev/test-only: force this floor into an explosion crit at the given tier
// (default "crit"), bypassing chance entirely (see hud/testButton's "Spawn
// Explosion Crit") — same shape again, arming the explosion proc instead
export function forceExplosionCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceExplosionCritProc(floor);
}

// dev/test-only: force this floor into a booty crit, bypassing chance
// entirely (see hud/testButton's "Spawn Booty Crit") — not tier-scaled
// (see isBootyCrit's own doc comment), so no tier param needed
export function forceBootyCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceBootyCritProc(floor);
}

// dev/test-only: force this floor into an upgrade crit, bypassing chance
// entirely (see hud/testButton's "Spawn Upgrade Crit") — not tier-scaled,
// so no tier param needed
export function forceUpgradeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceUpgradeCritProc(floor);
}

// dev/test-only: force this floor into a peppermint crit, bypassing chance
// entirely (see hud/testButton's "Spawn Peppermint Crit") — not tier-scaled,
// so no tier param needed (same shape as booty/upgrade above)
export function forcePeppermintCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePeppermintCritProc(floor);
}

// dev/test-only: force this floor into a heavenly crit, bypassing chance
// entirely (see hud/testButton's "Spawn Heavenly Crit") — not tier-scaled,
// so no tier param needed (same shape as booty/upgrade/peppermint above)
export function forceHeavenlyCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceHeavenlyCritProc(floor);
}

// dev/test-only: force this floor into a pair/three-of-a-kind/four-of-a-kind/
// full-house crit, bypassing chance entirely (see hud/testButton's "Spawn
// Pair Crit"/etc.) — not tier-scaled, so no tier param needed (same shape as
// booty/upgrade/peppermint/heavenly above)
export function forcePairCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePairCritProc(floor);
}

export function forceThreeOfAKindCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceThreeOfAKindCritProc(floor);
}

export function forceFourOfAKindCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFourOfAKindCritProc(floor);
}

export function forceFullHouseCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFullHouseCritProc(floor);
}

export function forceRoyalFlushCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRoyalFlushCritProc(floor);
}

export function forceTickTockCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceTickTockCritProc(floor);
}

export function forceChairGiveawayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceChairGiveawayCritProc(floor);
}

export function forceSuppliesGiveawayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSuppliesGiveawayCritProc(floor);
}

export function forceWinterSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceWinterSaleCritProc(floor);
}

export function forceSpringSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSpringSaleCritProc(floor);
}

export function forceSummerSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSummerSaleCritProc(floor);
}

export function forceAutumnSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceAutumnSaleCritProc(floor);
}

export function forceHalloweenSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceHalloweenSaleCritProc(floor);
}

export function forceEasterSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceEasterSaleCritProc(floor);
}

export function forceSunshineCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSunshineCritProc(floor);
}

export function forceSnowdayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSnowdayCritProc(floor);
}

export function forceFastForwardCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFastForwardCritProc(floor);
}

export function forceFrozenCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFrozenCritProc(floor);
}

export function forceSnowballCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSnowballCritProc(floor);
}

export function forceFreeSaleCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFreeSaleCritProc(floor);
}

export function forceBullMarketCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceBullMarketCritProc(floor);
}

export function forcePaydayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePaydayCritProc(floor);
}

export function forceGoldStandardCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceGoldStandardCritProc(floor);
}

// dev/test-only: force this floor into a night shift crit, bypassing chance
// entirely (see hud/testButton's "Spawn Night Shift Crit") — not tier-scaled,
// so no tier param needed
export function forceNightShiftCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceNightShiftCritProc(floor);
}

// dev/test-only: force this floor into an intern/union boss crit, bypassing
// chance entirely (see hud/testButton's "Spawn Intern Crit"/"Spawn Union
// Boss Crit") — not tier-scaled, so no tier param needed (same shape as
// chair giveaway/supplies giveaway above)
export function forceInternCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceInternCritProc(floor);
}

export function forceUnionBossCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceUnionBossCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a Rush
// Hour proc, bypassing chance entirely (see hud/testButton's "Spawn Rush
// Hour Crit") — not tier-scaled, so no tier param needed
export function forceRushHourCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRushHourCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a
// Golden Ticket proc, bypassing chance entirely (see hud/testButton's "Spawn
// Golden Ticket Crit") — not tier-scaled, so no tier param needed
export function forceGoldenTicketCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceGoldenTicketCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a
// Silver Ticket proc, bypassing chance entirely (see hud/testButton's "Spawn
// Silver Ticket Crit") — not tier-scaled, so no tier param needed
export function forceSilverTicketCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSilverTicketCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a
// Golden Parachute proc, bypassing chance entirely (see hud/testButton's
// "Spawn Golden Parachute Crit") — not tier-scaled, so no tier param needed
export function forceGoldenParachuteCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceGoldenParachuteCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a
// Payout proc, bypassing chance entirely (see hud/testButton's "Spawn
// Payout Crit") — not tier-scaled, so no tier param needed
export function forcePayoutCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePayoutCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a
// Grand Opening proc, bypassing chance entirely (see hud/testButton's
// "Spawn Grand Opening Crit") — not tier-scaled, so no tier param needed
export function forceGrandOpeningCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceGrandOpeningCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a Fully
// Staffed proc, bypassing chance entirely
export function forceFullyStaffedCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFullyStaffedCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry an
// Espresso Shot proc, bypassing chance entirely
export function forceEspressoShotCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceEspressoShotCritProc(floor);
}

// dev/test-only: force this floor's already-armed tier to also carry a Deja Vu
// proc, bypassing chance entirely
export function forceDejaVuCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceDejaVuCritProc(floor);
}

export function forceCloneArmyCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceCloneArmyCritProc(floor);
}

export function forceLuckyCloverCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceLuckyCloverCritProc(floor);
}

export function forceSecondWindCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSecondWindCritProc(floor);
}

export function forceExecutiveOrderCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceExecutiveOrderCritProc(floor);
}

export function forceRoundUpCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRoundUpCritProc(floor);
}

// dev/test-only: force the NEXT "special crit crit" bonus tier a floor's
// already-armed (or yet to be armed) proc rides in on, bypassing chance
// entirely and WITHOUT forcing any particular proc itself — combine with any
// of the existing "Spawn X Crit" buttons (see hud/testButton's "Spawn Bonus
// Tier Crit"/"Mega Crit"/"Ultra Crit") to test a chosen proc + a chosen
// bonus tier together
export function forceBonusTierCritUpgrade(floor: Floor, tier: CritTier): void {
  forceBonusTierCritProc(floor, tier);
}
