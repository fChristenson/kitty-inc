import { buildFloor } from "..";
import { FLOOR_W, FLOOR_H } from "../constants";
import type { Floor } from "../../gameState";
import { drawCartoonText, formatPrice } from "../../utils";

// invisible clickable region for the unlock cost, centered over the floor slab
const PANEL_W = 280;
const PANEL_H = 140;
const PANEL_X = FLOOR_W / 2 - PANEL_W / 2;
const PANEL_Y = FLOOR_H / 2 - PANEL_H / 2;

// dims a locked floor with a grey overlay and shows its unlock price on top; no-op once unlocked
export function drawFloorLock(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
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
  drawCartoonText(ctx, formatPrice(floor.unlockCost), FLOOR_W / 2, FLOOR_H / 2);
}

// whether a floor-local canvas point falls on a locked floor's unlock panel
export function hitTestFloorLock(x: number, y: number, floor: Floor): boolean {
  if (floor.unlocked) return false;
  return (
    x >= PANEL_X &&
    x <= PANEL_X + PANEL_W &&
    y >= PANEL_Y &&
    y <= PANEL_Y + PANEL_H
  );
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

// the real (non-test) way the building grows: there must always be exactly one
// locked floor waiting above the topmost unlocked floor, ready to be bought next.
// each floor is a real, fixed-size DOM canvas now, so adding one is just adding an
// element — no scroll-position math needed, native scroll anchoring keeps the view put
export function ensureLockedFloorAbove(deps: EnsureLockedFloorDeps): void {
  const top = deps.floors[deps.floors.length - 1];
  if (top && !top.unlocked) return; // a locked floor is already waiting

  const floor = buildFloor(deps.floors.length + 1, {
    backgroundCount: deps.backgroundCount,
    existingBgIndexes: deps.floors.map((f) => f.bgIndex),
    multiplier: deps.multiplier ?? 1,
  });
  deps.floors.push(floor);
  deps.onAdd(floor);
}
