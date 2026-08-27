import { drawCartoonText, formatPrice } from "../utils";
import { COLOR } from "../palette";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_MARGIN = 16;
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: number,
): void {
  const x = HUD_MARGIN;
  const w = canvasWidth - HUD_MARGIN * 2;

  ctx.font = `900 ${HUD_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    formatPrice(totalIncome),
    x + w / 2,
    HUD_TOP_MARGIN + HUD_FONT_SIZE / 2,
    COLOR.moneyGreen, // shared with the income bar/upgrade button/idle popup
    COLOR.white,
    22,
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
export { createMapMenuMarkup, wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export { createPopupMarkup, showIdlePopup } from "./popup";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireIdlePopupTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
