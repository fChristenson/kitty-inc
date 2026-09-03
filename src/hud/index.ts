import type { BigNumber } from "../shared/bigNumber";
import { createTotalIncomeReadout } from "../shared/totalIncomeReadout";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
const HUD_UNIT_NAME_GAP_PX = 24; // below the amount's own measured bottom edge
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

const totalIncomeReadout = createTotalIncomeReadout();

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: BigNumber,
): void {
  totalIncomeReadout.draw(ctx, canvasWidth / 2, HUD_TOP_MARGIN, totalIncome, {
    fontSize: HUD_FONT_SIZE,
    unitNameGapPx: HUD_UNIT_NAME_GAP_PX,
  });
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
  grantFreePressConference,
  mergeCompanies,
} from "./corporationBoostMenu";
export type { CorporationBoostMenu } from "./corporationBoostMenu";
export {
  createPressConferenceGameMarkup,
  wirePressConferenceGame,
} from "./pressConferenceGame";
export type { PressConferenceGame } from "./pressConferenceGame";
export { createMapMenuMarkup, wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireSpawnCritButton,
  wireSpawnMegaCritButton,
  wireSpawnUltraCritButton,
  wireFloorBuyCritButton,
  wireFloorBuyMegaCritButton,
  wireFloorBuyUltraCritButton,
  wirePressConferenceTestButton,
  wireShoppingSpreeButton,
  wireIdleOverlayTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
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
