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
export { getPriceMatchCost } from "../../shared/critTypes";
export {
  type CritTier,
  type CritTierDef,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  CRIT_UPGRADE_COUNT,
  MEGA_CRIT_UPGRADE_COUNT,
  ULTRA_CRIT_UPGRADE_COUNT,
  CHAIN_CRIT_CONTINUE_CHANCE,
  DOMINO_EFFECT_CONTINUE_CHANCE,
  DOMINO_EFFECT_CRIT_COLOR,
  DOMINO_EFFECT_CRIT_LABEL,
  BLUEPRINT_CRIT_COLOR,
  BLUEPRINT_CRIT_LABEL,
  BOOST_CRIT_COLOR,
  BOOST_CRIT_LABEL,
  BOUNCE_CRIT_CONTINUE_CHANCE,
  BOUNCE_CRIT_LABEL,
  EXPLOSION_CRIT_CONTINUE_CHANCE,
  EXPLOSION_CRIT_LABEL,
  BOOTY_CRIT_COLOR,
  BOOTY_CRIT_LABEL,
  CASH_FLOW_CRIT_COLOR,
  CASH_FLOW_CRIT_LABEL,
  UPGRADE_CRIT_COLOR,
  UPGRADE_CRIT_LABEL,
  PEPPERMINT_CRIT_COLOR,
  PEPPERMINT_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  MYSTIC_CRIT_COLOR,
  MYSTIC_CRIT_LABEL,
  MYSTIC_UPGRADE_COUNT,
  KEYNOTE_CRIT_COLOR,
  KEYNOTE_CRIT_LABEL,
  KEYNOTE_UPGRADE_COUNT,
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
  OPEN_BOOK_CRIT_COLOR,
  OPEN_BOOK_CRIT_LABEL,
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
  SPENDING_FREEZE_CRIT_COLOR,
  SPENDING_FREEZE_CRIT_LABEL,
  SPENDING_FREEZE_DURATION_MS,
  triggerSpendingFreeze,
  isSpendingFreezeActive,
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
  TALENT_SCOUT_CRIT_COLOR,
  TALENT_SCOUT_CRIT_LABEL,
  UNION_BOSS_CRIT_COLOR,
  UNION_BOSS_CRIT_LABEL,
  RUSH_HOUR_CRIT_COLOR,
  RUSH_HOUR_CRIT_LABEL,
  RUSH_HOUR_DURATION_MS,
  RUSH_HOUR_INTERVAL_SECONDS,
  triggerRushHourCrit,
  isRushHourActive,
  RATE_LOCK_CRIT_COLOR,
  RATE_LOCK_CRIT_LABEL,
  RATE_LOCK_DURATION_MS,
  RATE_LOCK_SPEED_MULTIPLIER,
  triggerRateLockCrit,
  isRateLockActive,
  GOLDEN_TICKET_CRIT_COLOR,
  GOLDEN_TICKET_CRIT_LABEL,
  SILVER_TICKET_CRIT_COLOR,
  SILVER_TICKET_CRIT_LABEL,
  GOLDEN_PARACHUTE_CRIT_COLOR,
  GOLDEN_PARACHUTE_CRIT_LABEL,
  RAIN_CHECK_CRIT_COLOR,
  RAIN_CHECK_CRIT_LABEL,
  RAIN_CHECK_CRIT_SECONDS,
  PAYOUT_CRIT_COLOR,
  PAYOUT_CRIT_LABEL,
  GRAND_OPENING_CRIT_COLOR,
  GRAND_OPENING_CRIT_LABEL,
  FULLY_STAFFED_CRIT_COLOR,
  FULLY_STAFFED_CRIT_LABEL,
  SKIP_CRIT_COLOR,
  SKIP_CRIT_LABEL,
  SHIFT_CHANGE_CRIT_COLOR,
  SHIFT_CHANGE_CRIT_LABEL,
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
  SAFETY_NET_CRIT_COLOR,
  SAFETY_NET_CRIT_LABEL,
  SAFETY_NET_CRIT_UPGRADES,
  SAME_BOAT_CRIT_COLOR,
  SAME_BOAT_CRIT_LABEL,
  GOLDEN_HANDSHAKE_CRIT_COLOR,
  GOLDEN_HANDSHAKE_CRIT_LABEL,
  SUPPLY_RUN_CRIT_COLOR,
  SUPPLY_RUN_CRIT_LABEL,
  CASUAL_FRIDAY_CRIT_COLOR,
  CASUAL_FRIDAY_CRIT_LABEL,
  CASUAL_FRIDAY_CRIT_UPGRADES,
  FANCY_FRIDAY_CRIT_COLOR,
  FANCY_FRIDAY_CRIT_LABEL,
  FANCY_FRIDAY_CRIT_UPGRADES,
  FIRE_DRILL_CRIT_COLOR,
  FIRE_DRILL_CRIT_LABEL,
  PERFORMANCE_BONUS_CRIT_COLOR,
  PERFORMANCE_BONUS_CRIT_LABEL,
  DOUBLE_DOWN_CRIT_COLOR,
  DOUBLE_DOWN_CRIT_LABEL,
  DOUBLE_DOWN_CRIT_REPEATS,
  COFFEE_RUN_CRIT_COLOR,
  COFFEE_RUN_CRIT_LABEL,
  TEAM_BUILDING_CRIT_COLOR,
  TEAM_BUILDING_CRIT_LABEL,
  TEAM_LUNCH_CRIT_COLOR,
  TEAM_LUNCH_CRIT_LABEL,
  SPRING_CLEANING_CRIT_COLOR,
  SPRING_CLEANING_CRIT_LABEL,
  NIGHT_OWL_CRIT_COLOR,
  NIGHT_OWL_CRIT_LABEL,
  HEADHUNTER_CRIT_COLOR,
  HEADHUNTER_CRIT_LABEL,
  DRESS_CODE_CRIT_COLOR,
  DRESS_CODE_CRIT_LABEL,
  RECRUITMENT_DRIVE_CRIT_COLOR,
  RECRUITMENT_DRIVE_CRIT_LABEL,
  MERGER_CRIT_COLOR,
  MERGER_CRIT_LABEL,
  isChainCrit,
  isDominoEffectCrit,
  isBlueprintCrit,
  isBoostCrit,
  isBounceCrit,
  isExplosionCrit,
  isBootyCrit,
  isCashFlowCrit,
  isUpgradeCrit,
  isPeppermintCrit,
  isHeavenlyCrit,
  isMysticCrit,
  isKeynoteCrit,
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
  isSpendingFreezeCrit,
  isSnowballCrit,
  isFreeSaleCrit,
  isBullMarketCrit,
  isPaydayCrit,
  isGoldStandardCrit,
  isNightShiftCrit,
  isInternCrit,
  isTalentScoutCrit,
  isUnionBossCrit,
  isRushHourCrit,
  isGoldenTicketCrit,
  isSilverTicketCrit,
  isGoldenParachuteCrit,
  isExecutiveBonusCrit,
  isPowerSurgeCrit,
  isPriceMatchCrit,
  isFirstClassCrit,
  isPayoutCrit,
  isGrandOpeningCrit,
  isFullyStaffedCrit,
  isSkipCrit,
  isShiftChangeCrit,
  isEspressoShotCrit,
  isDejaVuCrit,
  isCloneArmyCrit,
  isLuckyCloverCrit,
  isSecondWindCrit,
  isExecutiveOrderCrit,
  isRoundUpCrit,
  isSafetyNetCrit,
  isFloorShareCrit,
  isSameBoatCrit,
  isGoldenHandshakeCrit,
  isSupplyRunCrit,
  isCasualFridayCrit,
  isFancyFridayCrit,
  isFireDrillCrit,
  isBonusRoundCrit,
  isOverflowCrit,
  isPerformanceBonusCrit,
  isDoubleDownCrit,
  isCoffeeRunCrit,
  isTeamBuildingCrit,
  isTeamLunchCrit,
  isSpringCleaningCrit,
  isNightOwlCrit,
  isHeadhunterCrit,
  isDressCodeCrit,
  isRecruitmentDriveCrit,
  isMergerCrit,
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
  forceDominoEffectCritProc,
  forceBlueprintCritProc,
  forceBoostCritProc,
  forceBounceCritProc,
  forceExplosionCritProc,
  forceBootyCritProc,
  forceCashFlowCritProc,
  forceUpgradeCritProc,
  forcePeppermintCritProc,
  forceHeavenlyCritProc,
  forceMysticCritProc,
  forceKeynoteCritProc,
  forcePairCritProc,
  forceThreeOfAKindCritProc,
  forceFourOfAKindCritProc,
  forceFullHouseCritProc,
  forceRoyalFlushCritProc,
  forceOpenBookCritProc,
  forceLuckyNumberCritProc,
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
  forceSpendingFreezeCritProc,
  forceSnowballCritProc,
  forceFreeSaleCritProc,
  forceBullMarketCritProc,
  forcePaydayCritProc,
  forceGoldStandardCritProc,
  forceNightShiftCritProc,
  forceInternCritProc,
  forceTalentScoutCritProc,
  forceUnionBossCritProc,
  forceRushHourCritProc,
  forceRateLockCritProc,
  forceGoldenTicketCritProc,
  forceSilverTicketCritProc,
  forceGoldenParachuteCritProc,
  forceRainCheckCritProc,
  forceExecutiveBonusCritProc,
  forcePowerSurgeCritProc,
  forcePriceMatchCritProc,
  forceFirstClassCritProc,
  forcePayoutCritProc,
  forceGrandOpeningCritProc,
  forceFullyStaffedCritProc,
  forceSkipCritProc,
  forceShiftChangeCritProc,
  forceEspressoShotCritProc,
  forceDejaVuCritProc,
  forceCloneArmyCritProc,
  forceLuckyCloverCritProc,
  forceSecondWindCritProc,
  forceExecutiveOrderCritProc,
  forceRoundUpCritProc,
  forceSafetyNetCritProc,
  forceFloorShareCritProc,
  forceSameBoatCritProc,
  forceGoldenHandshakeCritProc,
  forceSupplyRunCritProc,
  forceCasualFridayCritProc,
  forceFancyFridayCritProc,
  forceFireDrillCritProc,
  forceBonusRoundCritProc,
  forceOverflowCritProc,
  forcePerformanceBonusCritProc,
  forceDoubleDownCritProc,
  forceCoffeeRunCritProc,
  forceTeamBuildingCritProc,
  forceTeamLunchCritProc,
  forceSpringCleaningCritProc,
  forceNightOwlCritProc,
  forceHeadhunterCritProc,
  forceDressCodeCritProc,
  forceTeaBreakCritProc,
  forceRecruitmentDriveCritProc,
  forceMergerCritProc,
  forceShareholdersCritProc,
  forceBonusTierCritProc,
} from "../../shared/critTypes";
import type { Floor } from "../../gameState";
import {
  FEATURED_CRIT_KINDS,
  featuredCritFlags,
  forceCritProc,
  readCritProcs,
  type CritProcKind,
  type FeaturedCritKind,
} from "../../shared/critTypes";

