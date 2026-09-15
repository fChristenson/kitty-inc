import type { BigNumber } from "../shared/bigNumber";
import { createTotalIncomeReadout } from "../shared/totalIncomeReadout";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
const HUD_UNIT_NAME_GAP_PX = 24; // below the amount's own measured bottom edge
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

const totalIncomeReadout = createTotalIncomeReadout();

// returns the actual screen-Y just below the drawn readout (amount, plus the
// unit-name line under it once the total is big enough to have one) — the
// real tappable height varies with that, so callers doing hit-testing (see
// gameCanvas's own HUD tap zone) must use this return value, not a fixed guess
export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: BigNumber,
): number {
  return totalIncomeReadout.draw(
    ctx,
    canvasWidth / 2,
    HUD_TOP_MARGIN,
    totalIncome,
    {
      fontSize: HUD_FONT_SIZE,
      unitNameGapPx: HUD_UNIT_NAME_GAP_PX,
    },
  );
}

// everything below is this module's own facade: hud/ has several nested widgets
// (actionBar, upgradeMenu, boostMenu, ...) that stay together for internal reuse, but
// anything outside src/hud must import them from here, never from a nested path
export { createActionBarMarkup, wireActionBar } from "./actionBar";
export type { ActionBarHandlers } from "./actionBar";
export {
  createBoostMenuMarkup,
  wireBoostMenu,
  applyBoostAll,
} from "./boostMenu";
export type { BoostMenu } from "./boostMenu";
export {
  createCorporationBoostMenuMarkup,
  wireCorporationBoostMenu,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  mergeCompanies,
} from "./corporationBoostMenu";
export type { CorporationBoostMenu } from "./corporationBoostMenu";
export {
  createCorporationStatsMarkup,
  wireCorporationStats,
} from "./corporationStats";
export type { CorporationStats } from "./corporationStats";
export { createMapMenuMarkup, wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireSpawnCritButton,
  wireSpawnMegaCritButton,
  wireSpawnUltraCritButton,
  wireSpawnChainCritButton,
  wireSpawnChainMegaCritButton,
  wireSpawnChainUltraCritButton,
  wireSpawnBoostCritButton,
  wireSpawnBounceCritButton,
  wireSpawnBounceMegaCritButton,
  wireSpawnBounceUltraCritButton,
  wireSpawnExplosionCritButton,
  wireSpawnExplosionMegaCritButton,
  wireSpawnExplosionUltraCritButton,
  wireSpawnBootyCritButton,
  wireSpawnUpgradeCritButton,
  wireSpawnPeppermintCritButton,
  wireSpawnHeavenlyCritButton,
  wireSpawnPairCritButton,
  wireSpawnThreeOfAKindCritButton,
  wireSpawnFourOfAKindCritButton,
  wireSpawnFullHouseCritButton,
  wireSpawnRoyalFlushCritButton,
  wireSpawnTickTockCritButton,
  wireSpawnChairGiveawayCritButton,
  wireSpawnSuppliesGiveawayCritButton,
  wireSpawnWinterSaleCritButton,
  wireSpawnSpringSaleCritButton,
  wireSpawnSummerSaleCritButton,
  wireSpawnAutumnSaleCritButton,
  wireSpawnHalloweenSaleCritButton,
  wireSpawnEasterSaleCritButton,
  wireSpawnSunshineCritButton,
  wireSpawnSnowdayCritButton,
  wireSpawnFastForwardCritButton,
  wireSpawnFrozenCritButton,
  wireSpawnSnowballCritButton,
  wireSpawnFreeSaleCritButton,
  wireSpawnPaydayCritButton,
  wireSpawnGoldStandardCritButton,
  wireSpawnNightShiftCritButton,
  wireSpawnInternCritButton,
  wireSpawnUnionBossCritButton,
  wireSpawnRushHourCritButton,
  wireSpawnGoldenTicketCritButton,
  wireSpawnSilverTicketCritButton,
  wireSpawnGrandOpeningCritButton,
  wireSpawnFullyStaffedCritButton,
  wireSpawnEspressoShotCritButton,
  wireSpawnGoldenParachuteCritButton,
  wireSpawnPayoutCritButton,
  wireForceBonusTierCritButton,
  wireForceBonusTierMegaCritButton,
  wireForceBonusTierUltraCritButton,
  wireFloorBuyCritButton,
  wireFloorBuyBoostCritButton,
  wireFloorBuyMegaCritButton,
  wireFloorBuyUltraCritButton,
  wireFloorBuyChainCritButton,
  wireFloorBuyChainMegaCritButton,
  wireFloorBuyChainUltraCritButton,
  wireFloorBuyBounceCritButton,
  wireFloorBuyBounceMegaCritButton,
  wireFloorBuyBounceUltraCritButton,
  wireFloorBuyExplosionCritButton,
  wireFloorBuyExplosionMegaCritButton,
  wireFloorBuyExplosionUltraCritButton,
  wireFloorBuyBootyCritButton,
  wireFloorBuyUpgradeCritButton,
  wireFloorBuyPeppermintCritButton,
  wireFloorBuyHeavenlyCritButton,
  wireFloorBuyPairCritButton,
  wireFloorBuyThreeOfAKindCritButton,
  wireFloorBuyFourOfAKindCritButton,
  wireFloorBuyFullHouseCritButton,
  wireFloorBuyRoyalFlushCritButton,
  wireFloorBuyTickTockCritButton,
  wireFloorBuyChairGiveawayCritButton,
  wireFloorBuySuppliesGiveawayCritButton,
  wireFloorBuyWinterSaleCritButton,
  wireFloorBuySpringSaleCritButton,
  wireFloorBuySummerSaleCritButton,
  wireFloorBuyAutumnSaleCritButton,
  wireFloorBuyHalloweenSaleCritButton,
  wireFloorBuyEasterSaleCritButton,
  wireFloorBuySunshineCritButton,
  wireFloorBuySnowdayCritButton,
  wireFloorBuyFastForwardCritButton,
  wireFloorBuyFrozenCritButton,
  wireFloorBuySnowballCritButton,
  wireFloorBuyFreeSaleCritButton,
  wireFloorBuyPaydayCritButton,
  wireFloorBuyGoldStandardCritButton,
  wireFloorBuyNightShiftCritButton,
  wireFloorBuyInternCritButton,
  wireFloorBuyUnionBossCritButton,
  wireFloorBuyRushHourCritButton,
  wireFloorBuyGoldenTicketCritButton,
  wireFloorBuySilverTicketCritButton,
  wireFloorBuyGrandOpeningCritButton,
  wireFloorBuyFullyStaffedCritButton,
  wireFloorBuyEspressoShotCritButton,
  wireFloorBuyGoldenParachuteCritButton,
  wireFloorBuyPayoutCritButton,
  wireMapUnlockCritButton,
  wireMapUnlockMegaCritButton,
  wireMapUnlockUltraCritButton,
  wireMapUnlockChainCritButton,
  wireMapUnlockChainMegaCritButton,
  wireMapUnlockChainUltraCritButton,
  wireMapUnlockUpgradeCritButton,
  wireMapUnlockGrandOpeningCritButton,
  wireMapUnlockFullyStaffedCritButton,
  wireMapUnlockEspressoShotCritButton,
  wireMapUnlockHeavenlyCritButton,
  wireMapUnlockPairCritButton,
  wireMapUnlockThreeOfAKindCritButton,
  wireMapUnlockFourOfAKindCritButton,
  wireMapUnlockFullHouseCritButton,
  wireMapUnlockRoyalFlushCritButton,
  wireIdleOverlayTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
export {
  createFloorUpgradeMenuMarkup,
  wireFloorUpgradeMenu,
  hasAffordableFloorUpgrade,
} from "./floorUpgradeMenu";
export type { FloorUpgradeMenu } from "./floorUpgradeMenu";
export {
  createCorporationUpgradeMenuMarkup,
  wireCorporationUpgradeMenu,
} from "./corporationUpgradeMenu";
export type { CorporationUpgradeMenu } from "./corporationUpgradeMenu";
export {
  createTotalEarnedOverlayMarkup,
  wireTotalEarnedOverlay,
} from "./totalEarnedOverlay";
export type { TotalEarnedOverlay } from "./totalEarnedOverlay";
