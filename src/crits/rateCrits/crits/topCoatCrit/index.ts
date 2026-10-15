// Top Coat, a rate crit: the number shrinks into a nozzle wisp that darts to
// the top (best-paying) bar and hovers over its readout, gulping the gold off
// it in a stream of glitter, a trickle then a flood, swelling and trembling
// until the readout flashes and flips; then it zigzags down the other bars,
// hissing a cone of gold mist over each readout, its coat building until it
// flashes and flips in a blast, quicker every bar; its own last, one long
// full-pressure hiss and the biggest blast. Each readout it coats: the bar's
// next payouts pay what the best-paying floor's do
import meta from "./meta";
import { countDown, defineBarEffect } from "../../rateBonus";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { divide, log10, gt, ZERO } from "../../../../shared/bigNumber";
import { isFloorLocked } from "../../../../shared/detachedJob";
import { currentPayoutAmount } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  byHeight,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
const FIRST_DART_MS = 110;
// the gulp off the top bar
const SUCK_MS = 330;
// the other bars share OTHERS_MS (at most MAX_BAR_MS a bar), each QUICK
// times as long by the last, DART of it darting there; its own after them
const OTHERS_MS = 760;
const MAX_BAR_MS = 300;
const QUICK = 0.55;
const DART = 0.28;
const OWN_DART_MS = 90;
const OWN_HISS_MS = 480;
// where the nozzle hovers from a readout: gulping, spraying, on its own
const SUCK_X = 150;
const SUCK_Y = -130;
const HOVER_X = 220;
const HOVER_Y = -120;
const OWN_HOVER_X = 190;
const OWN_HOVER_Y = -105;
const JUDDER_MS = 16;
const SUCK_JUDDER = 12;
const HISS_JUDDER = 7;
const OWN_JUDDER = 14;
// the cone raking side to side over the readout
const RAKE = 0.12;
const RAKE_RATE = 0.035;
const SPREAD = 0.24;
const OWN_SPREAD = 0.36;
const SPRAY = 60;
const OWN_SPRAY = 90;
const FLIGHT_MS = 240;
// the readout's coat
const COAT_W = 300;
const COAT_H = 72;
const FLASH_FADE_MS = 160;
const COAT_FADE_MS = 260;
// glitter gulped off the top readout, more and quicker as it goes
const SUCK_N = 64;
const SUCK_FLY_MS = 170;
const SUCK_SPARK = 9;
const NOZZLE = WISP_SIZE * 0.8;
const NOZZLE_FULL = WISP_SIZE * 1.3;
const RUMBLE_MS = 60;
const RUMBLE = 0.45;
const OWN_RUMBLE = 0.8;
const GULP_BLAST = 110;
const BLAST = 130;
const OWN_BLAST = 320;
// shakes by step: the gulp's jolt on its own, a bar, its own
const SHAKES = [0.6, 1.4, 3.2];

// each gulped spark's start (0..1 of the gulp), and where on the readout
const suckBorn = new Float32Array(SUCK_N);
const suckDx = new Float32Array(SUCK_N);
const suckDy = new Float32Array(SUCK_N);
for (let i = 0; i < SUCK_N; i++) {
  suckBorn[i] = Math.sqrt(i / SUCK_N) * 0.85;
  suckDx[i] = (holeHash(i, 611) * 2 - 1) * COAT_W * 0.5;
  suckDy[i] = (holeHash(i, 613) * 2 - 1) * COAT_H * 0.5;
}

interface Leg {
  startMs: number;
  endMs: number;
  hold: boolean;
  // the bars it runs from and to (-1: the flash's middle), and the spots
  // off their middles; a hold trembles up to judder px
  fromBar: number;
  fromX: number;
  fromY: number;
  toBar: number;
  toX: number;
  toY: number;
  judder: number;
}
interface Hiss {
  bar: number;
  own: boolean;
  startMs: number;
  endMs: number;
  spray: Spray;
}
interface Blast {
  bar: number;
  ms: number;
  size: number;
}
interface Plan {
  legs: Leg[];
  source: number;
  suckStart: number;
  suckEnd: number;
  hisses: Hiss[];
  blasts: Blast[];
  rumbleMs: number[];
  rumbleSize: number[];
  endMs: number;
}
const plans = new WeakMap<Running, Plan>();
// the bars this frame and the plan the nozzle follows
let frameBars: Point[] = [];
let current: Plan | null = null;
const nozzle: Point = { x: 0, y: 0 };
const aimFrom: Point = { x: 0, y: 0 };
const mouth: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

const barX = (bar: number) => (bar < 0 ? 0 : frameBars[bar].x);
const barY = (bar: number) => (bar < 0 ? 0 : frameBars[bar].y);

