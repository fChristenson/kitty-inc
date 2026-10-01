// the swirling glimmer orb: a gold glow with lights circling a white-hot core
import { COLOR } from "../../palette";
import { drawGoldShimmer } from "../goldShimmer";
import { drawGlimmer, drawGlimmerAura, hash01 } from "../twinkle";

const SWIRL_GLIMMERS = 4;

// size is its radius; white 0..1 heats the core; seed picks its aura's spots
export function drawGlimmerOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  white: number,
  now: number,
  seed = 0,
): void {
  if (size <= 0) return;
  drawGoldShimmer(ctx, x, y, size * 0.9, 1, 3, now);
  const spin = ((now / 1000) * 5) % (Math.PI * 2);
  for (let i = 0; i < SWIRL_GLIMMERS; i++) {
    const angle = spin + (i / SWIRL_GLIMMERS) * Math.PI * 2;
    const radius = size * (0.3 + 0.1 * Math.sin(spin * 2 + i));
    drawGlimmer(
      ctx,
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      size * 0.25,
      angle,
      COLOR.heavenlyGold,
    );
  }
  drawGlimmerAura(
    ctx,
    x,
    y + size * 0.6,
    size * 1.2,
    size * 1.2,
    size * 0.3,
    COLOR.heavenlyGold,
    seed,
    now,
  );
  drawGlimmer(ctx, x, y, size * (0.35 + 0.25 * white), -spin, COLOR.white);
}

type Point = { x: number; y: number };

// a will-o'-the-wisp: a flickering orb at at(ms) with a glimmer trail through
// where it just was; at returns null while it's off stage
export function drawWisp(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  trail: number,
  trailMs: number,
): void {
  for (let j = trail; j >= 1; j--) {
    const point = at(ms - j * trailMs);
    if (!point) continue;
    drawGlimmer(
      ctx,
      point.x,
      point.y,
      size * 0.7 * (1 - j / (trail + 1)),
      now / 160 + j,
      j % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  const head = at(ms);
  if (!head) return;
  const flicker = 1 + 0.08 * Math.sin(now / 70) * Math.sin(now / 113);
  drawGlimmerOrb(ctx, head.x, head.y, size * flicker, 0.3, now);
}

// a playful swoop from a to b, t 0..1: bowed out to one side by up to `bend`
// of its length (picked by seed) and wiggling `wiggles` times
export function swoop(
  a: Point,
  b: Point,
  t: number,
  seed: number,
  bend: number,
  wiggles: number,
  wiggleAmp: number,
): Point {
  const e = t * t * (3 - 2 * t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = (hash01(seed, 1) - 0.5) * 2 * bend;
  const wiggle =
    Math.sin(t * wiggles * Math.PI * 2) * wiggleAmp * Math.sin(Math.PI * t);
  const side = bow * length * 4 * e * (1 - e) + wiggle;
  return {
    x: a.x + dx * e - (dy / length) * side,
    y: a.y + dy * e + (dx / length) * side,
  };
}
