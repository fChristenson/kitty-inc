import { drawCartoonText, drawGlossyButton, formatPrice } from "../../utils";
import { FLOOR_W, FLOOR_H, DIVIDER_H } from "../constants";
import { COLOR } from "../../palette";
import type { Floor } from "../../gameState";

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

// a satisfying "juicy" press animation, keyed per floor (each floor's button
// bounces independently): a quick squash inward followed by a springy overshoot
// past full size before settling, via a damped-oscillator curve rather than a
// linear tween — the single overshoot is what reads as bouncy/tactile instead of
// just "shrinks then grows back"
const pressedAt = new WeakMap<Floor, number>();
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18; // how deep the initial squash-in goes (1 - this)
const PRESS_DECAY = 9; // 1/sec; higher = the bounce dies out faster
const PRESS_FREQUENCY = 26; // rad/sec; higher = a snappier/quicker bounce

// call right when a purchase actually succeeds (see floorInteractions/index.ts) —
// every subsequent draw of this floor's button picks the animation up from here
export function triggerButtonPress(floor: Floor): void {
  pressedAt.set(floor, Date.now());
}

function pressScale(floor: Floor, now: number): number {
  const startedAt = pressedAt.get(floor);
  if (startedAt === undefined) return 1;
  const elapsedMs = now - startedAt;
  if (elapsedMs >= PRESS_DURATION_MS) return 1;
  const t = elapsedMs / 1000; // seconds, for the decay/frequency constants above
  return (
    1 -
    PRESS_AMPLITUDE * Math.exp(-PRESS_DECAY * t) * Math.cos(PRESS_FREQUENCY * t)
  );
}

export function drawUpgradeButton(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  hovered: boolean,
  cost: number,
  affordable: boolean,
  isGroundFloor: boolean,
): void {
  const x = BTN_X;
  const y = getBtnY(isGroundFloor);
  const cx = x + BTN_W / 2;
  const cy = y + BTN_H / 2;
  const scale = pressScale(floor, Date.now());

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
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
  drawCartoonText(ctx, formatPrice(cost), cx, cy);
  ctx.restore();
}
