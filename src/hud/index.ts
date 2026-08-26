import { drawCartoonText, formatPrice } from "../utils";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_MARGIN = 16;
export const HUD_H = 80;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: number,
): void {
  const x = HUD_MARGIN;
  const w = canvasWidth - HUD_MARGIN * 2;

  ctx.font = "900 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    formatPrice(totalIncome),
    x + w / 2,
    HUD_H / 2,
    "#34D399",
  );
}

// everything below is this module's own facade: hud/ has several nested widgets
// (actionBar, upgradeMenu, boostMenu, ...) that stay together for internal reuse, but
// anything outside src/hud must import them from here, never from a nested path
export { createActionBarMarkup, wireActionBar } from "./actionBar";
export type { ActionBarHandlers } from "./actionBar";
export { createBoostMenuMarkup, wireBoostMenu } from "./boostMenu";
export type { BoostMenu } from "./boostMenu";
export { createPopupMarkup, showIdlePopup } from "./popup";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
