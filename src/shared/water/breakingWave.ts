// a breaking wave seen side-on: a body of water thick at its foot and
// slimming toward its crest, whose lip curls out over its concave face and
// hangs, with foam along its face and lip, spray flung off the lip's tip and
// sun glints on its back (Tidal Wave)
import { COLOR } from "../../palette";
import { drawGlimmer, hash01 } from "../twinkle";
import { drawGlints, strokeFoam } from "./foam";

type Point = { x: number; y: number };

// its shape, in px from its foot (where its face meets the ground): x forward
// in the direction it travels, h up
export interface BreakingWave {
  height: number;
  // how far behind the foot the top of the face stands, under the lip
  face: number;
  // the lip's outer radius, and the barrel's under it
  curl: number;
  barrel: number;
  // how far behind the foot its back meets the water it leaves behind, and
  // that water's height and length
  base: number;
  trail: number;
  trailLength: number;
}

// a wave height tall, its crest curling over a quarter of that
export function breakingWave(height: number): BreakingWave {
  const curl = height * 0.22;
  return {
    height,
    face: curl * 0.9,
    curl,
    barrel: curl * 0.58,
    base: height * 1.1,
    trail: height * 0.12,
    trailLength: height * 3,
  };
}

// the lip's tip hangs this far round below the crest's center, swinging; the
// crest is stretched this much forward, and its back leaves it this far round
const LIP = Math.PI * 0.38;
const STRETCH = 1.3;
const CREST_BACK = Math.PI * 0.85;

// the wave's crest is centered here, local to its foot
function curlCenter(wave: BreakingWave): Point {
  return { x: -wave.face + wave.barrel * STRETCH, y: wave.height - wave.curl };
}

// the concave face at height h (up to under the lip): flat at the foot,
// rising ever steeper to stand upright under the crest
function faceAt(wave: BreakingWave, h: number): number {
  const top = curlCenter(wave).y;
  const s = (Math.min(top, Math.max(0, h)) - top) / top;
  return -wave.face * Math.sqrt(1 - s * s);
}

// how far ahead of its foot the wave's front is at height h: its face, or
// the lip hanging out over it
export function waveFrontAt(wave: BreakingWave, h: number): number {
  const center = curlCenter(wave);
  const dy = h - center.y;
  const onLip =
    dy >= -wave.curl * Math.sin(LIP) && Math.abs(dy) <= wave.curl
      ? center.x + STRETCH * Math.sqrt(wave.curl * wave.curl - dy * dy)
      : -Infinity;
  return Math.max(h <= center.y ? faceAt(wave, h) : -Infinity, onLip);
}

// how far ahead of its foot its lip reaches
export function waveReach(wave: BreakingWave): number {
  return curlCenter(wave).x + wave.curl * STRETCH;
}

const FACE_STEPS = 24;
const ARC_STEPS = 28;
const BACK_STEPS = 20;
const SPRAY = 12;
const GLINTS = 18;

