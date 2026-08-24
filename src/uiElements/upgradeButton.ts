import { drawCartoonText, drawCartoonPanel } from "../utils";
import { FLOOR_W, FLOOR_H } from "./floors";
import { formatTotalIncome } from "./totalIncome";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left)
export const BTN_W = 360;
export const BTN_H = 120;
const BTN_MARGIN = 24;
export const BTN_X = FLOOR_W - BTN_W - BTN_MARGIN;
export const BTN_Y = FLOOR_H - BTN_H - BTN_MARGIN;

function isPointOnButton(x: number, localY: number): boolean {
  return (
    x >= BTN_X &&
    x <= BTN_X + BTN_W &&
    localY >= BTN_Y &&
    localY <= BTN_Y + BTN_H
  );
}

export function getButtonCenter(offsetY: number): { x: number; y: number } {
  return { x: BTN_X + BTN_W / 2, y: offsetY + BTN_Y + BTN_H / 2 };
}

// which floor row (top-to-bottom) a canvas point falls on the upgrade button for, if any
export function hitTestUpgradeButton(
  x: number,
  y: number,
  floorCount: number,
): number | null {
  const row = Math.floor(y / FLOOR_H);
  if (row < 0 || row >= floorCount) return null;
  const localY = y - row * FLOOR_H;
  return isPointOnButton(x, localY) ? row : null;
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  offsetY: number,
  hovered: boolean,
  cost: number,
  affordable: boolean,
): void {
  const x = BTN_X;
  const y = BTN_Y + offsetY;

  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.5;
  else if (hovered) ctx.filter = "brightness(0.85)";
  drawCartoonPanel(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    16,
    affordable ? "#22C55E" : "#6B7280",
  );

  ctx.font = "900 48px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    `$${formatTotalIncome(cost)}`,
    x + BTN_W / 2,
    y + BTN_H / 2,
  );
  ctx.restore();
}
