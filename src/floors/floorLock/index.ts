import { buildFloor } from "..";
import { FLOOR_W, FLOOR_H } from "../constants";
import type { Floor } from "../../gameState";
import type { BigNumber } from "../../shared/bigNumber";
import { drawCartoonText, formatPrice } from "../../utils";
import { getWiggleRotation } from "../../shared/wiggle";

// dims a locked floor with a grey overlay and shows its unlock price on top; no-op once unlocked
export function drawFloorLock(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  unlockCost: BigNumber,
  affordable: boolean,
): void {
  if (floor.unlocked) return;

  // 0.7 flattened the room's ceiling/wall/window tones into a near-uniform dark
  // band (all within ~60-90 RGB), reading as if the room were shorter than it is
  // since the ceiling became indistinguishable from everything below it. A lighter
  // dim keeps enough contrast between them so the full room stays legible.
  ctx.fillStyle = "rgba(30, 30, 30, 0.45)";
  ctx.fillRect(0, 0, FLOOR_W, FLOOR_H);

  ctx.font = '900 96px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // same idle wiggle every crit/sale button uses — draws attention to the price
  // only once the player can actually afford to unlock it; stays still otherwise
  const cx = FLOOR_W / 2;
  const cy = FLOOR_H / 2;
  const now = Date.now();
  ctx.save();
  ctx.translate(cx, cy);
  if (affordable) ctx.rotate(getWiggleRotation(now));
  ctx.translate(-cx, -cy);
  drawCartoonText(ctx, formatPrice(unlockCost), cx, cy);
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
  multiplier?: number; // this building's economy scale (buildings/index.ts); defaults to 1
  onAdd: (floor: Floor) => void;
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
    multiplier: deps.multiplier ?? 1,
  });
  deps.floors.push(floor);
  deps.onAdd(floor);
}