// the nozzle at ms into `into`: a pure function of ms, so its trail follows
function nozzleInto(ms: number, into: Point): Point {
  const { legs } = current!;
  let k = 0;
  while (k < legs.length - 1 && ms >= legs[k].endMs) k++;
  const leg = legs[k];
  const u = clamp01((ms - leg.startMs) / (leg.endMs - leg.startMs || 1));
  if (!leg.hold) {
    const e = 1 - (1 - u) * (1 - u);
    into.x = lerp(barX(leg.fromBar) + leg.fromX, barX(leg.toBar) + leg.toX, e);
    into.y = lerp(barY(leg.fromBar) + leg.fromY, barY(leg.toBar) + leg.toY, e);
    return into;
  }
  const tick = Math.floor(ms / JUDDER_MS);
  const shiver = leg.judder * (0.3 + 0.7 * u);
  into.x = barX(leg.toBar) + leg.toX + (holeHash(tick, 4127) - 0.5) * shiver;
  into.y = barY(leg.toBar) + leg.toY + (holeHash(tick, 4133) - 0.5) * shiver;
  return into;
}
const nozzleAt = (ms: number): Point => nozzleInto(ms, nozzle);

// a spray from the nozzle onto bar's readout, raking over it
function sprayOnto(bar: number, startMs: number, endMs: number, own: boolean) {
  return planSpray(
    nozzleAt,
    (ms) => {
      nozzleInto(ms, aimFrom);
      return (
        Math.atan2(barY(bar) - aimFrom.y, barX(bar) - aimFrom.x) +
        RAKE * Math.sin(ms * RAKE_RATE)
      );
    },
    {
      startMs,
      endMs,
      spread: own ? OWN_SPREAD : SPREAD,
      reach: Math.hypot(
        own ? OWN_HOVER_X : HOVER_X,
        own ? OWN_HOVER_Y : HOVER_Y,
      ),
      flightMs: FLIGHT_MS,
    },
  );
}

// each bar's next payouts paying `times` as much, `left` to go
const coat = defineBarEffect<{ times: number; left: number }>({
  payout: (v) => v.times,
  onPayout: (v) => {
    const left = countDown(v.left);
    return left === undefined ? undefined : { times: v.times, left };
  },
});

const LOG_CAP = Math.log10(meta.values.cap);
const MIN_TIMES = 2;

