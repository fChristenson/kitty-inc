// Rocket Ship, a floor crit: the number bursts and hundreds of gold dots
// stream in off every bar in view, faster and faster, drawing one big rocket
// standing beside the bottom bar: its body, the nose cone, the window, the
// fins and the nozzle, a click and a jolt as each part completes; the
// finished rocket blazes white and trembles, flames pouring out of its
// nozzle as the rumble rises, then it blasts off straight up past every bar
// at full speed, each flaring and levelling with a jolt as it passes, and
// bursts on the top bar in one big blast, its dots raining down
import { COLOR } from "../../../../palette";
import {
  shapeFill,
  shapeOutline,
  type Shape,
} from "../../../../shared/animationStyles/drawing";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const IN_MS = 110;
// the rocket's half height: this share of the bars' span, within SIZE; it
// stands its fins FOOT px below the bottom bar's middle, SIDE of the bar's
// half width out, at least MIN_RISE px under where it bursts
const SIZE: [number, number] = [120, 175];
const SIZE_SHARE = 0.4;
const SIDE = 0.7;
const FOOT = 18;
const MIN_RISE = 220;
// dots per part, each flying in off a bar on a SWIRL bend in FLY_MS (first
// to last, quicker), landing over FILL_MS, quicker and quicker
const BODY_DOTS = 150;
const NOSE_DOTS = 40;
const WINDOW_DOTS = 30;
const CORE_DOTS = 14;
const FIN_DOTS = 36;
const NOZZLE_DOTS = 30;
const FLY_MS: [number, number] = [210, 110];
const SWIRL = 0.5;
const FILL_MS = 760;
const FILL_EASE = 0.55;
const DOT = 16;
// drawn, it charges over BLAZE_MS, throbbing THROB_HZ, trembling up to
// TREMBLE px, swelling by SWELL, its glow GLOW of its size
const BLAZE_MS = 430;
const THROB_HZ = 10;
const TREMBLE = 7;
const SWELL = 0.07;
const GLOW = 2.4;
// flames: FLAMES dots each living FLAME_MS, pouring FLAME_LEN of its size
// out of the nozzle, FLY_FLAME_LEN once it flies
const FLAMES = 56;
const FLAME_MS = 200;
const FLAME_LEN = 0.9;
const FLY_FLAME_LEN = 2.8;
// the lift-off: LAUNCH_MS to the top bar, accelerating by LAUNCH_EASE,
// stretched by STRETCH at speed
const LAUNCH_MS = 250;
const LAUNCH_EASE = 1.4;
const STRETCH = 0.25;
// each bar it passes flares; the burst and its dots raining for RAIN_MS
const FLARE_MS = 220;
const FLARE = 280;
const BLAST = 460;
const BURST_FLASH = 420;
const RAIN_MS = 650;
const RAIN_SPEED: [number, number] = [260, 780];
const RAIN_KICK = 260;
const GRAVITY = 1700;
// shakes by step: a bar it passes, the burst; jolts as each part completes
const SHAKES = [1.4, 3.4];
const CLICK_SHAKE: [number, number] = [0.3, 0.7];

// parts: body, nose cone, window, fins, nozzle; the fins' foot in its units
const WINDOW = 2;
const PARTS = 5;
const FIN_FOOT = 0.8;

