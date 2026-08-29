import { drawCartoonText, formatTotalIncomeParts } from "../utils";
import { COLOR } from "../palette";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_MARGIN = 16;
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
const HUD_UNIT_NAME_FONT_SIZE = HUD_FONT_SIZE * 0.8; // spelled-out unit (e.g. "Undecillion"), 20% smaller than the amount
const HUD_UNIT_NAME_GAP_PX = 24; // below the amount's own measured bottom edge
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: number,
): void {
  const x = HUD_MARGIN;
  const w = canvasWidth - HUD_MARGIN * 2;
  const { amount, unitName } = formatTotalIncomeParts(totalIncome);
  const strokeWidth = 22;

  ctx.font = `900 ${HUD_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawCartoonText(
    ctx,
    amount,
    x + w / 2,
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
export { createMapMenuMarkup, wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export { createPopupMarkup, showIdlePopup } from "./popup";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireSpawnCritButton,
  wireIdlePopupTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
