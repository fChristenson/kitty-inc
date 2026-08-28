import { drawCartoonText, drawPill, formatPrice } from "../../utils";
import { FLOOR_W, FLOOR_H, DIVIDER_H, SIDE_WALL_WIDTH } from "../constants";
import { COLOR } from "../../palette";
import type { Floor } from "../../gameState";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left).
// Width cut 25% from the previous 440 (was matching the income panel 1:1); BTN_X sets its
// right edge flush against the side wall (FLOOR_W - SIDE_WALL_WIDTH), same alignment rule
// as the income bar's left edge. BTN_H exactly fills DIVIDER_H, spanning it edge-to-edge
export const BTN_W = 330;
export const BTN_H = 140;
export const BTN_X = FLOOR_W - SIDE_WALL_WIDTH - BTN_W;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px from dead
// center — except the bottom (ground) floor, which stays at dead center. BTN_H
// leaves just enough divider clearance for this nudge without clipping against
// the floor canvas edge
function getBtnY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - BTN_H / 2;
  return isGroundFloor ? base + 2 : base + 10;
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

// "Sale" boost: a purchasable, targeted alternative to boostMenu's boost-all (see
// hud/boostMenu/index.ts's applySaleBoost, which picks the random floor and calls
// triggerSaleBoost below). While active on a floor, its upgrade button wiggles like
// a crit and clicking it is free. A crit can still roll during a sale (see
// floorInteractions/index.ts); rather than stacking CRIT_UPGRADE_COUNT normal
// upgrades as usual, it just multiplies that click's sale payout by
// SALE_CRIT_MULTIPLIER
export const SALE_DURATION_MS = 15_000;
export const SALE_CRIT_MULTIPLIER = 5;
// each sale click pays out floorIncomePerSecond(floor) below (1 second of that
// floor's own income), credited straight to the player's total — hud/boostMenu's
// own cost is priced off this same rate times this many assumed clicks, halved, so
// a fully-clicked sale earns back at least double the cost
export const SALE_ASSUMED_CLICKS = 10;
const saleStartedAt = new WeakMap<Floor, number>();

export function triggerSaleBoost(floor: Floor): void {
  saleStartedAt.set(floor, Date.now());
}

export function isSaleActive(floor: Floor, now: number): boolean {
  const startedAt = saleStartedAt.get(floor);
  return startedAt !== undefined && now - startedAt < SALE_DURATION_MS;
}

// 1 second's worth of a floor's own current income rate — deliberately NOT added
// back into floor.incomeAmount itself (that would compound: a bigger rate next
// click, forever), just read fresh each click and credited straight to the
// player's total (see floorInteractions/index.ts and hud/boostMenu/index.ts)
export function floorIncomePerSecond(floor: Floor): number {
  return floor.incomeAmount / floor.incomeIntervalSeconds;
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
  const sale = isSaleActive(floor, now);

  ctx.save();
  ctx.translate(cx, cy);
  if (crit || sale) {
    ctx.rotate(
      Math.sin((now / WIGGLE_PERIOD_MS) * Math.PI * 2) * WIGGLE_MAX_RADIANS,
    );
  }
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (!crit && !sale) {
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
    crit
      ? COLOR.purple
      : sale
        ? COLOR.amber
        : affordable
          ? COLOR.moneyGreen
          : COLOR.disabledGray,
    true,
    true,
    40,
  );

  ctx.font = '900 52px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = sale
    ? crit
      ? `Sale x${SALE_CRIT_MULTIPLIER}`
      : "Sale"
    : crit
      ? "x2"
      : formatPrice(cost);
  drawCartoonText(ctx, label, cx, cy);
  ctx.restore();
}