const BODY: Shape = [
  [
    { x: 0, y: -1 },
    { x: 0.17, y: -0.78 },
    { x: 0.28, y: -0.5 },
    { x: 0.3, y: -0.1 },
    { x: 0.3, y: 0.55 },
    { x: -0.3, y: 0.55 },
    { x: -0.3, y: -0.1 },
    { x: -0.28, y: -0.5 },
    { x: -0.17, y: -0.78 },
  ],
];
const NOSE: Shape = [
  [
    { x: 0, y: -1 },
    { x: 0.17, y: -0.78 },
    { x: 0.25, y: -0.6 },
    { x: -0.25, y: -0.6 },
    { x: -0.17, y: -0.78 },
  ],
];
const WINDOW_Y = -0.2;
const RING: Shape = [
  Array.from({ length: 32 }, (_, k) => ({
    x: Math.cos((k / 32) * Math.PI * 2),
    y: Math.sin((k / 32) * Math.PI * 2),
  })),
];
const WINDOW_R = 0.13;
const CORE_R = 0.075;
const fin = (side: number): Shape => [
  [
    { x: side * 0.3, y: 0.1 },
    { x: side * 0.58, y: 0.55 },
    { x: side * 0.58, y: FIN_FOOT },
    { x: side * 0.3, y: 0.55 },
  ],
];
const NOZZLE: Shape = [
  [
    { x: -0.16, y: 0.55 },
    { x: 0.16, y: 0.55 },
    { x: 0.24, y: 0.74 },
    { x: -0.24, y: 0.74 },
  ],
];
const NOZZLE_Y = 0.74;

// each flame's sideways drift, built once
const FLAME_X = Float32Array.from(
  { length: FLAMES },
  (_, k) => holeHash(k, 5301) * 2 - 1,
);

interface State {
  size: number;
  // the bottom and top bars; the rocket's spot off the bottom bar, the
  // burst's height off the top bar
  bottom: number;
  top: number;
  offX: number;
  restOff: number;
  burstOff: number;
  // every dot local to the rocket's middle: its part, landing, bend, the bar
  // it flies in off and where along it, its rain velocity
  xs: Float32Array;
  ys: Float32Array;
  part: Uint8Array;
  lands: Float32Array;
  bend: Float32Array;
  srcBar: Uint8Array;
  srcX: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  done: Float32Array;
  hitAt: Float32Array;
  charge: Charge;
  drawnMs: number;
  launchMs: number;
  burstMs: number;
}
const states = new WeakMap<Running, State>();
const centre: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const GOLD_FLASH = fadeStops(COLOR.heavenlyGold);
const WHITE_FLASH = fadeStops(COLOR.white, 0.3);

