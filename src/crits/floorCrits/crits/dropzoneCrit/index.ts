// Dropzone, a floor crit: a big ring opens high over the bars in view and
// the number, shrunk to a wisp, is tossed up and drops into it; its small
// twin pops open over one bar's readout at a time, top to bottom, and the
// wisp bursts out of it straight down onto the readout (a hit), rebounds up
// and over, falls into the big ring again as the twin hops to the next bar,
// faster every drop, the speed carrying through; the last bounce goes up to
// the very top, the twin opens over its own bar's readout and the wisp
// slams in at full speed in the biggest blast
import {
  drawPortal,
  drawPortalPass,
  portalLook,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { ownLast, skyY } from "../../critPlayer/shared";

// the number trembling and shrinking till DROP_MS, the big ring opening from
// OPEN_AT over OPEN_MS
const DROP_MS = 280;
const TREMBLE = 10;
const SHRINK = 0.45;
const OPEN_AT = 30;
const OPEN_MS = 200;
// the big ring ABOVE the top bar, HIGH px to its rim, GROW bigger each pass
// and flaring FLARE over FLARE_MS on it
const ABOVE = 260;
const HIGH = 150;
const GROW = 0.08;
const FLARE = 0.6;
const FLARE_MS = 170;
const CLOSE_MS = 160;
const HIGH_LOOK = portalLook(5);
// the twin TWIN_UP px over a readout READ px in from the bar's right end,
// TWIN px to its rim and TWIN_GROW bigger each drop, popping open TWIN_LEAD
// before its first pass and hopping to the next readout over HOP_MS
const TWIN_UP = 130;
const READ = 120;
const TWIN = 52;
const TWIN_GROW = 0.15;
const TWIN_LEAD = 120;
const TWIN_POP = 90;
const HOP_MS = 90;
const HOP_POP = 0.4;
const TWIN_LOOK = portalLook(2);
// speeds in px a ms: the toss in at V0, each fall out of the twin gaining
// FALL_GAIN, each bounce reaching the big ring GAIN faster, the last bounce
// LAST_BOOST more, up to VMAX
const V0 = 2.6;
const TOSS_IN = 0.7;
const FALL_GAIN = 1.15;
const GAIN = 1.3;
const LAST_BOOST = 1.35;
const VMAX = 13;
const MIN_LEG = 30;
// how far over the big ring a toss or bounce swings before falling in, the
// last bounce to the very top, never past CEIL screen widths up
const TOSS_LOFT = 240;
const LOFT = 220;
const LAST_LOFT = 520;
const CEIL = 1.25;
const WISP = WISP_SIZE * 1.15;
const WISP_GROW = WISP_SIZE * 1.1;
// a readout's flash as the wisp hits it
const HIT_MS = 150;
const HIT_GLOW = 230;
const HIT_SQUASH = 0.45;
const PASS_SHAKE: [number, number] = [0.3, 1.2];
const END_BLAST = 340;
// shakes by step: another bar's readout, the slam
const SHAKES = [0.6, 3];

const TOSS = 0;
const FALL = 1;
const BOUNCE = 2;
interface Leg {
  kind: number;
  // the drop it belongs to (order index)
  drop: number;
  startMs: number;
  ms: number;
  // its speed going in, as a share of its average
  a0: number;
  loft: number;
}
interface State {
  // bar indexes top to bottom, its own last
  order: number[];
  legs: Leg[];
  // when it dives into the big ring and out of the twin of drop k
  passes: number[];
  hitAt: number[];
  endMs: number;
  runner: (ms: number) => Point | null;
  // the spots this frame, so a scroll carries everything along
  bars: Point[];
  half: number;
  ringX: number;
  ringY: number;
  ceil: number;
}
const states = new WeakMap<Running, State>();
const WHITE = glowStops(COLOR.white);
const spot: Point = { x: 0, y: 0 };
const ring: Point = { x: 0, y: 0 };
const twin: Point = { x: 0, y: 0 };
const pass: Point = { x: 0, y: 0 };

function place(s: State, r: Running, bars: Point[]): void {
  s.bars = bars;
  s.half = r.play.barHalfWidth;
  s.ringX = bars[0].x;
  s.ringY = skyY(r, bars, ABOVE);
  s.ceil = -r.viewportWidth * CEIL;
}

const readX = (s: State, bar: number) => s.bars[bar].x + s.half - READ;

// the twin over drop k's readout, into `out`
function twinAt(s: State, k: number, out: Point): Point {
  const bar = s.order[k];
  out.x = readX(s, bar);
  out.y = s.bars[bar].y - TWIN_UP;
  return out;
}

// a curve from (ax, ay) swinging up to (cx, cy) and falling onto the big ring
function swing(
  s: State,
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  g: number,
  out: Point,
): void {
  const h = 1 - g;
  out.x = h * h * ax + 2 * h * g * cx + g * g * s.ringX;
  out.y = h * h * ay + 2 * h * g * cy + g * g * s.ringY;
}

const swingLen = (
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
) =>
  (Math.hypot(cx - ax, cy - ay) +
    Math.hypot(bx - cx, by - cy) +
    Math.hypot(bx - ax, by - ay)) /
  2;

const tossTop = (s: State) =>
  Math.max(Math.min(0, s.ringY) - TOSS_LOFT, s.ceil);
const bounceTop = (s: State, loft: number) => Math.max(s.ringY - loft, s.ceil);

// where a leg has got to by share g of its run
function legAt(s: State, leg: Leg, g: number, out: Point): Point {
  if (leg.kind === TOSS) swing(s, 0, 0, s.ringX * 0.5, tossTop(s), g, out);
  else if (leg.kind === FALL) {
    twinAt(s, leg.drop, out);
    out.y += TWIN_UP * g;
  } else {
    const bar = s.order[leg.drop];
    swing(
      s,
      readX(s, bar),
      s.bars[bar].y,
      s.ringX,
      bounceTop(s, leg.loft),
      g,
      out,
    );
  }
  return out;
}

// the share of a leg run by `t` of its time
const run = (a0: number, t: number) => a0 * t + (1 - a0) * t * t;

registerFloorCrit("dropzoneCrit", {
  plan(r, bars, hit) {
    const s: State = {
      order: ownLast(bars),
      legs: [],
      passes: [],
      hitAt: [],
      endMs: 0,
      runner: () => null,
      bars,
      half: 0,
      ringX: 0,
      ringY: 0,
      ceil: 0,
    };
    place(s, r, bars);
    const n = s.order.length;
    let t = DROP_MS;
    const add = (
      kind: number,
      drop: number,
      len: number,
      vin: number,
      vout: number,
      loft = 0,
    ) => {
      const ms = Math.max(MIN_LEG, (2 * len) / (vin + vout));
      const a0 = Math.min(2, Math.max(0, (vin * ms) / Math.max(1, len)));
      s.legs.push({ kind, drop, startMs: t, ms, a0, loft });
      t += ms;
    };
    add(
      TOSS,
      0,
      swingLen(0, 0, s.ringX * 0.5, tossTop(s), s.ringX, s.ringY),
      V0 * TOSS_IN,
      V0,
    );
    s.passes.push(t);
    let v = V0;
    for (let k = 0; k < n; k++) {
      add(FALL, k, TWIN_UP, v, v * FALL_GAIN);
      s.hitAt.push(t);
      if (k === n - 1) break;
      const last = k === n - 2;
      const loft = last ? LAST_LOFT : LOFT;
      const out = Math.min(VMAX, v * GAIN * (last ? LAST_BOOST : 1));
      const bar = s.order[k];
      const ax = readX(s, bar);
      const ay = bars[bar].y;
      add(
        BOUNCE,
        k,
        swingLen(ax, ay, s.ringX, bounceTop(s, loft), s.ringX, s.ringY),
        v * FALL_GAIN,
        out,
        loft,
      );
      s.passes.push(t);
      v = out;
    }
    s.endMs = t;
    for (let k = 0; k < n - 1; k++) hit(s.order[k], s.hitAt[k]);
    hit(0, s.endMs, 1);
    s.runner = (ms) => {
      const legs = s.legs;
      if (ms < legs[0].startMs) return null;
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (ms > leg.startMs + leg.ms) continue;
        const u = clamp01((ms - leg.startMs) / leg.ms);
        return legAt(s, leg, run(leg.a0, u), spot);
      }
      return null;
    };
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    place(s, r, bars);
    const now = r.startedAt + ms;
    const n = s.order.length;
    // the number trembling harder as it shrinks, then gone into the wisp
    if (ms < DROP_MS) {
      const p = ms / DROP_MS;
      const shiver = TREMBLE * p;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        Math.sin(ms * 0.11) * shiver,
        Math.cos(ms * 0.13) * shiver,
        r.flashFont * lerp(1, SHRINK, p * p),
        { alpha: 1 - clamp01((ms - DROP_MS * 0.7) / (DROP_MS * 0.3)) },
      );
    }
    // a whoosh and a jolt at every pass, harder each, the slam's bang
    const passes = s.passes;
    while (r.kicked < passes.length && ms >= passes[r.kicked]) {
      r.shake(
        lerp(
          PASS_SHAKE[0],
          PASS_SHAKE[1],
          r.kicked / Math.max(1, passes.length - 1),
        ),
      );
      playSwoosh();
      r.kicked++;
    }
    if (r.kicked === passes.length && ms >= s.endMs) {
      playExplosion();
      r.kicked++;
    }
    let done = 0;
    let since = Infinity;
    for (let k = 0; k < passes.length; k++)
      if (ms >= passes[k]) {
        done++;
        since = ms - passes[k];
      }
    const flare = 1 + FLARE * (1 - clamp01(since / FLARE_MS));
    // the big ring, closing once the last drop has left it
    const highSize = HIGH * (1 + GROW * done) * flare;
    const highOpen =
      clamp01((ms - OPEN_AT) / OPEN_MS) *
      (1 - clamp01((ms - passes[passes.length - 1] - FLARE_MS) / CLOSE_MS));
    ring.x = s.ringX;
    ring.y = s.ringY;
    if (highOpen > 0)
      drawPortal(ctx, ring, highSize, highOpen, now, 1, HIGH_LOOK);
    for (let k = 0; k < passes.length; k++)
      drawPortalPass(ctx, ring, ms - passes[k], highSize);
    // the twin over the readout of the drop to come, hopping to the next one
    // as the wisp bounces off the last
    let k = 0;
    while (k < n - 1 && ms >= s.hitAt[k]) k++;
    twinAt(s, k, twin);
    let pop = 1;
    if (k > 0) {
      const hop = clamp01((ms - s.hitAt[k - 1]) / HOP_MS);
      const e = 1 - (1 - hop) * (1 - hop);
      twinAt(s, k - 1, pass);
      twin.x = lerp(pass.x, twin.x, e);
      twin.y = lerp(pass.y, twin.y, e);
      pop = lerp(HOP_POP, 1, e);
    }
    const twinSize = TWIN * (1 + TWIN_GROW * k) * flare;
    const twinOpen =
      pop *
      clamp01((ms - passes[0] + TWIN_LEAD) / TWIN_POP) *
      (1 - clamp01((ms - s.endMs - FLARE_MS) / CLOSE_MS));
    if (twinOpen > 0)
      drawPortal(ctx, twin, twinSize, twinOpen, now, 1, TWIN_LOOK);
    for (let j = 0; j < passes.length; j++) {
      const age = ms - passes[j];
      if (age < 0 || age > FLARE_MS * 2) continue;
      drawPortalPass(ctx, twinAt(s, j, pass), age, TWIN * (1 + TWIN_GROW * j));
    }
    // a cheap flash on each other bar's readout as it's hit
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let j = 0; j < n - 1; j++) {
      const age = ms - s.hitAt[j];
      if (age < 0 || age >= HIT_MS) continue;
      const bar = s.order[j];
      ctx.globalAlpha = 1 - age / HIT_MS;
      drawGlow(
        ctx,
        WHITE,
        readX(s, bar),
        bars[bar].y,
        HIT_GLOW * (1 + (j + 1) / n),
        HIT_SQUASH,
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    const u = clamp01((ms - DROP_MS) / (s.endMs - DROP_MS));
    drawWispBetween(
      ctx,
      s.runner,
      ms,
      now,
      WISP + WISP_GROW * u,
      u,
      DROP_MS,
      s.endMs,
    );
    spot.x = readX(s, 0);
    spot.y = bars[0].y;
    drawDetonation(ctx, spot, ms - s.endMs, END_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
