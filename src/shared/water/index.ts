// blue water with white foam and sparkling sun glints (see ./foam): a flat
// stretch with a wavy surface (Rising Tide) and a rolling swell seen side-on
// (./wave, Tidal Wave)
import { COLOR } from "../../palette";
import { drawGlints, strokeFoam } from "./foam";

export * from "./wave";

type Point = { x: number; y: number };

// drawWater's frame: u runs along the surface from origin, v into the water
export interface WaterFrame {
  origin: Point;
  // unit vectors: along the surface, and from it into the water
  along: Point;
  inward: Point;
  // how far the surface runs along u
  length: number;
}

// the surface's waves (px tall)
export const WATER_WAVE = 22;
const STEPS = 48;
// the water deepens to its darkest this far below the surface
const DEEP_SPAN = 900;
const GLINTS = 30;
const GLINT_DEPTH = 50;

// levelAt(u) is the calm surface's v, with the water filling from it to v + depth
export function drawWater(
  ctx: CanvasRenderingContext2D,
  frame: WaterFrame,
  levelAt: (u: number) => number,
  depth: number,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const t = now / 1000;
  const { length } = frame;
  const surfaceAt = (u: number, phase = 0) =>
    levelAt(u) +
    Math.sin(u * 0.008 + t * 3 + phase) * WATER_WAVE +
    Math.sin(u * 0.019 - t * 2.2 + phase * 1.7) * WATER_WAVE * 0.5;
  const level = levelAt(length / 2);
  const bottom = level + depth + WATER_WAVE * 2;
  const surfacePath = (phase: number, lift: number) => {
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const u = (length * i) / STEPS;
      if (i === 0) ctx.moveTo(u, surfaceAt(u, phase) - lift);
      else ctx.lineTo(u, surfaceAt(u, phase) - lift);
    }
  };
  const water = (phase: number, lift: number, top: string, deep: string) => {
    const fill = ctx.createLinearGradient(
      0,
      level - WATER_WAVE,
      0,
      level + DEEP_SPAN,
    );
    fill.addColorStop(0, top);
    fill.addColorStop(1, deep);
    ctx.fillStyle = fill;
    surfacePath(phase, lift);
    ctx.lineTo(length, bottom);
    ctx.lineTo(0, bottom);
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  const { origin, along, inward } = frame;
  ctx.transform(along.x, along.y, inward.x, inward.y, origin.x, origin.y);
  ctx.globalAlpha = alpha;
  // a paler wave just behind, then the water itself, clear near the surface
  // and deeper blue further in
  water(
    2.4,
    WATER_WAVE * 0.8,
    `${COLOR.tideShallow}66`,
    `${COLOR.tideShallow}33`,
  );
  water(0, 0, `${COLOR.tideShallow}b0`, `${COLOR.tideDeep}c8`);
  strokeFoam(ctx, () => surfacePath(0, 0), alpha);
  drawGlints(ctx, GLINTS, alpha, now, (f, below) => {
    const u = f * length;
    return { x: u, y: surfaceAt(u) + below * GLINT_DEPTH - 6 };
  });
  ctx.restore();
}