const critTiers = new WeakMap<Floor, CritTier>();

let testCritFloor: Floor | null = null;

export function forceTestCrit(
  floor: Floor,
  kind: CritProcKind | null,
  tier: CritTier,
  bonusTier: CritTier | null,
  event: "upgrade" | "unlock" | "map",
): void {
  if (testCritFloor) consumeCritUpgrade(testCritFloor);
  testCritFloor = floor;
  consumeCritUpgrade(floor);
  forcedFloorBuyCrit = null;
  const result: CritRollResult = {
    ...readCritProcs(floor),
    tier,
    bonusTier: kind ? bonusTier : null,
  };
  if (kind) result[kind] = true;
  if (event !== "upgrade") {
    forcedFloorBuyCrit = result;
    return;
  }
  critTiers.set(floor, tier);
  if (kind) forceCritProc(kind, floor);
  if (result.bonusTier) forceBonusTierCritProc(floor, result.bonusTier);
}

export function forceFeaturedCritUpgrade(
  floor: Floor,
  kind: FeaturedCritKind,
  tier: CritTier = "crit",
): void {
  consumeCritProcs(floor);
  critTiers.set(floor, tier);
  forceCritProc(kind, floor);
}

export function forceFeaturedFloorBuyCrit(
  kind: FeaturedCritKind,
  tier: CritTier = "crit",
): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit[kind] = true;
}

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
    for (const kind of FEATURED_CRIT_KINDS) {
      if (result[kind]) forceCritProc(kind, floor);
    }
    if (result.chain) forceChainCritProc(floor);
    if (result.dominoEffect) forceDominoEffectCritProc(floor);
    if (result.blueprint) forceBlueprintCritProc(floor);
    if (result.boost) forceBoostCritProc(floor);
    if (result.bounce) forceBounceCritProc(floor);
    if (result.explosion) forceExplosionCritProc(floor);
    if (result.booty) forceBootyCritProc(floor);
    if (result.cashFlow) forceCashFlowCritProc(floor);
    if (result.upgrade) forceUpgradeCritProc(floor);
    if (result.peppermint) forcePeppermintCritProc(floor);
    if (result.heavenly) forceHeavenlyCritProc(floor);
    if (result.mystic) forceMysticCritProc(floor);
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
    if (result.spendingFreeze) forceSpendingFreezeCritProc(floor);
    if (result.snowball) forceSnowballCritProc(floor);
    if (result.freeSale) forceFreeSaleCritProc(floor);
    if (result.bullMarket) forceBullMarketCritProc(floor);
    if (result.payday) forcePaydayCritProc(floor);
    if (result.goldStandard) forceGoldStandardCritProc(floor);
    if (result.nightShift) forceNightShiftCritProc(floor);
    if (result.intern) forceInternCritProc(floor);
    if (result.unionBoss) forceUnionBossCritProc(floor);
    if (result.rushHour) forceRushHourCritProc(floor);
    if (result.rateLock) forceRateLockCritProc(floor);
    if (result.goldenTicket) forceGoldenTicketCritProc(floor);
    if (result.silverTicket) forceSilverTicketCritProc(floor);
    if (result.goldenParachute) forceGoldenParachuteCritProc(floor);
    if (result.rainCheck) forceRainCheckCritProc(floor);
    if (result.executiveBonus) forceExecutiveBonusCritProc(floor);
    if (result.powerSurge) forcePowerSurgeCritProc(floor);
    if (result.priceMatch) forcePriceMatchCritProc(floor);
    if (result.firstClass) forceFirstClassCritProc(floor);
    if (result.payout) forcePayoutCritProc(floor);
    if (result.grandOpening) forceGrandOpeningCritProc(floor);
    if (result.fullyStaffed) forceFullyStaffedCritProc(floor);
    if (result.shiftChange) forceShiftChangeCritProc(floor);
    if (result.espressoShot) forceEspressoShotCritProc(floor);
    if (result.dejaVu) forceDejaVuCritProc(floor);
    if (result.cloneArmy) forceCloneArmyCritProc(floor);
    if (result.secondWind) forceSecondWindCritProc(floor);
    if (result.executiveOrder) forceExecutiveOrderCritProc(floor);
    if (result.roundUp) forceRoundUpCritProc(floor);
    if (result.safetyNet) forceSafetyNetCritProc(floor);
    if (result.floorShare) forceFloorShareCritProc(floor);
    if (result.sameBoat) forceSameBoatCritProc(floor);
    if (result.goldenHandshake) forceGoldenHandshakeCritProc(floor);
    if (result.supplyRun) forceSupplyRunCritProc(floor);
    if (result.casualFriday) forceCasualFridayCritProc(floor);
    if (result.fancyFriday) forceFancyFridayCritProc(floor);
    if (result.fireDrill) forceFireDrillCritProc(floor);
    if (result.bonusRound) forceBonusRoundCritProc(floor);
    if (result.overflow) forceOverflowCritProc(floor);
    if (result.performanceBonus) forcePerformanceBonusCritProc(floor);
    if (result.doubleDown) forceDoubleDownCritProc(floor);
    if (result.coffeeRun) forceCoffeeRunCritProc(floor);
    if (result.teamBuilding) forceTeamBuildingCritProc(floor);
    if (result.teamLunch) forceTeamLunchCritProc(floor);
    if (result.springCleaning) forceSpringCleaningCritProc(floor);
    if (result.nightOwl) forceNightOwlCritProc(floor);
    if (result.headhunter) forceHeadhunterCritProc(floor);
    if (result.dressCode) forceDressCodeCritProc(floor);
    if (result.teaBreak) forceTeaBreakCritProc(floor);
    if (result.recruitmentDrive) forceRecruitmentDriveCritProc(floor);
    if (result.merger) forceMergerCritProc(floor);
    if (result.shareholders) forceShareholdersCritProc(floor);
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
  talentScout = false,
  unionBoss = false,
  easterSale = false,
  rushHour = false,
  goldenTicket = false,
  silverTicket = false,
  goldenParachute = false,
  executiveBonus = false,
  payout = false,
  grandOpening = false,
  fullyStaffed = false,
  shiftChange = false,
  espressoShot = false,
  dejaVu = false,
  cloneArmy = false,
  merger = false,
  teamLunch = false,
  dominoEffect = false,
  mystic = false,
  keynote = false,
  skip = false,
  rainCheck = false,
): void {
  forcedFloorBuyCrit = {
    ...featuredCritFlags(),
    tier,
    bonusTier,
    chain,
    dominoEffect,
    blueprint: false,
    boost,
    bounce,
    explosion,
    booty,
    cashFlow: false,
    upgrade,
    peppermint,
    heavenly,
    mystic,
    keynote,
    skip,
    rainCheck,
    pair,
    threeOfAKind,
    fourOfAKind,
    fullHouse,
    luckyNumber: false,
    openBook: false,
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
    spendingFreeze: false,
    snowball,
    freeSale,
    bullMarket,
    payday,
    goldStandard,
    royalFlush,
    nightShift,
    intern,
    talentScout,
    unionBoss,
    rushHour,
    rateLock: false,
    goldenTicket,
    silverTicket,
    goldenParachute,
    executiveBonus,
    powerSurge: false,
    priceMatch: false,
    firstClass: false,
    payout,
    grandOpening,
    fullyStaffed,
    shiftChange,
    espressoShot,
    dejaVu,
    cloneArmy,
    luckyClover: false,
    secondWind: false,
    executiveOrder: false,
    roundUp: false,
    safetyNet: false,
    floorShare: false,
    sameBoat: false,
    goldenHandshake: false,
    supplyRun: false,
    casualFriday: false,
    fancyFriday: false,
    fireDrill: false,
    bonusRound: false,
    overflow: false,
    performanceBonus: false,
    doubleDown: false,
    coffeeRun: false,
    teamBuilding: false,
    teamLunch,
    springCleaning: false,
    nightOwl: false,
    headhunter: false,
    dressCode: false,
    teaBreak: false,
    recruitmentDrive: false,
    merger,
    shareholders: false,
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

export function forceShiftChangeFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.shiftChange = true;
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

export function forceGoldenHandshakeFloorBuyCrit(
  tier: CritTier = "crit",
): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.goldenHandshake = true;
}

export function forceSupplyRunFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.supplyRun = true;
}