registerFloorCrit("topCoatCrit", {
  reward(t) {
    const { now } = t;
    // what a floor pays right now, without a coat of this crit's on it
    const pays = (floor: typeof t.floor) => {
      const amount = currentPayoutAmount(floor, now);
      const on = coat.get(floor);
      return on ? divide(amount, on.times) : amount;
    };
    let best = ZERO;
    for (const floor of t.floors) {
      if (!floor.unlocked || isFloorLocked(floor)) continue;
      const amount = pays(floor);
      if (gt(amount, best)) best = amount;
    }
    const gap = log10(best) - log10(pays(t.floor));
    let times = gap >= LOG_CAP ? meta.values.cap : 10 ** gap;
    // NaN too: nothing paying anywhere
    if (!(times >= MIN_TIMES)) times = MIN_TIMES;
    t.flipRate();
    coat.set(t.floor, {
      times,
      left: t.own ? meta.values.ownPayouts : meta.values.payouts,
    });
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const source = order[0];
    const sprayed: number[] = [];
    for (const bar of order) if (bar !== source && bar !== 0) sprayed.push(bar);
    sprayed.push(0);
    const legs: Leg[] = [];
    const hisses: Hiss[] = [];
    const blasts: Blast[] = [];
    const rumbleMs: number[] = [];
    const rumbleSize: number[] = [];
    let t = IN_MS;
    legs.push({
      startMs: 0,
      endMs: t,
      hold: true,
      fromBar: -1,
      fromX: 0,
      fromY: 0,
      toBar: -1,
      toX: 0,
      toY: 0,
      judder: 0,
    });
    legs.push({
      startMs: t,
      endMs: t + FIRST_DART_MS,
      hold: false,
      fromBar: -1,
      fromX: 0,
      fromY: 0,
      toBar: source,
      toX: SUCK_X,
      toY: SUCK_Y,
      judder: 0,
    });
    t += FIRST_DART_MS;
    const suckStart = t;
    legs.push({
      startMs: t,
      endMs: t + SUCK_MS,
      hold: true,
      fromBar: source,
      fromX: SUCK_X,
      fromY: SUCK_Y,
      toBar: source,
      toX: SUCK_X,
      toY: SUCK_Y,
      judder: SUCK_JUDDER,
    });
    for (let ms = t + RUMBLE_MS; ms < t + SUCK_MS; ms += RUMBLE_MS) {
      rumbleMs.push(ms);
      rumbleSize.push(RUMBLE);
    }
    t += SUCK_MS;
    const suckEnd = t;
    // drained, its readout flips over too (its own just jolts: it's coated last)
    hit(source, t, source === 0 ? 0 : 1);
    blasts.push({ bar: source, ms: t, size: GULP_BLAST });
    let fromBar = source;
    let fromX = SUCK_X;
    let fromY = SUCK_Y;
    const others = sprayed.length - 1;
    let weights = 0;
    for (let k = 0; k < others; k++)
      weights += lerp(1, QUICK, k / Math.max(1, others - 1));
    const unit = others > 0 ? Math.min(MAX_BAR_MS, OTHERS_MS / weights) : 0;
    sprayed.forEach((bar, k) => {
      const own = bar === 0;
      const side = k % 2 ? 1 : -1;
      const w = lerp(1, QUICK, k / Math.max(1, others - 1));
      const dart = own ? OWN_DART_MS : unit * w * DART;
      const hiss = own ? OWN_HISS_MS : unit * w * (1 - DART);
      const toX = side * (own ? OWN_HOVER_X : HOVER_X);
      const toY = own ? OWN_HOVER_Y : HOVER_Y;
      legs.push({
        startMs: t,
        endMs: t + dart,
        hold: false,
        fromBar,
        fromX,
        fromY,
        toBar: bar,
        toX,
        toY,
        judder: 0,
      });
      t += dart;
      legs.push({
        startMs: t,
        endMs: t + hiss,
        hold: true,
        fromBar: bar,
        fromX: toX,
        fromY: toY,
        toBar: bar,
        toX,
        toY,
        judder: own ? OWN_JUDDER : HISS_JUDDER,
      });
      hisses.push({
        bar,
        own,
        startMs: t,
        endMs: t + hiss,
        spray: sprayOnto(bar, t, t + hiss, own),
      });
      for (let ms = t + RUMBLE_MS; ms < t + hiss; ms += RUMBLE_MS) {
        rumbleMs.push(ms);
        rumbleSize.push(own ? OWN_RUMBLE : RUMBLE);
      }
      t += hiss;
      hit(bar, t, own ? 2 : 1);
      blasts.push({ bar, ms: t, size: own ? OWN_BLAST : BLAST });
      fromBar = bar;
      fromX = toX;
      fromY = toY;
    });
    plans.set(r, {
      legs,
      source,
      suckStart,
      suckEnd,
      hisses,
      blasts,
      rumbleMs,
      rumbleSize,
      endMs: t,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    frameBars = bars;
    current = plan;
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.7 * u), {
        alpha: 1 - u,
      });
    }
    while (r.kicked < plan.rumbleMs.length && ms >= plan.rumbleMs[r.kicked]) {
      r.shake(plan.rumbleSize[r.kicked]);
      r.kicked++;
    }
    const { suckStart, suckEnd, source } = plan;
    // the top readout's gold drained off it, then its flash
    if (ms >= suckStart && ms < suckEnd + FLASH_FADE_MS) {
      spot.x = bars[source].x;
      spot.y = bars[source].y;
      const u = clamp01((ms - suckStart) / SUCK_MS);
      drawSprayCoat(
        ctx,
        spot,
        COAT_W,
        COAT_H,
        1 - u,
        ms >= suckEnd ? 1 - (ms - suckEnd) / FLASH_FADE_MS : 0,
      );
    }
    // the glitter streaming up into the nozzle, quicker and thicker
    if (ms >= suckStart && ms < suckEnd) {
      nozzleInto(ms, mouth);
      const sx = bars[source].x;
      const sy = bars[source].y;
      for (let i = 0; i < SUCK_N; i++) {
        const born = suckStart + suckBorn[i] * SUCK_MS;
        const fly = SUCK_FLY_MS * (1 - 0.45 * suckBorn[i]);
        const p = (ms - born) / fly;
        if (p < 0) break;
        if (p >= 1) continue;
        const e = p * p;
        drawGlitterLight(
          ctx,
          lerp(sx + suckDx[i], mouth.x, e),
          lerp(sy + suckDy[i], mouth.y, e),
          SUCK_SPARK * (1 - 0.5 * p),
          i + 900,
          1 - p * p * 0.5,
          now,
        );
      }
    }
    for (const h of plan.hisses) {
      if (ms < h.startMs) break;
      if (ms > h.endMs + COAT_FADE_MS) continue;
      spot.x = bars[h.bar].x;
      spot.y = bars[h.bar].y;
      const c = clamp01((ms - h.startMs) / (h.endMs - h.startMs));
      const after = ms - h.endMs;
      drawSprayCoat(
        ctx,
        spot,
        COAT_W,
        COAT_H,
        after > 0 ? 1 - after / COAT_FADE_MS : c,
        after > 0 ? clamp01(1 - after / FLASH_FADE_MS) : 0,
      );
      const size = h.own ? OWN_SPRAY : SPRAY;
      if (after <= 0) drawSprayMist(ctx, spot, ms - h.startMs, c, size, now);
      drawSpray(ctx, h.spray, ms, now, size);
    }
    // swelling as it gulps, full from then on
    const full = clamp01((ms - suckStart) / SUCK_MS);
    const last = plan.hisses[plan.hisses.length - 1];
    const heat =
      ms < suckEnd
        ? full
        : ms >= last.startMs
          ? 1
          : 0.45 + 0.3 * Math.sin(ms * 0.05);
    drawWispBetween(
      ctx,
      nozzleAt,
      ms,
      now,
      lerp(NOZZLE, NOZZLE_FULL, full),
      heat,
      0,
      plan.endMs,
    );
    for (const b of plan.blasts) {
      spot.x = bars[b.bar].x;
      spot.y = bars[b.bar].y;
      drawDetonation(ctx, spot, ms - b.ms, b.size, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
