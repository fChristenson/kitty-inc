// Rattle Can, an income crit: the green amount shrinks into a spray-can wisp
// that darts beside the total and gets shaken hard, rattling up and down with
// a click-clack and a jolt every shake, quicker, higher and hotter each time;
// then it sprays the readout in short sharp psst bursts, each a cone of gold
// mist that sticks where it lands (a share, a jolt, a shimmer), the can darting
// to a new angle between bursts as they close up; the last a long
// full-pressure blast that coats the whole readout until it flashes white
// and the finale blows
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import { easeOut, easeOutCubic } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the can darts in to HOME (from the total's middle) in IN_MS, then is
// shaken SHAKE_MS each (quickening), rattling AMP px up and back down
const IN_MS = 130;
const HOME: Point = { x: -400, y: 140 };
const SHAKE_MS = [110, 95, 80, 68, 57, 48, 40];
const SHAKES = SHAKE_MS.length;
const AMP: [number, number] = [30, 78];
const SWAY = 0.3;
const TREMBLE: [number, number] = [3, 14];
const RATTLE_JOLT: [number, number] = [0.2, 0.8];
const TICK_RATE: [number, number] = [0.9, 1.9];
const TICK_FLASH_MS = 70;
// then the bursts: the can darts GAP_MS onto its spot and sprays ON_MS
const GAP_MS = [80, 68, 58, 48, 40, 34];
const ON_MS = [95, 86, 78, 70, 62, 56];
const BURSTS = ON_MS.length;
// where each burst hits the readout, and the way the can sits off it (rad)
const HIT_X = [-200, 190, -40, 245, -250, 90];
const HIT_Y = [-12, 16, -22, 8, 20, -16];
const SIDE = [2.4, 0.7, 1.75, 0.45, 2.7, 1.3];
const DIST = 230;
const RECOIL = 26;
const RECOIL_MS = 45;
const LAND_MS = 55;
// then the long blast from under the readout's middle, straight up
const LONG_GAP_MS = 50;
const LONG_MS = 330;
const LONG_AT_Y = 240;
const LONG_TREMBLE: [number, number] = [6, 22];
const FLASH_MS = 240;
// the cone of mist: CONE_W either side of the aim, CONE_R long
const CONE_W = 0.24;
const CONE_R = 250;
const CONE_FADE_MS = 60;
const LONG_WIDEN = 3;
const CAN = WISP_SIZE * 1.3;
const DROPLET = 70;
const MIST = 110;
const LONG_MIST = 170;
const PATCH_W = 220;
const PATCH_H = 90;
const PATCH = 0.75;
const BUMP_MS = 120;
const COAT_W = 720;
const COAT_H = 140;
const COAT_BURSTS = 0.45;
// a burst's shimmer: SPARKS sparks flung out over the patch
const SPARKS = 10;
const SHIMMER_MS = 180;
const SHIMMER_R = 130;
// light pulled into the can as it's shaken
const PULL = 10;
const PULL_MS = 190;
const PULL_R = 170;
// shakes by step: a burst's share, the finale
const HIT_SHAKES = [0.9, 2.8];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

// the timeline, laid out once
const SHAKE_AT = new Float64Array(SHAKES + 1);
SHAKE_AT[0] = IN_MS;
for (let k = 0; k < SHAKES; k++) SHAKE_AT[k + 1] = SHAKE_AT[k] + SHAKE_MS[k];
const SHAKE_END = SHAKE_AT[SHAKES];
const DART_AT = new Float64Array(BURSTS);
const BURST_AT = new Float64Array(BURSTS);
const BURST_END = new Float64Array(BURSTS);
let clock = SHAKE_END;
for (let k = 0; k < BURSTS; k++) {
  DART_AT[k] = clock;
  clock += GAP_MS[k];
  BURST_AT[k] = clock;
  clock += ON_MS[k];
  BURST_END[k] = clock;
}
const LONG_DART = clock;
const LONG_AT = LONG_DART + LONG_GAP_MS;
const END_MS = LONG_AT + LONG_MS;

// each burst's spot on the readout, the can's spot off it and its aim
const hits: Point[] = [];
const spots: Point[] = [];
const aims = new Float32Array(BURSTS);
const sprays: Spray[] = [];
for (let k = 0; k < BURSTS; k++) {
  const hit = { x: HIT_X[k], y: HIT_Y[k] };
  const spot = {
    x: hit.x + Math.cos(SIDE[k]) * DIST,
    y: hit.y + Math.sin(SIDE[k]) * DIST,
  };
  aims[k] = Math.atan2(hit.y - spot.y, hit.x - spot.x);
  hits.push(hit);
  spots.push(spot);
  sprays.push(
    planSpray(spot, aims[k], {
      startMs: BURST_AT[k],
      endMs: BURST_END[k],
      spread: 0.2,
      reach: DIST * 1.05,
      flightMs: 150,
    }),
  );
}
const LONG_SPOT: Point = { x: 0, y: LONG_AT_Y };
const LONG_AIM = -Math.PI / 2;
const longSpray = planSpray(LONG_SPOT, LONG_AIM, {
  startMs: LONG_AT,
  endMs: END_MS,
  spread: 0.55,
  reach: LONG_AT_Y,
  flightMs: 170,
});

// the sounds and jolts, in order: a click at each shake's top, a clack at its
// bottom, then a psst at each burst and the long blast
const TICKS = SHAKES * 2;
const EVENTS = TICKS + BURSTS + 1;
const EVENT_AT = new Float64Array(EVENTS);
for (let k = 0; k < SHAKES; k++) {
  EVENT_AT[k * 2] = SHAKE_AT[k] + SHAKE_MS[k] / 2;
  EVENT_AT[k * 2 + 1] = SHAKE_AT[k + 1];
}
for (let k = 0; k < BURSTS; k++) EVENT_AT[TICKS + k] = BURST_AT[k];
EVENT_AT[EVENTS - 1] = LONG_AT;

interface Plan {
  // the flash's middle, from the total's
  start: Point;
}
const plans = new WeakMap<Running, Plan>();
let current: Plan | null = null;
const ORIGIN: Point = { x: 0, y: 0 };
const can: Point = { x: 0, y: 0 };

// the shake under way at ms (SHAKE_END and on: past the last)
function shakeAt(ms: number): number {
  let k = 0;
  while (k < SHAKES && ms >= SHAKE_AT[k + 1]) k++;
  return k;
}

const jitter = (ms: number, salt: number) =>
  holeHash(Math.floor(ms / 18), salt) - 0.5;

// the can at ms, from the total's middle
function canAt(ms: number): Point {
  if (ms < IN_MS) {
    const { start } = current!;
    const u = easeOutCubic(clamp01(ms / IN_MS));
    can.x = lerp(start.x, HOME.x, u);
    can.y = lerp(start.y, HOME.y, u);
    return can;
  }
  if (ms < SHAKE_END) {
    // up and snapping back down, swaying a touch, trembling harder
    const k = shakeAt(ms);
    const p = (ms - SHAKE_AT[k]) / SHAKE_MS[k];
    const grow = k / (SHAKES - 1);
    const amp = lerp(AMP[0], AMP[1], grow);
    const lift = Math.sin(Math.PI * p);
    const shiver = lerp(TREMBLE[0], TREMBLE[1], grow);
    can.x =
      HOME.x + (k % 2 ? SWAY : -SWAY) * amp * lift + jitter(ms, 931) * shiver;
    can.y = HOME.y - amp * Math.sqrt(lift) + jitter(ms, 932) * shiver;
    return can;
  }
  if (ms < LONG_DART) {
    let k = 0;
    while (k < BURSTS - 1 && ms >= DART_AT[k + 1]) k++;
    const to = spots[k];
    if (ms < BURST_AT[k]) {
      const from = k === 0 ? HOME : spots[k - 1];
      const u = easeOutCubic((ms - DART_AT[k]) / GAP_MS[k]);
      can.x = lerp(from.x, to.x, u);
      can.y = lerp(from.y, to.y, u);
      return can;
    }
    // kicked back off its aim as it fires
    const kick = RECOIL * Math.exp(-(ms - BURST_AT[k]) / RECOIL_MS);
    can.x = to.x - Math.cos(aims[k]) * kick + jitter(ms, 933) * 6;
    can.y = to.y - Math.sin(aims[k]) * kick + jitter(ms, 934) * 6;
    return can;
  }
  if (ms < LONG_AT) {
    const from = spots[BURSTS - 1];
    const u = easeOutCubic((ms - LONG_DART) / LONG_GAP_MS);
    can.x = lerp(from.x, LONG_SPOT.x, u);
    can.y = lerp(from.y, LONG_SPOT.y, u);
    return can;
  }
  // full pressure: shoved down and shuddering ever harder
  const u = clamp01((ms - LONG_AT) / LONG_MS);
  const shiver = lerp(LONG_TREMBLE[0], LONG_TREMBLE[1], u);
  can.x = LONG_SPOT.x + jitter(ms, 935) * shiver;
  can.y =
    LONG_SPOT.y +
    RECOIL * easeOut(clamp01((ms - LONG_AT) / 80)) +
    jitter(ms, 936) * shiver;
  return can;
}

// the cone of mist pointing along +x, and its fill
const cone = new Path2D();
cone.moveTo(0, 0);
cone.arc(0, 0, CONE_R, -CONE_W, CONE_W);
cone.closePath();
let coneFill: CanvasGradient | null = null;

function drawCone(
  ctx: CanvasRenderingContext2D,
  at: Point,
  aim: number,
  widen: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  if (!coneFill) {
    const gold = COLOR.heavenlyGold;
    coneFill = ctx.createRadialGradient(0, 0, 0, 0, 0, CONE_R);
    coneFill.addColorStop(0, `${gold}00`);
    coneFill.addColorStop(0.1, `${gold}88`);
    coneFill.addColorStop(0.7, `${gold}55`);
    coneFill.addColorStop(1, `${gold}00`);
  }
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(aim);
  ctx.scale(1, widen);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = coneFill;
  ctx.fill(cone);
  ctx.restore();
}

registerFloorCrit("rattleCanCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    for (let k = 0; k < BURSTS; k++) hit(0, BURST_AT[k] + LAND_MS);
    hit(0, END_MS, 1);
    plans.set(r, { start: { x: -to.x, y: -to.y } });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    current = plan;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    // click at the top, clack and a jolt at the bottom, psst at each burst
    while (r.kicked < EVENTS && ms >= EVENT_AT[r.kicked]) {
      const e = r.kicked++;
      if (e < TICKS) {
        const grow = (e >> 1) / (SHAKES - 1);
        playSpinTick(
          lerp(TICK_RATE[0], TICK_RATE[1], grow) * (e & 1 ? 0.8 : 1),
        );
        if (e & 1) r.shake(lerp(RATTLE_JOLT[0], RATTLE_JOLT[1], grow));
      } else playSwoosh();
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    const heat = clamp01((ms - IN_MS) / (SHAKE_END - IN_MS));
    const long = clamp01((ms - LONG_AT) / LONG_MS);
    let landed = 0;
    while (landed < BURSTS && ms >= BURST_AT[landed] + LAND_MS) landed++;
    const flash = ms >= END_MS ? 1 - (ms - END_MS) / FLASH_MS : 0;
    // the coat over the whole readout: a little more each burst, then the
    // long blast filling it in until it whites out
    if (landed > 0 && ms < END_MS + FLASH_MS) {
      const cover =
        ms >= END_MS
          ? flash
          : ms >= LONG_AT
            ? lerp(COAT_BURSTS, 1, long)
            : (COAT_BURSTS * landed) / BURSTS;
      drawSprayCoat(
        ctx,
        ORIGIN,
        COAT_W,
        COAT_H,
        cover,
        Math.max(flash, long * 0.35),
      );
    }
    // each burst's patch stuck where it hit, bumping white as it lands
    if (ms < END_MS + FLASH_MS)
      for (let k = 0; k < landed; k++) {
        const s = ms - BURST_AT[k] - LAND_MS;
        drawSprayCoat(
          ctx,
          hits[k],
          PATCH_W,
          PATCH_H,
          PATCH * clamp01(s / 60) * (ms >= END_MS ? flash : 1),
          0.8 * clamp01(1 - s / BUMP_MS),
        );
      }
    // the cones: each burst's short and sharp, the long blast's wide
    for (let k = 0; k < BURSTS; k++) {
      const s = ms - BURST_AT[k];
      if (s < 0) break;
      const off = ms - BURST_END[k];
      if (off >= CONE_FADE_MS) continue;
      drawCone(
        ctx,
        spots[k],
        aims[k],
        1,
        off < 0 ? 0.85 * clamp01(s / 20) : 0.85 * (1 - off / CONE_FADE_MS),
      );
    }
    if (ms >= LONG_AT && ms < END_MS + CONE_FADE_MS)
      drawCone(
        ctx,
        LONG_SPOT,
        LONG_AIM,
        LONG_WIDEN,
        ms < END_MS
          ? 0.75 + 0.2 * Math.sin(now * 0.06)
          : 0.9 * (1 - (ms - END_MS) / CONE_FADE_MS),
      );
    beginLightBatch(ctx);
    const at = canAt(ms);
    // the shaking: light pulled in, the can glowing hotter, a flash per tick
    if (ms >= IN_MS && ms < SHAKE_END + TICK_FLASH_MS) {
      const ctxOp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      if (ms < SHAKE_END) {
        ctx.globalAlpha = 0.3 + 0.45 * heat;
        drawGlow(
          ctx,
          GOLD,
          at.x,
          at.y,
          lerp(50, 130, heat) * (1 + 0.15 * Math.sin(now * 0.05)),
        );
      }
      const k = shakeAt(ms);
      const tick =
        k >= SHAKES
          ? SHAKE_END
          : ms - SHAKE_AT[k] >= SHAKE_MS[k] / 2
            ? SHAKE_AT[k] + SHAKE_MS[k] / 2
            : SHAKE_AT[k];
      const t = (ms - tick) / TICK_FLASH_MS;
      if (tick > IN_MS && t < 1) {
        ctx.globalAlpha = 1 - t;
        drawGlow(ctx, WHITE, at.x, at.y, lerp(45, 100, heat) * (1 - 0.4 * t));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = ctxOp;
      if (ms < SHAKE_END)
        for (let i = 0; i < PULL; i++) {
          const c = ms + hash01(i, 937) * PULL_MS;
          const life = Math.floor(c / PULL_MS);
          const t = (c % PULL_MS) / PULL_MS;
          const a = hash01(i, life) * Math.PI * 2;
          const d = PULL_R * (1 - t * t);
          drawGlitterLight(
            ctx,
            at.x + Math.cos(a) * d,
            at.y + Math.sin(a) * d,
            lerp(8, 16, heat),
            i + 940,
            t * (0.4 + 0.6 * heat),
            now,
          );
        }
    }
    // the bursts: the droplets, the mist where they land, the shimmer
    for (let k = 0; k < BURSTS; k++) {
      const s = ms - BURST_AT[k];
      if (s < 0) break;
      drawSpray(ctx, sprays[k], ms, now, DROPLET);
      const m = s - LAND_MS * 0.5;
      if (m >= 0 && ms < BURST_END[k] + BUMP_MS)
        drawSprayMist(
          ctx,
          hits[k],
          m,
          ms < BURST_END[k] ? 1 : 1 - (ms - BURST_END[k]) / BUMP_MS,
          MIST,
          now,
        );
      const sh = (s - LAND_MS) / SHIMMER_MS;
      if (sh >= 0 && sh < 1) {
        const d = SHIMMER_R * easeOut(sh);
        for (let i = 0; i < SPARKS; i++) {
          const a = (i / SPARKS) * Math.PI * 2 + hash01(i, k + 950) * 0.5;
          drawGlitterLight(
            ctx,
            hits[k].x + Math.cos(a) * d,
            hits[k].y + Math.sin(a) * d * 0.45,
            22 * (1 - 0.5 * sh),
            i + k * 17 + 960,
            1 - sh,
            now,
          );
        }
      }
    }
    // the long blast: mist billowing right across the readout
    drawSpray(ctx, longSpray, ms, now, DROPLET * 1.4);
    if (ms >= LONG_AT && ms < END_MS) {
      const s = ms - LONG_AT;
      drawSprayMist(
        ctx,
        ORIGIN,
        s,
        0.6 + 0.4 * long,
        LONG_MIST * (1 + long),
        now,
      );
      drawSprayMist(ctx, hits[4], s - 40, long, MIST, now);
      drawSprayMist(ctx, hits[3], s - 60, long, MIST, now);
    }
    endLightBatch(ctx);
    drawWispBetween(
      ctx,
      canAt,
      ms,
      now,
      CAN * (1 + 0.3 * heat),
      ms < LONG_AT ? heat : 1,
      0,
      END_MS,
    );
    ctx.restore();
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => HIT_SHAKES[step] ?? HIT_SHAKES[0],
});