export function forceCasualFridayFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.casualFriday = true;
}

export function forceFancyFridayFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.fancyFriday = true;
}

export function forceFireDrillFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.fireDrill = true;
}

export function forceBonusRoundFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.bonusRound = true;
}

export function forceOverflowFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.overflow = true;
}

export function forcePerformanceBonusFloorBuyCrit(
  tier: CritTier = "crit",
): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.performanceBonus = true;
}

export function forceDoubleDownFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.doubleDown = true;
}

export function forceCoffeeRunFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.coffeeRun = true;
}

export function forceTeamBuildingFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.teamBuilding = true;
}

export function forceTeamLunchFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.teamLunch = true;
}

export function forceSpringCleaningFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.springCleaning = true;
}

export function forceNightOwlFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.nightOwl = true;
}

export function forceHeadhunterFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.headhunter = true;
}

export function forceDressCodeFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.dressCode = true;
}

export function forceTeaBreakFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.teaBreak = true;
}

export function forceRecruitmentDriveFloorBuyCrit(
  tier: CritTier = "crit",
): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.recruitmentDrive = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Payout proc on top of the chosen tier (default "crit")
export function forcePayoutFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.payout = true;
}

// dev/test-only: guarantees the next floor/building purchase crit carries a
// Domino Effect proc on top of the chosen tier
export function forceDominoEffectFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.dominoEffect = true;
}