registerFloorCrit("rocketShipCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    let bottom = 0;
    let top = 0;
    for (let b = 1; b < bars.length; b++) {
      if (bars[b].y > bars[bottom].y) bottom = b;
      if (bars[b].y < bars[top].y) top = b;
    }
    const span = bars[bottom].y - bars[top].y;
    const size = Math.min(SIZE[1], Math.max(SIZE[0], span * SIZE_SHARE));
    const edge = Math.max(0, r.viewportWidth / 2 - size * 0.65);
    const rx = Math.max(-edge, Math.min(edge, bars[bottom].x + half * SIDE));
    const restY = bars[bottom].y + FOOT - FIN_FOOT * size;
    const burstY = Math.min(bars[top].y, restY - MIN_RISE);

    // the dots part by part, local to the rocket's middle
    const xs: number[] = [];
    const ys: number[] = [];
    const part: number[] = [];
    const add = (points: Point[], k: number) => {
      for (const p of points) {
        xs.push(p.x);
        ys.push(p.y);
        part.push(k);
      }
    };
    const origin = { x: 0, y: 0 };
    add(shapeOutline(BODY, BODY_DOTS, origin, size), 0);
    add(shapeFill(NOSE, NOSE_DOTS, origin, size), 1);
    const window = { x: 0, y: WINDOW_Y * size };
    add(shapeOutline(RING, WINDOW_DOTS, window, WINDOW_R * size), WINDOW);
    add(shapeFill(RING, CORE_DOTS, window, CORE_R * size), WINDOW);
    add(shapeFill(fin(-1), FIN_DOTS, origin, size), 3);
    add(shapeFill(fin(1), FIN_DOTS, origin, size), 3);
    add(shapeFill(NOZZLE, NOZZLE_DOTS, origin, size), 4);

    const n = xs.length;
    const lands = new Float32Array(n);
    const bend = new Float32Array(n);
    const srcBar = new Uint8Array(n);
    const srcX = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    const done = new Float32Array(PARTS);
    for (let i = 0; i < n; i++) {
      lands[i] = IN_MS + FLY_MS[0] + FILL_MS * (i / n) ** FILL_EASE;
      bend[i] = (holeHash(i, 5302) * 2 - 1) * SWIRL;
      srcBar[i] = i % bars.length;
      srcX[i] = (holeHash(i, 5303) * 2 - 1) * half * 0.9;
      done[part[i]] = lands[i];
      const len = Math.hypot(xs[i], ys[i]) || 1;
      const speed = lerp(RAIN_SPEED[0], RAIN_SPEED[1], holeHash(i, 5304));
      vx[i] = (xs[i] / len) * speed;
      vy[i] = (ys[i] / len) * speed - RAIN_KICK;
    }
    const drawnMs = lands[n - 1];
    const launchMs = drawnMs + BLAZE_MS;
    const burstMs = launchMs + LAUNCH_MS;

    // each bar as the rocket's middle passes it, the top one at the burst
    const hitAt = new Float32Array(bars.length);
    const rise = Math.max(1, restY - burstY);
    const order: number[] = [];
    for (let b = 0; b < bars.length; b++) {
      order.push(b);
      hitAt[b] =
        b === top
          ? burstMs
          : launchMs +
            LAUNCH_MS *
              clamp01((restY - bars[b].y) / rise) ** (1 / LAUNCH_EASE);
    }
    order.sort((a, b) => hitAt[a] - hitAt[b]);
    for (const b of order) hit(b, hitAt[b], b === top ? 1 : 0);

    states.set(r, {
      size,
      bottom,
      top,
      offX: rx - bars[bottom].x,
      restOff: restY - bars[bottom].y,
      burstOff: burstY - bars[top].y,
      xs: Float32Array.from(xs),
      ys: Float32Array.from(ys),
      part: Uint8Array.from(part),
      lands,
      bend,
      srcBar,
      srcX,
      vx,
      vy,
      done,
      hitAt,
      charge: planCharge(drawnMs, BLAZE_MS, {
        shake: [0.15, 1],
        everyMs: [170, 40],
        climaxShake: 1.8,
        bang: false,
      }),
      drawnMs,
      launchMs,
      burstMs,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { xs, ys, part, lands, bend, srcBar, srcX, vx, vy, done } = state;
    const { hitAt, launchMs, burstMs, size, top } = state;
    const base = bars[state.bottom];
    const rx = base.x + state.offX;
    const restY = base.y + state.restOff;
    const burstY = bars[top].y + state.burstOff;

    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    // a click and a jolt as each part is drawn, rising; the lift-off's
    // whoosh and the burst's bang
    while (r.kicked < PARTS && ms >= done[r.kicked]) {
      const u = r.kicked / (PARTS - 1);
      playSpinTick(1 + 0.8 * u);
      r.shake(lerp(CLICK_SHAKE[0], CLICK_SHAKE[1], u));
      r.kicked++;
    }
    tickCharge(state.charge, ms, r.shake);
    if (r.kicked === PARTS && ms >= launchMs) {
      playSwoosh();
      r.kicked++;
    }
    if (r.kicked === PARTS + 1 && ms >= burstMs) {
      playExplosion();
      r.kicked++;
    }

    const c = chargeAt(state.charge, ms);
    const fly = clamp01((ms - launchMs) / LAUNCH_MS);
    const flying = ms >= launchMs && ms < burstMs;
    const stretch = flying ? 1 + STRETCH * Math.min(1, fly * 4) : 1;
    const throb =
      c > 0 ? 0.5 + 0.5 * Math.sin((ms / 1000) * THROB_HZ * Math.PI * 2) : 0;
    const swell = 1 + SWELL * c;
    trembleAt(c, ms, TREMBLE, shiver);
    const cx = rx + shiver.x;
    const cy = lerp(restY, burstY, fly ** LAUNCH_EASE) + shiver.y;

    if (c > 0 && ms < burstMs) {
      centre.x = cx;
      centre.y = cy;
      drawChargeGlow(ctx, centre, c, size * GLOW, now);
    }

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);

    // flames pouring out of the nozzle, a long trail once it flies
    if (c > 0.02 && ms < burstMs) {
      const len = size * (flying ? FLY_FLAME_LEN : FLAME_LEN * (0.3 + 0.7 * c));
      const power = flying ? 1 : c;
      const nozzleY = cy + NOZZLE_Y * size * swell * stretch;
      for (let k = 0; k < FLAMES; k++) {
        const f = (ms / FLAME_MS + k * 0.618034) % 1;
        stampGlimmer(
          ctx,
          cx + FLAME_X[k] * size * 0.16 * (1 + 1.5 * f),
          nozzleY + f * len,
          DOT * 1.2 * (1 - f) * (0.5 + 0.8 * power),
          k + ms * 0.01,
          f < 0.35 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
    }

    const n = xs.length;
    if (ms >= IN_MS && ms < burstMs) {
      const dot = DOT * (1 + 0.4 * c + 0.25 * throb);
      for (let i = 0; i < n; i++) {
        const land = lands[i];
        const flyMs = lerp(FLY_MS[0], FLY_MS[1], i / n);
        if (ms < land - flyMs) break;
        const x = cx + xs[i] * swell;
        const y = cy + ys[i] * swell * stretch;
        if (ms < land) {
          // streaming in off its bar on a bend
          const src = bars[srcBar[i]];
          const sx = src.x + srcX[i];
          const sy = src.y;
          const u = 1 - (land - ms) / flyMs;
          const b = bend[i];
          const mx = (sx + x) / 2 - (y - sy) * b;
          const my = (sy + y) / 2 + (x - sx) * b;
          const v = 1 - u;
          stampGlimmer(
            ctx,
            v * v * sx + 2 * v * u * mx + u * u * x,
            v * v * sy + 2 * v * u * my + u * u * y,
            DOT * 0.8,
            i,
            COLOR.heavenlyGold,
          );
          continue;
        }
        stampGlimmer(
          ctx,
          x,
          y,
          dot,
          i + ms * 0.004,
          part[i] === WINDOW || c > 0.5 || i % 3 === 0
            ? COLOR.white
            : COLOR.heavenlyGold,
        );
      }
    } else if (ms >= burstMs) {
      // its dots flung out of the burst, raining down
      const f = (ms - burstMs) / RAIN_MS;
      if (f < 1) {
        const t = (ms - burstMs) / 1000;
        const fall = 0.5 * GRAVITY * t * t;
        const dot = DOT * 1.2 * (1 - f);
        for (let i = 0; i < n; i++)
          stampGlimmer(
            ctx,
            rx + xs[i] + vx[i] * t,
            burstY + ys[i] + vy[i] * t + fall,
            dot,
            i,
            i % 2 === 0 ? COLOR.white : COLOR.heavenlyGold,
          );
      }
    }

    // a flare on each bar it passes, white where it crossed
    for (let b = 0; b < bars.length; b++) {
      if (b === top) continue;
      const since = ms - hitAt[b];
      if (since < 0 || since >= FLARE_MS) continue;
      const f = since / FLARE_MS;
      const bar = bars[b];
      ctx.globalAlpha = 1 - f;
      drawGlow(ctx, GOLD_FLASH, bar.x, bar.y, FLARE * (0.6 + 0.9 * f));
      drawGlow(ctx, WHITE_FLASH, rx, bar.y, FLARE * 0.5 * (1 - 0.5 * f));
    }
    // the burst's white flash
    const since = ms - burstMs;
    if (since >= 0 && since < FLARE_MS) {
      ctx.globalAlpha = (1 - since / FLARE_MS) ** 2;
      drawGlow(ctx, WHITE_FLASH, rx, burstY, BURST_FLASH);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    at.x = rx;
    at.y = burstY;
    drawDetonation(ctx, at, since, BLAST, now);
  },
  tailMs: Math.max(DETONATION_MS, RAIN_MS),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
