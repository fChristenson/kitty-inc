import { drawCartoonText, drawPill, formatPrice } from "../../utils";
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

// "crit" upgrade: a rare, free, oversized upgrade — the slot-machine jackpot moment.
// Rolled once per completed upgrade click (see floorInteractions/index.ts's
// rollCritUpgrade calls); while active, this floor's button turns purple, wiggles,
// and shows "x2" instead of its price. Clicking it costs nothing and instantly
// applies CRIT_UPGRADE_COUNT normal upgrades at once.
const CRIT_CHANCE = 0.05;
export const CRIT_UPGRADE_COUNT = 5;
const critFloors = new WeakSet<Floor>();

// call once per completed upgrade click (crit or normal) to roll the next one
export function rollCritUpgrade(floor: Floor): void {
  if (Math.random() < CRIT_CHANCE) critFloors.add(floor);
}

export function isCritUpgrade(floor: Floor): boolean {
  return critFloors.has(floor);
}

// call right when a crit click is handled, before rolling the next one
export function consumeCritUpgrade(floor: Floor): void {
  critFloors.delete(floor);
}

// dev/test-only: force this floor's button into the crit state right away,
// bypassing CRIT_CHANCE entirely (see hud/testButton's "Spawn Crit" button)
export function forceCritUpgrade(floor: Floor): void {
  critFloors.add(floor);
}

const WIGGLE_PERIOD_MS = 260;
const WIGGLE_MAX_RADIANS = 0.08;

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
  const now = Date.now();
  const scale = pressScale(floor, now);
  const crit = isCritUpgrade(floor);

  ctx.save();
  ctx.translate(cx, cy);
  if (crit) {
    ctx.rotate(
      Math.sin((now / WIGGLE_PERIOD_MS) * Math.PI * 2) * WIGGLE_MAX_RADIANS,
    );
  }
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (!crit) {
    if (!affordable) ctx.globalAlpha = 0.5;
    else if (hovered) ctx.filter = "brightness(0.85)";
  } else if (hovered) {
    ctx.filter = "brightness(0.85)";
  }
  // rounded RECTANGLE, not a full pill — ref.png's button corners are only modestly
  // rounded, unlike the fully-stadium-shaped income bar. Must clear the combined
  // black+white+dark ring inset (~21% of BTN_H) with room to spare, or the
  // innermost green fill's own radius gets clamped to 0 and its corners go square
  // even though the outer rings are still visibly rounded
  drawPill(
    ctx,
    x,
    y,
    BTN_W,
    BTN_H,
    crit ? COLOR.purple : affordable ? COLOR.moneyGreen : COLOR.disabledGray,
    true,
    true,
    40,
  );

  ctx.font = '900 48px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(ctx, crit ? "x2" : formatPrice(cost), cx, cy);
  ctx.restore();
}