export function forceBlueprintFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.blueprint = true;
}

export function forceFirstClassFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.firstClass = true;
}

export function forceLuckyNumberFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.luckyNumber = true;
}

export function forceOpenBookFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.openBook = true;
}

export function forceExecutiveBonusFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.executiveBonus = true;
}

export function forcePowerSurgeFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.powerSurge = true;
}

export function forcePriceMatchFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.priceMatch = true;
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

// dev/test-only: force this floor into a Domino Effect crit at the given tier
// (default "crit"), bypassing both the tier chance and proc chance
export function forceDominoEffectCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceDominoEffectCritProc(floor);
}

export function forceBlueprintCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceBlueprintCritProc(floor);
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

export function forceMysticCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceMysticCritProc(floor);
}

// dev/test-only: force this floor into a Keynote crit, bypassing chance
export function forceKeynoteCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceKeynoteCritProc(floor);
}

export function forceSkipCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSkipCritProc(floor);
}

// dev/test-only: guarantees the next floor/building purchase carries a Mystic
// proc.
export function forceMysticFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.mystic = true;
}

// dev/test-only: guarantees the next floor/building purchase carries a Keynote
// proc on top of the chosen tier
export function forceKeynoteFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.keynote = true;
}

export function forceSkipFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.skip = true;
}

