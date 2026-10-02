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

// how the frozen frame is moved: slid sideways by `pan` of the screen's width,
// scaled round its center (at least 1, so it always covers the screen) and
// blurred by `blur` CSS px
export interface FrameMotion {
  pan: number;
  scaleX: number;
  scaleY: number;
  blur: number;
}
const STILL: FrameMotion = { pan: 0, scaleX: 1, scaleY: 1, blur: 0 };

// water rippling across the frozen frame round `center` (world space, like
// the overlay): within `bands` (radii), it shows offset(r) px refracted outward
export interface FrameRipple {
  center: { x: number; y: number };
  bands: [number, number][];
  offset: (r: number) => number;
}
export type FrameRippler = (
  getFloorRect: FloorRectResolver,
) => FrameRipple | null;

let overlay: FreezeOverlay | null = null;
let motion: (() => FrameMotion) | null = null;
let ripple: FrameRippler | null = null;
let frozen = false;
let totalSpotlit = false;
let frozenAt = 0;
let unfrozenAt = -Infinity;

const DIM_ALPHA = 0.6;
const DIM_FADE_MS = 200;

// spotlightTotal keeps the total-income readout live and undimmed on top;
// frameMotion moves the frozen frame itself, frameRipple ripples it
export function freezeScreen(
  drawOverlay: FreezeOverlay,
  {
    spotlightTotal = false,
    frameMotion,
    frameRipple,
  }: {
    spotlightTotal?: boolean;
    frameMotion?: () => FrameMotion;
    frameRipple?: FrameRippler;
  } = {},
): void {
  frozen = true;
  frozenAt = performance.now();
  dimKey = null;
  overlay = drawOverlay;
  totalSpotlit = spotlightTotal;
  motion = frameMotion ?? null;
  ripple = frameRipple ?? null;
}

export function unfreezeScreen(): void {
  frozen = false;
  overlay = null;
  motion = null;
  ripple = null;
  totalSpotlit = false;
  unfrozenAt = Date.now();
}

export function isScreenFrozen(): boolean {
  return frozen;
}

export function isTotalSpotlit(): boolean {
  return frozen && totalSpotlit;
}

export function getScreenFreezeMotion(): FrameMotion {
  return frozen && motion ? motion() : STILL;
}

export function getScreenFreezeRipple(
  getFloorRect: FloorRectResolver,
): FrameRipple | null {
  return frozen && ripple ? ripple(getFloorRect) : null;
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

let dimLayer: HTMLCanvasElement | null = null;
// what the dim layer last held: its key, wash and the transform it was drawn in
let dimKey: readonly unknown[] | null = null;
let dimAlpha = 0;
let dimDrawnIn: DOMMatrix | null = null;

const sameKey = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

// whatever draw() lays down (in ctx's current transform), washed as dark as
// the frozen frame, all in one pass: a brightness filter per item stalls the
// frame badly while many items are still dim. Pass a key that changes
// whenever draw() would draw something different, and the dimmed layer is
// reused (shaken along with the frame) instead of redrawn every frame
export function drawFreezeDimmed(
  ctx: CanvasRenderingContext2D,
  draw: (layer: CanvasRenderingContext2D) => void,
  key?: readonly unknown[],
): void {
  // stepped while the wash fades in, so the layer is redrawn a few times, not every frame
  const raw = getScreenFreezeDim();
  const dim = raw >= DIM_ALPHA ? raw : Math.round(raw * 20) / 20;
  if (dim <= 0) {
    draw(ctx);
    return;
  }
  const { width, height } = ctx.canvas;
  dimLayer ??= document.createElement("canvas");
  const transform = ctx.getTransform();
  const reuse =
    key !== undefined &&
    dimKey !== null &&
    sameKey(key, dimKey) &&
    dim === dimAlpha &&
    dimDrawnIn !== null &&
    dimLayer.width === width &&
    dimLayer.height === height;
  if (!reuse) {
    if (dimLayer.width !== width || dimLayer.height !== height) {
      dimLayer.width = width;
      dimLayer.height = height;
    }
    const layer = dimLayer.getContext("2d")!;
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, width, height);
    layer.setTransform(transform);
    layer.save();
    draw(layer);
    layer.restore();
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalCompositeOperation = "source-atop";
    layer.globalAlpha = dim;
    layer.fillStyle = "#000";
    layer.fillRect(0, 0, width, height);
    layer.globalCompositeOperation = "source-over";
    layer.globalAlpha = 1;
    dimKey = key ?? null;
    dimAlpha = dim;
    dimDrawnIn = transform;
  }
  ctx.save();
  // laid down in the transform it was drawn in, moved by any change since
  if (reuse) ctx.setTransform(transform.multiply(dimDrawnIn!.inverse()));
  else ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(dimLayer, 0, 0);
  ctx.restore();
}

export function drawScreenFreezeOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  overlay?.(ctx, getFloorRect, totalTarget);
}
