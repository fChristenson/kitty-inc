// floor crits: the x5/x25/x125 crit tiers rolled on upgrade clicks and
// floor/building unlocks, the special crits riding on them (chain, boost,
// heavenly…), their rewards on floors and buildings and their celebration

export { celebrateBuildingCrit, createBuildingCrits } from "./buildingCrits";
export {
  consumeCritUpgrade,
  forceCritMoment,
  forceCritUpDown,
  forceMergeCrit,
  forceTestCrit,
  getCritMoment,
  getCritTier,
  getMergeCrit,
  isCritDown,
  isCritUp,
  isCritUpgrade,
  rollCritUpgrade,
  rollFloorBuyCrit,
} from "./upgradeCrit";
export {
  applyFloorCrit,
  critNow,
  eventProcContext,
  openBuildingBadgeCapsule,
  promoteTierKeepingLevel,
} from "./floorCritRewards";
export { triggerCritCelebration } from "./critCelebration";
export { applyBonusTierIncome, celebrateBonusTier } from "./bonusTierReward";
