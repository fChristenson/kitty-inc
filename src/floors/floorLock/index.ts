import { buildFloor } from "..";
import { getUniformCritTier } from "../../crits";
import { FLOOR_W, FLOOR_H } from "../constants";
import type { Floor } from "../../gameState";
import { type BigNumber, ZERO, add } from "../../shared/bigNumber";
import { drawCartoonText, formatPrice } from "../../utils";
import { COLOR } from "../../palette";
import { getWiggleRotation } from "../../shared/wiggle";
import {
  drawSlamTarget,
  drawSlamText,
  getSlamPose,
  SLAM_MS,
  triggerEventEndSlam,
} from "../../shared/eventEndSlam";

const PRICE_FONT_SIZE = 96;
const PRICE_FONT = `900 ${PRICE_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
const OVERLAY_COLOR = "rgba(30, 30, 30, 0.45)";
// a just-unlocked floor keeps its overlay while the price slams, then drops it
const UNLOCK_HOLD_AFTER_SLAM_MS = 100;
export const UNLOCK_OVERLAY_MS = SLAM_MS + UNLOCK_HOLD_AFTER_SLAM_MS;
const unlocking = new WeakMap<Floor, number>();

export function startFloorUnlockAnim(floor: Floor): void {
  unlocking.set(floor, Date.now());
  triggerEventEndSlam(floor, "lock");
}

function drawUnlockingOverlay(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  unlockCost: BigNumber,
): void {
  const startedAt = unlocking.get(floor);
  if (startedAt === undefined) return;
  const now = Date.now();
  if (now - startedAt >= UNLOCK_OVERLAY_MS) {
    unlocking.delete(floor);
    return;
  }
  ctx.save();
  ctx.fillStyle = OVERLAY_COLOR;
  ctx.fillRect(0, 0, FLOOR_W, FLOOR_H);
  const slam = getSlamPose(floor, "lock", now);
  const text = formatPrice(unlockCost);
  const { x: cx, y: cy } = getLockCenter();
  ctx.font = PRICE_FONT;
  const width = ctx.measureText(text).width;
  const top = cy - PRICE_FONT_SIZE / 2;
  const box = { x: cx - width / 2, y: top, width, height: PRICE_FONT_SIZE };
  drawSlamTarget(
    ctx,
    slam,
    box,
    "text",
    () => {
      ctx.save();
      ctx.font = PRICE_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      drawSlamText(ctx, slam, text, cx, top, PRICE_FONT_SIZE, COLOR.white);
      ctx.restore();
    },
    now,
  );
  ctx.restore();
}

// dims a locked floor with a grey overlay and shows its unlock price on top; no-op once unlocked
export function drawFloorLock(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  unlockCost: BigNumber,
  affordable: boolean,
): void {
  if (floor.unlocked) {
    drawUnlockingOverlay(ctx, floor, unlockCost);
    return;
  }

  // 0.7 flattened the room's ceiling/wall/window tones into a near-uniform dark
  // band (all within ~60-90 RGB), reading as if the room were shorter than it is
  // since the ceiling became indistinguishable from everything below it. A lighter
  // dim keeps enough contrast between them so the full room stays legible.
  ctx.fillStyle = OVERLAY_COLOR;
  ctx.fillRect(0, 0, FLOOR_W, FLOOR_H);
  if (floor === hiddenPriceFloor) return;
  // same idle wiggle every crit/sale button uses — draws attention to the price
  // only once the player can actually afford to unlock it; stays still otherwise
  drawFloorLockPrice(
    ctx,
    unlockCost,
    affordable ? getWiggleRotation(Date.now()) : 0,
    0,
  );
}

// an event overlay draws this floor's price itself (drawFloorLockPrice)
let hiddenPriceFloor: Floor | null = null;
export function setFloorLockPriceHidden(floor: Floor | null): void {
  hiddenPriceFloor = floor;
}

// the unlock price, rotated around its center and washed toward white
export function drawFloorLockPrice(
  ctx: CanvasRenderingContext2D,
  unlockCost: BigNumber,
  rotation: number,
  whiteAlpha: number,
): void {
  ctx.font = PRICE_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const { x: cx, y: cy } = getLockCenter();
  const text = formatPrice(unlockCost);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);
  drawCartoonText(ctx, text, cx, cy);
  if (whiteAlpha > 0) {
    ctx.globalAlpha = whiteAlpha;
    drawCartoonText(ctx, text, cx, cy, COLOR.white, COLOR.white);
  }
  ctx.restore();
}

// whether a floor-local canvas point falls on a locked floor's clickable area —
// the whole dark overlay (drawFloorLock's fillRect covers the entire floor),
// not just the small price-text panel, so clicking anywhere on the dimmed
// floor buys it, same as clicking the price text itself
export function hitTestFloorLock(x: number, y: number, floor: Floor): boolean {
  if (floor.unlocked) return false;
  return x >= 0 && x <= FLOOR_W && y >= 0 && y <= FLOOR_H;
}

// center of the unlock panel, floor-local — where a just-unlocked floor's coin
// burst should originate from
export function getLockCenter(): { x: number; y: number } {
  return { x: FLOOR_W / 2, y: FLOOR_H / 2 };
}

export function unlockFloor(floor: Floor): void {
  floor.unlocked = true;
  // starts idle-income tracking fresh from the moment it's actually earning, instead of
  // inheriting its creation time (when it was still locked and not accruing anything)
  floor.lastCollectedAt = Date.now();
}

interface EnsureLockedFloorDeps {
  floors: Floor[];
  backgroundCount: number;
  multiplier?: BigNumber; // this building's economy scale (buildings/index.ts); defaults to 1
  onAdd: (floor: Floor) => void;
  startingUpgradeCost?: import("../../shared/bigNumber").BigNumber;
}

// hard ceiling on how tall any one building can grow — shown as an "X/20"
// indicator under each building's own map marker (see cityMap/markers.ts)
export const MAX_FLOORS_PER_BUILDING = 20;

// the real (non-test) way the building grows: there must always be exactly one
// locked floor waiting above the topmost unlocked floor, ready to be bought next.
// each floor is a real, fixed-size DOM canvas now, so adding one is just adding an
// element — no scroll-position math needed, native scroll anchoring keeps the view put
export function ensureLockedFloorAbove(deps: EnsureLockedFloorDeps): void {
  const top = deps.floors[deps.floors.length - 1];
  if (top && !top.unlocked) return; // a locked floor is already waiting
  if (deps.floors.length >= MAX_FLOORS_PER_BUILDING) return; // building's already at its cap

  const floor = buildFloor(deps.floors.length + 1, {
    backgroundCount: deps.backgroundCount,
    existingBgIndexes: deps.floors.map((f) => f.bgIndex),
    multiplier: deps.multiplier,
    floorUnlockBaseCost: deps.floors[0]?.buildingFloorUnlockBaseCost,
    // a building-wide crit (see cityMap/index.ts) sets every floor to the same
    // tier — a freshly created floor should start as that same tier too, not
    // reset back to null, so "the default floor is the crit version" holds for
    // every floor the building ever grows, not just the ones that existed yet
    defaultCritTier: getUniformCritTier(deps.floors),
    // same idea for a seasonal-sale discount (see shared/critTypes'
    // SEASONAL_SALE_DISCOUNT_MULTIPLIER) — every floor in a building is kept
    // in sync on this value (applySeasonalSaleCrit applies it to all of them
    // at once), so the ground floor's own copy is always this building's
    // current accumulated discount, and a freshly queued floor should start
    // already discounted by that same amount instead of resetting to 1
    priceDiscountMultiplier: deps.floors[0]?.priceDiscountMultiplier ?? 1,
    startingUpgradeCost: deps.startingUpgradeCost,
  });
  deps.floors.push(floor);
  deps.onAdd(floor);
}

// $ to unlock every remaining locked floor in this building, all the way up to
// MAX_FLOORS_PER_BUILDING — ZERO once there's nothing left waiting (already
// maxed out, or a still-empty floors array). The one floor actually sitting
// there already carries its own real unlockCost; anything further hasn't been
// created yet, so buildFloor (the single source of truth for that formula) is
// simulated one level at a time just to read its unlockCost, discarding
// everything else about the result
export function getBuildingUnlockAllCost(
  floors: Floor[],
  multiplier: BigNumber,
): BigNumber {
  const top = floors[floors.length - 1];
  if (!top || top.unlocked) return ZERO;
  const priceDiscountMultiplier = floors[0]?.priceDiscountMultiplier ?? 1;
  let total = top.unlockCost;
  for (
    let level = floors.length + 1;
    level <= MAX_FLOORS_PER_BUILDING;
    level++
  ) {
    total = add(
      total,
      buildFloor(level, {
        backgroundCount: 1,
        multiplier,
        floorUnlockBaseCost: floors[0]?.buildingFloorUnlockBaseCost,
        priceDiscountMultiplier,
      }).unlockCost,
    );
  }
  return total;
}

// unlocks every remaining floor in one go, all the way up to
// MAX_FLOORS_PER_BUILDING — same one-at-a-time unlock+ensure-next-floor cycle
// a normal manual unlock (floorInteractions.ts's handleFloorClick) goes
// through, just looped straight through instead of pausing for a click each
// time. Caller (main.ts) is expected to have already deducted
// getBuildingUnlockAllCost's own $ cost before calling this
export function unlockAllFloors(deps: EnsureLockedFloorDeps): void {
  for (;;) {
    const top = deps.floors[deps.floors.length - 1];
    if (top && !top.unlocked) unlockFloor(top);
    if (deps.floors.length >= MAX_FLOORS_PER_BUILDING) break;
    const before = deps.floors.length;
    ensureLockedFloorAbove(deps);
    if (deps.floors.length === before) break; // safety net against an unexpected no-op
  }
}