// the wave travelling dir (1 right, -1 left) with its foot at (footX, baseY)
export function drawBreakingWave(
  ctx: CanvasRenderingContext2D,
  wave: BreakingWave,
  footX: number,
  baseY: number,
  dir: 1 | -1,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const t = now / 1000;
  const toWorld = (x: number, h: number): Point => ({
    x: footX + dir * x,
    y: baseY - h,
  });
  const center = curlCenter(wave);
  // the lip's tip swings gently in and out as it curls over
  const lip = LIP + Math.PI * 0.05 * Math.sin(t * 2.6);
  const arc = (
    radius: (k: number) => number,
    from: number,
    to: number,
  ): Point[] =>
    Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
      const k = i / ARC_STEPS;
      const a = from + (to - from) * k;
      return toWorld(
        center.x + Math.cos(a) * radius(k) * STRETCH,
        center.y + Math.sin(a) * radius(k),
      );
    });

  // the concave face, rippling, up from the foot to under the lip (spaced
  // evenly round its curve, so its flat toe isn't jagged)
  const face = Array.from({ length: FACE_STEPS + 1 }, (_, i) => {
    const a = (Math.PI / 2) * (i / FACE_STEPS);
    const h = center.y * (1 - Math.cos(a));
    const ripple =
      Math.sin(h * 0.012 + t * 4) * 8 * Math.sin(Math.PI * (i / FACE_STEPS));
    return toWorld(-wave.face * Math.sin(a) + ripple, h);
  });
  // the barrel's roof, round under the lip to its tip (the lip thinning as it
  // goes), then the lip's top back over to the wave's back
  const inner = arc(
    (k) => wave.barrel + (wave.curl * 0.82 - wave.barrel) * k ** 1.5,
    Math.PI,
    -lip,
  );
  const tipAngle = -lip - 0.08;
  const tip = toWorld(
    center.x + Math.cos(tipAngle) * wave.curl * 0.92 * STRETCH,
    center.y + Math.sin(tipAngle) * wave.curl * 0.92,
  );
  const outer = arc(() => wave.curl, -lip + 0.06, CREST_BACK);
  // the back, leaving the crest and flaring out into the thick foot
  const crestBack = {
    x: center.x + Math.cos(CREST_BACK) * wave.curl * STRETCH,
    h: center.y + Math.sin(CREST_BACK) * wave.curl,
  };
  const back = Array.from({ length: BACK_STEPS + 1 }, (_, i) => {
    const s = i / BACK_STEPS;
    return toWorld(
      crestBack.x + (-wave.base - crestBack.x) * s ** 1.4,
      crestBack.h + (wave.trail - crestBack.h) * s,
    );
  });
  // the water it leaves behind, gently swelling
  const trail = Array.from({ length: BACK_STEPS + 1 }, (_, i) => {
    const x = -wave.base - ((wave.trailLength - wave.base) * i) / BACK_STEPS;
    return toWorld(x, wave.trail + Math.sin(x * 0.006 + t * 2) * 14);
  });
  const below = 200;
  const outline = [
    toWorld(0, -below),
    ...face,
    ...inner,
    tip,
    ...outer,
    ...back,
    ...trail,
    toWorld(-wave.trailLength, -below),
  ];
  const trace = (points: Point[]) => {
    ctx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
  };

  ctx.save();
  ctx.globalAlpha = alpha;
  // clear and light up at the crest, deep blue down at its foot
  const fill = ctx.createLinearGradient(0, baseY - wave.height, 0, baseY);
  fill.addColorStop(0, `${COLOR.tideShallow}e6`);
  fill.addColorStop(1, `${COLOR.tideDeep}e6`);
  ctx.fillStyle = fill;
  trace(outline);
  ctx.closePath();
  ctx.fill();
  // the face catching the light, a pale band just inside it
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = COLOR.tideShallow;
  ctx.lineWidth = wave.curl * 0.6;
  ctx.lineJoin = "round";
  trace([...face, ...inner]);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // foam along the face, round the barrel to the lip's tip, and over the crest
  strokeFoam(ctx, () => trace([...face, ...inner, tip]), alpha);
  strokeFoam(
    ctx,
    () => trace(outer.slice(Math.floor(ARC_STEPS * 0.25))),
    alpha,
  );

  // spray flung forward and down off the lip's tip, each drop on its own loop
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < SPRAY; i++) {
    const life = (t * (0.9 + hash01(i, 2) * 0.6) + hash01(i, 1)) % 1;
    const speed = wave.curl * (0.6 + hash01(i, 3) * 0.8);
    const angle = -0.4 - hash01(i, 4) * 0.9;
    const x = tip.x + dir * Math.cos(angle) * speed * life;
    const y = tip.y - Math.sin(angle) * speed * life + 400 * life * life;
    drawGlimmer(
      ctx,
      x,
      y,
      (10 + 10 * hash01(i, 5)) * (1 - life),
      now / 300 + i,
      COLOR.white,
    );
  }
  ctx.restore();

  // sun glints on its back and the water behind it
  const surface = [...outer.slice(ARC_STEPS / 2), ...back, ...trail];
  drawGlints(ctx, GLINTS, alpha, now, (f, under) => {
    const p = surface[Math.floor(f * (surface.length - 1))];
    return { x: p.x - dir * under * 30, y: p.y + under * 40 };
  });
}
