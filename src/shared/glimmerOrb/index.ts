// the swirling glimmer orb: a gold glow with lights circling a white-hot core
import { COLOR } from "../../palette";
import { drawGoldShimmer } from "../goldShimmer";
import { drawGlimmer, drawGlimmerAura } from "../twinkle";

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
