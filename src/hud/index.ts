import {
  drawCartoonText,
  formatTotalIncomeParts,
  getAnimatedTotalIncome,
} from "../utils";
import { COLOR } from "../palette";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_MARGIN = 16;
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
const HUD_UNIT_NAME_FONT_SIZE = HUD_FONT_SIZE * 0.8; // spelled-out unit (e.g. "Undecillion"), 20% smaller than the amount
const HUD_UNIT_NAME_GAP_PX = 24; // below the amount's own measured bottom edge
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

// the amount's measured width, cached and only refreshed when its character count
// changes (not every frame) — centering on the live width every frame is what made
// the number jitter left/right while counting up, since that width is constantly
// changing; holding it steady between digit-count changes keeps the center anchor
// fixed for as long as the number's length actually stays the same
let cachedAmountWidth = 0;
let cachedAmountLength = -1;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: number,
): void {
  // see utils.ts's getAnimatedTotalIncome — same count-up animation cityMap's own
  // total-income readout uses, so the two always show the exact same number
  const displayedTotal = getAnimatedTotalIncome(totalIncome);

  const x = HUD_MARGIN;
  const w = canvasWidth - HUD_MARGIN * 2;
  const { amount, unitName } = formatTotalIncomeParts(displayedTotal);
  const strokeWidth = 22;

  ctx.font = `900 ${HUD_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
  // left-aligned at a position derived from the cached (not live) width above —
  // still visually centered, but the anchor itself only moves when the number's
  // length does, instead of re-centering (and jittering) on every frame's width
  if (amount.length !== cachedAmountLength) {
    cachedAmountWidth = ctx.measureText(amount).width;
    cachedAmountLength = amount.length;
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawCartoonText(
    ctx,
    amount,
    x + w / 2 - cachedAmountWidth / 2,
    HUD_TOP_MARGIN,
    COLOR.moneyGreen, // shared with the income bar/upgrade button/idle popup
    COLOR.white,
    strokeWidth,
  );

  if (unitName) {
    // measured (not a guessed constant) so the gap stays 8px regardless of how
    // wide/tall the amount above it happens to render
    const amountMetrics = ctx.measureText(amount);
    const amountBottom =
      HUD_TOP_MARGIN +
      amountMetrics.actualBoundingBoxAscent +
      amountMetrics.actualBoundingBoxDescent +
      strokeWidth / 2;
    const unitStrokeWidth = 10;
    ctx.font = `900 ${HUD_UNIT_NAME_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = "center";
    drawCartoonText(
      ctx,
      unitName,
      x + w / 2,
      amountBottom + HUD_UNIT_NAME_GAP_PX,
      COLOR.moneyGreen,
      COLOR.white,
      unitStrokeWidth,
    );
  }
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
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
export {
  createCompanySelectMenuMarkup,
  wireCompanySelectMenu,
} from "./companySelectMenu";
export type { CompanySelectMenu } from "./companySelectMenu";
