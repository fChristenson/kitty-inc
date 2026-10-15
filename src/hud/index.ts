export { wireCritTestActions } from "./testButton";

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
export { wireActionBar } from "./actionBar";
export type { ActionBarHandlers } from "./actionBar";
export { wireBoostMenu, applyBoostAll } from "./boostMenu";
export type { BoostMenu } from "./boostMenu";
export {
  wireBadgeCollection,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getActiveCompanyAssetValue,
  getCompanyUpgradesValue,
  mergeCompanies,
} from "./corporationBoostMenu";
export type { BadgeCollection } from "./corporationBoostMenu";
export { wireCorporationStats } from "./corporationStats";
export type { CorporationStats } from "./corporationStats";
export { wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnTestButtons,
  wireTestActionsFilter,
  sortTestActionMenus,
  wireIdleOverlayTestButton,
  wireSplashTestButton,
  wireAddBadgesTestButtons,
  wireFoilRevealTestButtons,
  wireEventTestButtons,
  wireBadgeCapsuleTestButton,
  wireFloorCritTestButtons,
  wireIncomeCritTestButtons,
  wireButtonCritTestButtons,
  wireLockCritTestButtons,
  wireRateCritTestButtons,
  wireResetButton,
} from "./testButton";
export { wireUpgradeMenu } from "./upgradeMenu";
export {
  getWorkerCost,
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
  buyWorker,
  buyOfficeChairs,
  buyOfficeSupplies,
  buyManager,
  isManagerUnlocked,
  MANAGER_MIN_UPGRADE_COUNT,
} from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
export { wireFloorUpgradeMenu } from "./floorUpgradeMenu";
export type { FloorUpgradeMenu } from "./floorUpgradeMenu";
export { wireCorporationUpgradeMenu } from "./corporationUpgradeMenu";
export type { CorporationUpgradeMenu } from "./corporationUpgradeMenu";
export { wireTotalEarnedOverlay } from "./totalEarnedOverlay";
export type { TotalEarnedOverlay } from "./totalEarnedOverlay";
