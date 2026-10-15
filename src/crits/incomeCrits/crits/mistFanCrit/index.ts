// Mist Fan, an income crit: the green amount shrinks into a nozzle wisp that
// drops under the total and starts oscillating like a desk fan, blowing a
// wide sheet of gold mist up across the readout; every swing is quicker, the
// sheet denser and every one that sweeps the whole readout is a share, a
// shimmer of gold catching across it and a blast at the turn; then the
// swings blur into one solid blast of mist, the coat flashes white and the
// finale blows
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
} from "../../../../shared/animationStyles/spray";
import { easeOut } from "../../../../shared/easing";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the nozzle drops DOWN px under the total in IN_MS, then swings its aim
// AMP either side of straight up, each swing SWING_MS (quickening)
const IN_MS = 160;
const DOWN = 190;
const AMP = 1.08;
const SWING_MS = [270, 240, 210, 180, 150, 125, 100, 80];
const SWINGS = SWING_MS.length;
// then the blur: a swing every 35ms for BLUR_MS, into the flash
const BLUR_MS = 200;
const BLUR_RATE = Math.PI / 35;
const FLASH_MS = 240;
// the sheet: a wedge SHEET_W either side of the aim, SHEET_R px long
const SHEET_W = 0.3;
const SHEET_R = 380;
const BLUR_FAN = [-0.85, -0.45, 0, 0.45, 0.85];
// mist specks blown along the sheet, one every EMIT_MS (quickening)
const EMIT_MS: [number, number] = [16, 3.5];
const MAX_SPECKS = 400;
const SPECK_FLIGHT_MS = 280;
const SPECK_LIFT = 60;
// a swing's shimmer across the readout: DOTS sparks lighting in turn
const READOUT_HALF = 300;
const DOTS = 14;
const DOT_STEP_MS = 7;
const DOT_MS = 150;
const SHIMMER_MS = DOT_STEP_MS * DOTS + DOT_MS;
const BUMP_MS = 140;
const BUMP = 0.4;
const TURN_BLAST: [number, number] = [120, 210];
const NOZZLE = WISP_SIZE * 1.25;
const RECOIL = 18;
const TREMBLE = 22;
const DROPLET = 70;
const MIST = 150;
const COAT_W = 720;
const COAT_H = 140;
const COAT = 0.85;
// shakes by step: a swing's share, the finale
const SHAKES = [0.8, 2.8];

// when each swing starts (the last entry the blur's start)
const SWING_AT = new Float64Array(SWINGS + 1);
SWING_AT[0] = IN_MS;
for (let k = 0; k < SWINGS; k++) SWING_AT[k + 1] = SWING_AT[k] + SWING_MS[k];
const BLUR_AT = SWING_AT[SWINGS];
const END_MS = BLUR_AT + BLUR_MS;

// the aim's swing off straight up at ms: left to right, back, ...
function swingAt(ms: number): number {
  if (ms < IN_MS) return -AMP;
  if (ms >= BLUR_AT) return -AMP * Math.cos((ms - BLUR_AT) * BLUR_RATE);
  let k = 0;
  while (k < SWINGS - 1 && ms >= SWING_AT[k + 1]) k++;
  const c = Math.cos(Math.PI * ((ms - SWING_AT[k]) / SWING_MS[k]));
  return k % 2 ? AMP * c : -AMP * c;
}
const aimAt = (ms: number) => -Math.PI / 2 + swingAt(ms);

// the specks, laid out once: born, heading and how far each carries
const speckBorn = new Float32Array(MAX_SPECKS);
const speckAim = new Float32Array(MAX_SPECKS);
const speckReach = new Float32Array(MAX_SPECKS);
let specks = 0;
for (let t = IN_MS; t < END_MS && specks < MAX_SPECKS; specks++) {
  speckBorn[specks] = t;
  speckAim[specks] = aimAt(t) + (hash01(specks, 811) * 2 - 1) * SHEET_W * 1.1;
  speckReach[specks] = SHEET_R * (0.55 + 0.5 * hash01(specks, 812));
  t += lerp(EMIT_MS[0], EMIT_MS[1], (t - IN_MS) / (END_MS - IN_MS));
}

// the turn each swing ends on, at the readout's end
const turns: Point[] = [];
for (let k = 0; k < SWINGS; k++)
  turns.push({ x: (k % 2 ? -1 : 1) * READOUT_HALF, y: 0 });

interface Plan {
  // the flash's middle, from the total's
  start: Point;
  // the oldest speck still in flight
  first: number;
}
const plans = new WeakMap<Running, Plan>();
let current: Plan | null = null;
const ORIGIN: Point = { x: 0, y: 0 };
const nozzle: Point = { x: 0, y: 0 };

// the nozzle at ms, from the total's middle: dropping in, then kicking back
// against its swing and trembling as it blurs
function nozzleAt(ms: number): Point {
  const { start } = current!;
  if (ms < IN_MS) {
    const u = easeOut(clamp01(ms / IN_MS));
    nozzle.x = lerp(start.x, 0, u);
    nozzle.y = lerp(start.y, DOWN, u);
    return nozzle;
  }
  const blur = clamp01((ms - BLUR_AT) / BLUR_MS);
  const jitter = Math.floor(ms / 20);
  nozzle.x =
    -Math.sin(swingAt(ms)) * RECOIL +
    (holeHash(jitter, 813) - 0.5) * TREMBLE * blur;
  nozzle.y = DOWN + (holeHash(jitter, 814) - 0.5) * TREMBLE * blur;
  return nozzle;
}

