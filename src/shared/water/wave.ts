// a swell of water seen side-on, travelling: a smooth rounded crest, its
// front steeper than its long back, thick at its foot and slimming to its
// top, with foam along its crest and front, spray flicked off the crest and
// sun glints on its back (Tidal Wave)
import { COLOR } from "../../palette";
import { drawGlimmer, hash01 } from "../twinkle";
import { drawGlints, strokeFoam } from "./foam";

type Point = { x: number; y: number };

// its shape, in px from its crest: x forward in the direction it travels, h up
export interface TidalWave {
  height: number;
  // how wide its front and back slopes spread
  front: number;
  back: number;
}

export function tidalWave(height: number): TidalWave {
  return { height, front: height * 0.35, back: height * 0.55 };
}

// a slope falling away from the crest: 1 at it, easing out to 0
const sech2 = (x: number) => 1 / Math.cosh(x) ** 2;

// the surface's height x ahead of the crest (behind it if negative)
function surfaceAt(wave: TidalWave, x: number): number {
  return wave.height * sech2(x / (x >= 0 ? wave.front : wave.back));
}

// where its slopes count as reaching the ground: this share of its height
const TOE = 0.02;

// how far ahead of the crest the front is at height h
export function waveFrontAt(wave: TidalWave, h: number): number {
  const share = Math.min(1, Math.max(TOE, h / wave.height));
  return wave.front * Math.acosh(1 / Math.sqrt(share));
}

// how far ahead of the crest its front reaches, and behind it its back
export function waveReach(wave: TidalWave): number {
  return waveFrontAt(wave, 0);
}
export function waveTail(wave: TidalWave): number {
  return wave.back * Math.acosh(1 / Math.sqrt(TOE));
}

const STEPS = 260;
const SPRAY = 14;
const GLINTS = 20;

// the wave travelling dir (1 right, -1 left), its crest at crestX over the
// ground at baseY
export function drawTidalWave(
  ctx: CanvasRenderingContext2D,
  wave: TidalWave,
  crestX: number,
  baseY: number,
  dir: 1 | -1,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const t = now / 1000;
  const toWorld = (x: number, h: number): Point => ({
    x: crestX + dir * x,
    y: baseY - h,
  });
  // the surface front to back, rippling a little more the higher it stands
  const reach = waveReach(wave);
  const tail = waveTail(wave);
  const surface = Array.from({ length: STEPS + 1 }, (_, i) => {
    const x = reach - ((reach + tail) * i) / STEPS;
    const h = surfaceAt(wave, x);
    const ripple =
      Math.sin(x * 0.01 - t * 4) * 10 * (h / wave.height) +
      Math.sin(x * 0.004 + t * 1.8) * 12;
    return toWorld(x, Math.max(0, h + ripple));
  });
  const below = 200;
  const outline = [toWorld(reach, -below), ...surface, toWorld(-tail, -below)];
  const trace = (points: Point[]) => {
    ctx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
  };
  // the front and crest, where the foam rides
  const crestIndex = Math.round((reach / (reach + tail)) * STEPS);
  const foamed = surface.slice(
    Math.round(crestIndex * 0.35),
    crestIndex + Math.round(STEPS * 0.06),
  );

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
  // the front catching the light, a pale band just inside it
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = COLOR.tideShallow;
  ctx.lineWidth = wave.height * 0.12;
  ctx.lineJoin = "round";
  trace(foamed);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  strokeFoam(ctx, () => trace(foamed), alpha);

  // spray flicked forward off the crest, each drop on its own loop
  const crest = surface[crestIndex];
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < SPRAY; i++) {
    const life = (t * (0.9 + hash01(i, 2) * 0.6) + hash01(i, 1)) % 1;
    const speed = wave.front * (0.3 + hash01(i, 3) * 0.4);
    const angle = 0.3 + hash01(i, 4) * 0.7;
    const x = crest.x + dir * Math.cos(angle) * speed * life;
    const y = crest.y - Math.sin(angle) * speed * life + 500 * life * life;
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
  const behind = surface.slice(crestIndex);
  drawGlints(ctx, GLINTS, alpha, now, (f, under) => {
    const p = behind[Math.floor(f * (behind.length - 1))];
    return { x: p.x, y: p.y + 10 + under * 40 };
  });
}
