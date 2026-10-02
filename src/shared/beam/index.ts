// beams of light for events: a blazing gold beam with a white-hot core
// between any two points, a thin flickering aim laser, and a flare where a
// beam lands, spraying sparks. All stamped from sprites built once, never
// per-frame gradients
import { COLOR } from "../../palette";
import { drawGlow, fadeStops } from "../glowSprite";
import { hash01, stampGlimmer } from "../twinkle";
import type { Point } from "../wisp";

// the beam's cross-section: transparent gold edge, gold glow, white core
const SECTION = 64;
let section: HTMLCanvasElement | null = null;
function beamSection(): HTMLCanvasElement {
  if (section) return section;
  section = document.createElement("canvas");
  section.width = 2;
  section.height = SECTION;
  const c = section.getContext("2d")!;
  const fade = c.createLinearGradient(0, 0, 0, SECTION);
  fade.addColorStop(0, "rgba(255,215,0,0)");
  fade.addColorStop(0.25, "rgba(255,215,0,0.35)");
  fade.addColorStop(0.42, "rgba(255,236,150,0.9)");
  fade.addColorStop(0.5, "rgba(255,255,255,1)");
  fade.addColorStop(0.58, "rgba(255,236,150,0.9)");
  fade.addColorStop(0.75, "rgba(255,215,0,0.35)");
  fade.addColorStop(1, "rgba(255,215,0,0)");
  c.fillStyle = fade;
  c.fillRect(0, 0, 2, SECTION);
  return section;
}

const FLARE = fadeStops(COLOR.white, 0.2);
const FLARE_GLOW = fadeStops(COLOR.heavenlyGold);
// the impact's sparks: SPARKS_PER_PX of the flare's radius (within SPARKS),
// each flung SPARK_REACH times the radius out over SPARK_MS, sagging, then
// reborn in a new direction; CRACKLE glints flicker round the core
const SPARKS: [number, number] = [14, 44];
const SPARKS_PER_PX = 0.8;
const SPARK_MS = 300;
const SPARK_REACH: [number, number] = [1.2, 3.6];
const SPARK_SAG = 1.4;
const SPARK_SIZE = 0.28;
const CRACKLE = 8;

// a beam `width` px across from `from` to `to`, at `alpha`; additive, so
// crossing beams burn brighter
export function drawBeam(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  alpha = 1,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1 || width <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.translate(from.x, from.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.drawImage(beamSection(), 0, -width / 2, length, width);
  ctx.restore();
}

// a thin aim laser that flickers, before a beam fires down it
export function drawAimLaser(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
): void {
  drawBeam(ctx, from, to, 6, 0.35 + 0.5 * Math.random());
}

// the hot flare where a beam lands, r px round, spraying sparks and
// crackling like a cutting laser
export function drawBeamFlare(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  alpha = 1,
  now = performance.now(),
): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  drawGlow(ctx, FLARE_GLOW, at.x, at.y, r * 2);
  drawGlow(ctx, FLARE, at.x, at.y, r);
  const count = Math.min(SPARKS[1], Math.max(SPARKS[0], Math.round(r * SPARKS_PER_PX)));
  for (let i = 0; i < count; i++) {
    const clock = now + hash01(i, 1) * SPARK_MS;
    const life = Math.floor(clock / SPARK_MS);
    const t = (clock % SPARK_MS) / SPARK_MS;
    const angle = hash01(i, life) * Math.PI * 2;
    const reach = r * (SPARK_REACH[0] + (SPARK_REACH[1] - SPARK_REACH[0]) * hash01(life, i));
    const out = reach * t * (2 - t);
    stampGlimmer(
      ctx,
      at.x + Math.cos(angle) * out,
      at.y + Math.sin(angle) * out + SPARK_SAG * r * t * t,
      r * SPARK_SIZE * (1 - t),
      angle,
      i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  for (let i = 0; i < CRACKLE; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r * 0.8;
    stampGlimmer(ctx, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, r * 0.35 * Math.random(), a, COLOR.white);
  }
  ctx.restore();
}
