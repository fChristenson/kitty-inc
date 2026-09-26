// a global "the game just stopped" illusion: while frozen, the game canvas keeps
// showing the one frame it captured the moment the freeze began, and only the
// freeze's own overlay keeps animating on top of it. Gameplay input on the
// canvas is ignored until unfreezeScreen
import type { Floor } from "../../gameState";

export type FloorRectResolver = (
  floor: Floor,
) => { left: number; top: number; width: number } | null;

// drawn every frame in the game canvas's world coordinates (the same space
// floors and coins draw in), on top of the captured frame
export type FreezeOverlay = (
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
) => void;

let overlay: FreezeOverlay | null = null;
let frozen = false;
let frozenAt = 0;
let unfrozenAt = -Infinity;

const DIM_ALPHA = 0.6;
const DIM_FADE_MS = 200;

export function freezeScreen(drawOverlay: FreezeOverlay): void {
  frozen = true;
  frozenAt = performance.now();
  overlay = drawOverlay;
}

export function unfreezeScreen(): void {
  frozen = false;
  overlay = null;
  unfrozenAt = Date.now();
}

export function isScreenFrozen(): boolean {
  return frozen;
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
): void {
  overlay?.(ctx, getFloorRect);
}