export function forceRainCheckFloorBuyCrit(tier: CritTier = "crit"): void {
  forceFloorBuyCrit(tier);
  if (forcedFloorBuyCrit) forcedFloorBuyCrit.rainCheck = true;
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

export function forceSpendingFreezeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSpendingFreezeCritProc(floor);
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

export function forceTalentScoutCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceTalentScoutCritProc(floor);
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

export function forceRateLockCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRateLockCritProc(floor);
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

export function forceRainCheckCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRainCheckCritProc(floor);
}

export function forceExecutiveBonusCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceExecutiveBonusCritProc(floor);
}

export function forcePowerSurgeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePowerSurgeCritProc(floor);
}

export function forcePriceMatchCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePriceMatchCritProc(floor);
}

export function forceFirstClassCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFirstClassCritProc(floor);
}

export function forceLuckyNumberCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceLuckyNumberCritProc(floor);
}

export function forceOpenBookCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceOpenBookCritProc(floor);
}

export function forceCashFlowCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceCashFlowCritProc(floor);
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

export function forceShiftChangeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceShiftChangeCritProc(floor);
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

export function forceSafetyNetCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSafetyNetCritProc(floor);
}

export function forceFloorShareCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFloorShareCritProc(floor);
}

export function forceSameBoatCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSameBoatCritProc(floor);
}