const spray = planSpray(nozzleAt, aimAt, {
  startMs: IN_MS,
  endMs: END_MS,
  spread: 0.2,
  reach: 300,
  flightMs: 220,
});

// the sheet's wedge pointing straight up from the nozzle, and its fill
const wedge = new Path2D();
wedge.moveTo(0, 0);
wedge.arc(0, 0, SHEET_R, -Math.PI / 2 - SHEET_W, -Math.PI / 2 + SHEET_W);
wedge.closePath();
let sheetFill: CanvasGradient | null = null;

function drawSheet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  swing: number,
  widen: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  if (!sheetFill) {
    const gold = COLOR.heavenlyGold;
    sheetFill = ctx.createRadialGradient(0, 0, 0, 0, 0, SHEET_R);
    sheetFill.addColorStop(0, `${gold}00`);
    sheetFill.addColorStop(0.12, `${gold}66`);
    sheetFill.addColorStop(0.65, `${gold}44`);
    sheetFill.addColorStop(1, `${gold}00`);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.scale(widen, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = sheetFill;
  ctx.fill(wedge);
  ctx.restore();
}

registerFloorCrit("mistFanCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    for (let k = 1; k <= SWINGS; k++) hit(0, SWING_AT[k]);
    hit(0, END_MS, 1);
    plans.set(r, { start: { x: -to.x, y: -to.y }, first: 0 });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    current = plan;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    // a whoosh at every swing, the hiss quickening with them
    while (r.kicked < SWINGS && ms >= SWING_AT[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    const cover = clamp01((ms - IN_MS) / (END_MS - IN_MS));
    const blur = clamp01((ms - BLUR_AT) / BLUR_MS);
    // the coat, bumping brighter at every swing's share, whiting out at the end
    let done = 0;
    while (done < SWINGS && ms >= SWING_AT[done + 1]) done++;
    const since = done > 0 ? ms - SWING_AT[done] : BUMP_MS;
    const flash =
      ms >= END_MS
        ? 1 - (ms - END_MS) / FLASH_MS
        : BUMP * clamp01(1 - since / BUMP_MS) + blur * 0.3;
    if (ms >= IN_MS && ms < END_MS + FLASH_MS)
      drawSprayCoat(
        ctx,
        ORIGIN,
        COAT_W,
        COAT_H,
        ms < END_MS ? COAT * cover : flash,
        flash,
      );
    if (ms >= IN_MS && ms < END_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      const at = nozzleAt(ms);
      const nx = at.x;
      const ny = at.y;
      drawSheet(
        ctx,
        nx,
        ny,
        swingAt(ms),
        lerp(0.7, 1.4, cover),
        lerp(0.35, 0.85, cover) * (1 - 0.4 * blur),
      );
      // the blur: the fan smeared into one solid sheet over the whole readout
      for (let k = 0; k < BLUR_FAN.length; k++)
        drawSheet(ctx, nx, ny, BLUR_FAN[k] * AMP, 1.6, blur * 0.7);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      drawSprayMist(ctx, ORIGIN, ms - IN_MS, cover, MIST * (1 + blur), now);
    }
    beginLightBatch(ctx);
    // the sheet's specks
    while (plan.first < specks && speckBorn[plan.first] + SPECK_FLIGHT_MS <= ms)
      plan.first++;
    for (let n = plan.first; n < specks && speckBorn[n] <= ms; n++) {
      const t = (ms - speckBorn[n]) / SPECK_FLIGHT_MS;
      const a = speckAim[n];
      const d = speckReach[n] * easeOut(t);
      drawGlitterLight(
        ctx,
        Math.cos(a) * d,
        DOWN + Math.sin(a) * d - SPECK_LIFT * t,
        lerp(8, 18, t),
        n,
        (1 - t) * (0.6 + 0.4 * cover),
        now,
      );
    }
    drawSpray(ctx, spray, ms, now, DROPLET * (1 + cover));
    // each swing's shimmer racing across the readout the way it swept
    for (let k = 0; k < SWINGS; k++) {
      const s = ms - SWING_AT[k + 1];
      if (s < 0) break;
      if (s >= SHIMMER_MS) continue;
      const dir = k % 2 ? -1 : 1;
      for (let i = 0; i < DOTS; i++) {
        const t = (s - i * DOT_STEP_MS) / DOT_MS;
        if (t < 0) break;
        if (t >= 1) continue;
        drawGlitterLight(
          ctx,
          dir * (-READOUT_HALF + (2 * READOUT_HALF * i) / (DOTS - 1)),
          (holeHash(i, k + 815) - 0.5) * 50,
          28 * (1 - 0.5 * t),
          i + k * 31 + 900,
          1 - t,
          now,
        );
      }
    }
    endLightBatch(ctx);
    for (let k = 0; k < SWINGS; k++)
      drawDetonation(
        ctx,
        turns[k],
        ms - SWING_AT[k + 1],
        lerp(TURN_BLAST[0], TURN_BLAST[1], k / (SWINGS - 1)),
        now,
      );
    drawWispBetween(ctx, nozzleAt, ms, now, NOZZLE, cover, 0, END_MS);
    ctx.restore();
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
