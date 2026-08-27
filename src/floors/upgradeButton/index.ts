import { drawCartoonText, drawGlossyButton, formatPrice } from "../../utils";
import { FLOOR_W, FLOOR_H, DIVIDER_H } from "../constants";
import { COLOR } from "../../palette";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left)
export const BTN_W = 360;
export const BTN_H = 120;
const BTN_MARGIN = 24;
export const BTN_X = FLOOR_W - BTN_W - BTN_MARGIN - 20;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px — except the
// ground floor, which stays 10px higher (back at the plain centered position)
function getBtnY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - BTN_H / 2;
  return isGroundFloor ? base : base + 10;
}

function isPointOnButton(
  x: number,
  localY: number,
  isGroundFloor: boolean,
): boolean {
  const y = getBtnY(isGroundFloor);
  return x >= BTN_X && x <= BTN_X + BTN_W && localY >= y && localY <= y + BTN_H;
}

export function getButtonCenter(isGroundFloor: boolean): {
  x: number;
  y: number;
} {
  return { x: BTN_X + BTN_W / 2, y: getBtnY(isGroundFloor) + BTN_H / 2 };
}

// whether a floor-local canvas point falls on the upgrade button
export function hitTestUpgradeButton(
  x: number,
  y: number,
  isGroundFloor: boolean,
): boolean {
  return isPointOnButton(x, y, isGroundFloor);
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  hovered: boolean,
  cost: number,
  affordable: boolean,
  isGroundFloor: boolean,
): void {
  const x = BTN_X;
  const y = getBtnY(isGroundFloor);

  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.5;
  else if (hovered) ctx.filter = "brightness(0.85)";
  drawGlossyButton(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    16,
    affordable ? COLOR.moneyGreen : COLOR.disabledGray,
  );

  ctx.font = '900 48px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(ctx, formatPrice(cost), x + BTN_W / 2, y + BTN_H / 2);
  ctx.restore();
}
