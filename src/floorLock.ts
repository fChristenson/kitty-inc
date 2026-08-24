import { FLOOR_W, FLOOR_H, buildFloor, type Floor } from "./floors";
import { drawCartoonText } from "./utils";
import { formatTotalIncome } from "./totalIncome";
import type { FurnitureSprite } from "./sprites";

// invisible clickable region for the unlock cost, centered over the floor slab
const PANEL_W = 280;
const PANEL_H = 140;
const PANEL_X = FLOOR_W / 2 - PANEL_W / 2;
const PANEL_Y = FLOOR_H / 2 - PANEL_H / 2;

// dims a locked floor with a grey overlay and shows its unlock price on top; no-op once unlocked
export function drawFloorLock(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  offsetY: number,
): void {
  if (floor.unlocked) return;

  ctx.fillStyle = "rgba(30, 30, 30, 0.7)";
  ctx.fillRect(0, offsetY, FLOOR_W, FLOOR_H);

  ctx.font = "900 48px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    `$${formatTotalIncome(floor.unlockCost)}`,
    FLOOR_W / 2,
    offsetY + FLOOR_H / 2,
  );
}

// which floor row (top-to-bottom) a canvas point falls on a locked floor's unlock panel for, if any
export function hitTestFloorLock(
  x: number,
  y: number,
  floors: Floor[],
): number | null {
  const row = Math.floor(y / FLOOR_H);
  if (row < 0 || row >= floors.length) return null;
  const floor = floors[floors.length - 1 - row];
  if (floor.unlocked) return null;

  const localY = y - row * FLOOR_H;
  const onPanel =
    x >= PANEL_X &&
    x <= PANEL_X + PANEL_W &&
    localY >= PANEL_Y &&
    localY <= PANEL_Y + PANEL_H;
  return onPanel ? row : null;
}

export function unlockFloor(floor: Floor): void {
  floor.unlocked = true;
}

interface EnsureLockedFloorDeps {
  floors: Floor[];
  sprites: FurnitureSprite[];
  scrollEl: HTMLElement;
  onChange: () => void;
}

// the real (non-test) way the building grows: there must always be exactly one
// locked floor waiting above the topmost unlocked floor, ready to be bought next
export function ensureLockedFloorAbove(deps: EnsureLockedFloorDeps): void {
  const top = deps.floors[deps.floors.length - 1];
  if (top && !top.unlocked) return; // a locked floor is already waiting

  const scrollHeightBefore = deps.scrollEl.scrollHeight;
  deps.floors.push(buildFloor(deps.sprites, deps.floors.length + 1));
  deps.onChange();
  // new floors render above existing ones, so compensate scrollTop by the added
  // height to keep whatever the user was looking at (e.g. the ground floor) in place
  deps.scrollEl.scrollTop += deps.scrollEl.scrollHeight - scrollHeightBefore;
}
