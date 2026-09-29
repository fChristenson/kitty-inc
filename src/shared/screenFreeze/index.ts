// a global "the game just stopped" illusion: while frozen, the game canvas keeps
// showing the one frame it captured the moment the freeze began, and only the
// freeze's own overlay keeps animating on top of it. Gameplay input on the
// canvas is ignored until unfreezeScreen
import type { Floor } from "../../gameState";

export type FloorRectResolver = (
  floor: Floor,
) => { left: number; top: number; width: number } | null;

// drawn every frame in the game canvas's world coordinates (the same space
// floors and coins draw in), on top of the captured frame. totalTarget is the
// total-income readout's center in that space
export type FreezeOverlay = (
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
) => void;

let overlay: FreezeOverlay | null = null;
let frozen = false;
let totalSpotlit = false;
let frozenAt = 0;
let unfrozenAt = -Infinity;

const DIM_ALPHA = 0.6;
const DIM_FADE_MS = 200;

// spotlightTotal keeps the total-income readout live and undimmed on top
export function freezeScreen(
  drawOverlay: FreezeOverlay,
  { spotlightTotal = false }: { spotlightTotal?: boolean } = {},
): void {
  frozen = true;
  frozenAt = performance.now();
  overlay = drawOverlay;
  totalSpotlit = spotlightTotal;
}

export function unfreezeScreen(): void {
  frozen = false;
  overlay = null;
  totalSpotlit = false;
  unfrozenAt = Date.now();
}

export function isScreenFrozen(): boolean {
  return frozen;
}

export function isTotalSpotlit(): boolean {
  return frozen && totalSpotlit;
}

// Date.now() of the last unfreeze — per-frame movers use it so time spent
// frozen isn't replayed as one big jump once the frame goes live again
export function getScreenUnfrozenAt(): number {
  return unfrozenAt;
}

// how dark to wash the frozen frame (fading in) so the overlay stands out
export function getScreenFreezeDim(): number {
  if (!frozen) return 0;
  return DIM_ALPHA * Math.min(1, (performance.now() - frozenAt) / DIM_FADE_MS);
}

export function drawScreenFreezeOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  overlay?.(ctx, getFloorRect, totalTarget);
}