export function forceGoldenHandshakeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceGoldenHandshakeCritProc(floor);
}

export function forceSupplyRunCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSupplyRunCritProc(floor);
}

export function forceCasualFridayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceCasualFridayCritProc(floor);
}

export function forceFancyFridayCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFancyFridayCritProc(floor);
}

export function forceFireDrillCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceFireDrillCritProc(floor);
}

export function forceBonusRoundCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceBonusRoundCritProc(floor);
}

export function forceOverflowCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceOverflowCritProc(floor);
}

export function forcePerformanceBonusCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forcePerformanceBonusCritProc(floor);
}

export function forceDoubleDownCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceDoubleDownCritProc(floor);
}

export function forceCoffeeRunCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceCoffeeRunCritProc(floor);
}

export function forceTeamBuildingCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceTeamBuildingCritProc(floor);
}

export function forceTeamLunchCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceTeamLunchCritProc(floor);
}

export function forceSpringCleaningCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceSpringCleaningCritProc(floor);
}

export function forceNightOwlCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceNightOwlCritProc(floor);
}

export function forceHeadhunterCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceHeadhunterCritProc(floor);
}

export function forceDressCodeCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceDressCodeCritProc(floor);
}

export function forceTeaBreakCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceTeaBreakCritProc(floor);
}

export function forceRecruitmentDriveCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceRecruitmentDriveCritProc(floor);
}

export function forceMergerCritUpgrade(
  floor: Floor,
  tier: CritTier = "crit",
): void {
  critTiers.set(floor, tier);
  forceMergerCritProc(floor);
}

export function forceShareholdersCritUpgrade(floor: Floor): void {
  critTiers.set(floor, "crit");
  forceShareholdersCritProc(floor);
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
