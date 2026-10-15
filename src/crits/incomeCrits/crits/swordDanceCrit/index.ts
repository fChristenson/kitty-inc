// Sword Dance, an income crit: the number shrinks away into a blade wisp that
// darts round the total in a whirling dance, slashing the air from every angle
// in 60-80ms swipes, quicker and quicker into a blur; each cut leaves a
// glowing slit hanging in the air that splits open, its edges sliding apart
// as coins and glitter pour out of it into the readout, a share and a flash
// each. The finale: the blade leaps high, trembling and glowing as light is
// pulled in, then comes down in two huge strokes crossing over the total, the
// cross splitting open in the huge blast as its glitter floods the readout
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import { drawSpinCoin, loadSpinCoin } from "../../../../shared/coinFlip";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

loadSpinCoin();

// the dance: CUTS cuts round a ring RING_RX by RING_RY about (0, CY), each
// STEP rad (give or take JITTER) on round from the last, the first at
// FIRST_MS, GAPS_MS apart and SWIPE_MS each (both closing), REACH px either
// side of its middle, turned off the ring's tangent by up to TILT rad
const CUTS = 12;
const CY = 30;
const RING_RX = 360;
const RING_RY = 165;
const STEP = 2.25;
const JITTER = 0.5;
const FIRST_MS = 120;
const GAPS_MS: [number, number] = [160, 45];
const SWIPE_MS: [number, number] = [80, 60];
const REACH: [number, number] = [95, 75];
const TILT = 0.9;
// the darts between cuts bowed out BOW of their length
const BOW = 0.35;
const BLADE = WISP_SIZE * 1.2;
const CUT_W = 18;
const SPILL = 16;
const SPILL_N = 10;
const FLASH = 110;
const FLASH_MS = 110;
// a slit: its edges sliding GAP apart over APART_MS, bulging OPEN in the
// middle, hanging SLIT_MS as they keep easing apart
const GAP = 7;
const OPEN = 9;
const APART_MS = 80;
const SLIT_MS = 420;
const SLIT_LINE = 3;
// the stream pouring out of a slit: STREAM_N bits STREAM_GAP_MS apart, every
// COIN_EVERY one a coin, spouting SPOUT px out of either edge, each crossing
// in STREAM_MS onto the readout and flashing LAND there
const STREAM_N = 9;
const STREAM_GAP_MS = 14;
const COIN_EVERY = 3;
const COIN_R = 15;
const COIN_SPIN = 0.03;
const SPOUT = 110;
const STREAM_MS = 230;
const SPECK = 17;
const LAND = 40;
const LAND_MS = 110;
// the leap: up to APEX over LEAP_MS, hanging HANG_MS trembling TREMBLE px and
// glowing GLOW as PULL_N specks are pulled in from PULL out
const APEX: Point = { x: 0, y: -230 };
const LEAP_MS = 170;
const HANG_MS = 230;
const TREMBLE: [number, number] = [2, 13];
const GLOW: [number, number] = [110, 290];
const PULL_N = 16;
const PULL = 260;
const PULL_RATE = 0.006;
const PULL_SPECK = 20;
// the cross: two strokes from the top corners CROSS_X either side and CROSS_Y
// over/under (0, CY), the blade darting DIVE_MS onto the first, CROSS_MS each,
// CROSS_GAP_MS between
const CROSS_X = 420;
const CROSS_Y = 200;
const DIVE_MS = 50;
const CROSS_MS = 75;
const CROSS_GAP_MS = 45;
const CROSS_W = 46;
const CROSS_GAP = 16;
const CROSS_OPEN = 26;
const CROSS_LINE = 6;
const FIN_SPILL = 28;
const FIN_SPILL_N = 20;
// the burst: the cross's edges flung FLING apart over BURST_MS, BURST_N bits
// BURST_GAP_MS apart pouring out of it onto the readout
const FLING = 260;
const BURST_MS = 300;
const BURST_FLASH = 300;
const BURST_N = 32;
const BURST_GAP_MS = 5;
// shakes by step: a cut, the cross
const SHAKES = [0.6, 3.2];

// a leg of the blade's flight from t0 to t1: a line a to b, a curve a via c
// to b, or (HANG) trembling at a
const LINE = 0;
const CURVE = 1;
const HANG = 2;
interface Leg {
  kind: number;
  t0: number;
  t1: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
}
// a stream of bits from fx/fy via cx/cy onto tx/ty
interface Stream {
  fx: Float32Array;
  fy: Float32Array;
  cx: Float32Array;
  cy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
}
interface State {
  cuts: Slash[];
  streams: Stream[];
  cross: Slash[];
  burst: Stream;
  hangAt: number;
  burstAt: number;
  at: (ms: number) => Point | null;
  swooshes: Float32Array;
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const blade: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };

function tremble(ms: number, hangAt: number): number {
  return lerp(TREMBLE[0], TREMBLE[1], clamp01((ms - hangAt) / HANG_MS));
}

// where the blade is at ms along its legs, into `into`
function bladeAt(
  legs: readonly Leg[],
  hangAt: number,
  ms: number,
  into: Point,
): Point | null {
  if (ms < 0) return null;
  let leg = legs[legs.length - 1];
  for (let i = 0; i < legs.length; i++)
    if (ms < legs[i].t1) {
      leg = legs[i];
      break;
    }
  const t = clamp01((ms - leg.t0) / (leg.t1 - leg.t0));
  if (leg.kind === HANG) {
    const amp = tremble(ms, hangAt);
    into.x = leg.ax + amp * Math.sin(ms * 0.11);
    into.y = leg.ay + amp * Math.cos(ms * 0.137);
  } else if (leg.kind === CURVE) {
    const v = 1 - t;
    into.x = v * v * leg.ax + 2 * t * v * leg.cx + t * t * leg.bx;
    into.y = v * v * leg.ay + 2 * t * v * leg.cy + t * t * leg.by;
  } else {
    into.x = leg.ax + (leg.bx - leg.ax) * t;
    into.y = leg.ay + (leg.by - leg.ay) * t;
  }
  return into;
}

function leg(
  kind: number,
  t0: number,
  t1: number,
  a: Point,
  b: Point,
  c: Point = b,
): Leg {
  return { kind, t0, t1, ax: a.x, ay: a.y, bx: b.x, by: b.y, cx: c.x, cy: c.y };
}

// a dart from a to b bowed out away from the ring's middle
function dart(t0: number, t1: number, a: Point, b: Point): Leg {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  let ox = mx;
  let oy = my - CY;
  let l = Math.hypot(ox, oy);
  if (l < 1) {
    ox = a.y - b.y;
    oy = b.x - a.x;
    l = Math.hypot(ox, oy) || 1;
  }
  const bow = (BOW * length) / l;
  return leg(CURVE, t0, t1, a, b, { x: mx + ox * bow, y: my + oy * bow });
}

// a stream of n bits out of the slit along `cut` (or `cuts`, alternating) onto
// spots across the readout
function planStream(cuts: readonly Slash[], n: number, salt: number): Stream {
  const s: Stream = {
    fx: new Float32Array(n),
    fy: new Float32Array(n),
    cx: new Float32Array(n),
    cy: new Float32Array(n),
    tx: new Float32Array(n),
    ty: new Float32Array(n),
  };
  for (let j = 0; j < n; j++) {
    const c = cuts[j % cuts.length];
    const v = 0.2 + 0.6 * hash01(j, salt);
    const side = j % 2 ? 1 : -1;
    const fx = c.from.x + (c.to.x - c.from.x) * v;
    const fy = c.from.y + (c.to.y - c.from.y) * v;
    const at = readoutSpot(ORIGIN, j, salt + 1);
    s.fx[j] = fx;
    s.fy[j] = fy;
    s.cx[j] = fx + c.n.x * side * SPOUT;
    s.cy[j] = fy + c.n.y * side * SPOUT;
    s.tx[j] = at.x;
    s.ty[j] = at.y;
  }
  return s;
}

// bit j of the stream `since` ms on, into `bit`: false before it's out or
// once it's landed
function streamAt(s: Stream, j: number, since: number): boolean {
  const t = since / STREAM_MS;
  if (t < 0 || t >= 1) return false;
  const u = t * (0.55 + 0.45 * t);
  const v = 1 - u;
  bit.x = v * v * s.fx[j] + 2 * u * v * s.cx[j] + u * u * s.tx[j];
  bit.y = v * v * s.fy[j] + 2 * u * v * s.cy[j] + u * u * s.ty[j];
  return true;
}

// the glitter bits of a stream and their landing flashes; in a light batch
function drawStreamGlitter(
  ctx: CanvasRenderingContext2D,
  s: Stream,
  since: number,
  gapMs: number,
  salt: number,
): void {
  const n = s.fx.length;
  for (let j = 0; j < n; j++) {
    const at = since - j * gapMs;
    if (at < 0) break;
    if (streamAt(s, j, at)) {
      if (j % COIN_EVERY === 0) continue;
      stampGlimmer(
        ctx,
        bit.x,
        bit.y,
        SPECK * (1 - (0.4 * at) / STREAM_MS),
        salt + j + at * 0.02,
        j % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    } else if (at >= STREAM_MS && at < STREAM_MS + LAND_MS) {
      stampGlimmer(
        ctx,
        s.tx[j],
        s.ty[j],
        LAND * (1 - (at - STREAM_MS) / LAND_MS),
        salt + j,
        j % 2 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
  }
}

// the coins of a stream
function drawStreamCoins(
  ctx: CanvasRenderingContext2D,
  s: Stream,
  since: number,
  gapMs: number,
): void {
  const n = s.fx.length;
  for (let j = 0; j < n; j += COIN_EVERY) {
    const at = since - j * gapMs;
    if (at < 0) break;
    if (streamAt(s, j, at))
      drawSpinCoin(ctx, bit.x, bit.y, COIN_R, 1, at * COIN_SPIN + j);
  }
}

// the slit a cut leaves: a glowing lens whose edges slide `gap` apart and
// bulge `open` in the middle, then `fling` more; strokes and fills under
// "lighter" with the caller's styles
function drawSlit(
  ctx: CanvasRenderingContext2D,
  cut: Slash,
  since: number,
  gap: number,
  open: number,
  fling: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  const apart = clamp01(since / APART_MS);
  const g = gap * apart * (1 + since / SLIT_MS) + fling;
  const o = open * apart;
  const { from: a, to: b, n } = cut;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  ctx.beginPath();
  ctx.moveTo(a.x + n.x * g, a.y + n.y * g);
  ctx.quadraticCurveTo(
    mx + n.x * (g + 2 * o),
    my + n.y * (g + 2 * o),
    b.x + n.x * g,
    b.y + n.y * g,
  );
  ctx.lineTo(b.x - n.x * g, b.y - n.y * g);
  ctx.quadraticCurveTo(
    mx - n.x * (g + 2 * o),
    my - n.y * (g + 2 * o),
    a.x - n.x * g,
    a.y - n.y * g,
  );
  ctx.closePath();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.stroke();
}

registerFloorCrit("swordDanceCrit", {
  plan(r, _bars, hit) {
    const cuts: Slash[] = [];
    const streams: Stream[] = [];
    const legs: Leg[] = [];
    const swooshes: number[] = [];
    let t = FIRST_MS;
    let angle = -Math.PI / 2 + hash01(1, 7100) * 2;
    let last: Point = { x: 0, y: 0 };
    let lastAt = 0;
    for (let i = 0; i < CUTS; i++) {
      const p = i / (CUTS - 1);
      const swipe = lerp(SWIPE_MS[0], SWIPE_MS[1], p);
      const reach = lerp(REACH[0], REACH[1], p);
      const mx = Math.cos(angle) * RING_RX;
      const my = CY + Math.sin(angle) * RING_RY;
      const a =
        angle +
        Math.PI / 2 +
        (hash01(i, 7101) - 0.5) * 2 * TILT +
        (i % 2 ? Math.PI : 0);
      const dx = Math.cos(a) * reach;
      const dy = Math.sin(a) * reach;
      const cut = planSlash(
        { x: mx - dx, y: my - dy },
        { x: mx + dx, y: my + dy },
        t,
        swipe,
      );
      legs.push(
        i === 0
          ? leg(LINE, lastAt, t, last, cut.from)
          : dart(lastAt, t, last, cut.from),
      );
      legs.push(leg(LINE, t, cut.endMs, cut.from, cut.to));
      cuts.push(cut);
      streams.push(planStream([cut], STREAM_N, 7110 + i * 20));
      swooshes.push(t);
      hit(0, cut.endMs, 0);
      last = cut.to;
      lastAt = cut.endMs;
      angle += STEP + (hash01(i, 7102) - 0.5) * 2 * JITTER;
      t += lerp(GAPS_MS[0], GAPS_MS[1], p * (2 - p));
    }
    // the leap, the hang, the two strokes of the cross
    const hangAt = lastAt + LEAP_MS;
    legs.push(
      leg(CURVE, lastAt, hangAt, last, APEX, { x: last.x * 0.3, y: APEX.y }),
    );
    legs.push(leg(HANG, hangAt, hangAt + HANG_MS, APEX, APEX));
    const firstAt = hangAt + HANG_MS + DIVE_MS;
    const first = planSlash(
      { x: -CROSS_X, y: CY - CROSS_Y },
      { x: CROSS_X, y: CY + CROSS_Y },
      firstAt,
      CROSS_MS,
    );
    const second = planSlash(
      { x: CROSS_X, y: CY - CROSS_Y },
      { x: -CROSS_X, y: CY + CROSS_Y },
      first.endMs + CROSS_GAP_MS,
      CROSS_MS,
    );
    legs.push(leg(LINE, hangAt + HANG_MS, firstAt, APEX, first.from));
    legs.push(leg(LINE, firstAt, first.endMs, first.from, first.to));
    legs.push(dart(first.endMs, second.startMs, first.to, second.from));
    legs.push(leg(LINE, second.startMs, second.endMs, second.from, second.to));
    swooshes.push(first.startMs, second.startMs);
    hit(0, second.endMs, 1);
    const cross = [first, second];
    const state: State = {
      cuts,
      streams,
      cross,
      burst: planStream(cross, BURST_N, 7400),
      hangAt,
      burstAt: second.endMs,
      at: (ms) => bladeAt(legs, hangAt, ms, blade),
      swooshes: Float32Array.from(swooshes),
      swooshed: 0,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    while (s.swooshed < s.swooshes.length && s.swooshes[s.swooshed] <= ms) {
      s.swooshed++;
      playSwoosh();
    }
    const now = r.startedAt + ms;
    const to = bars[0];
    const { cuts, streams, cross, hangAt, burstAt } = s;
    const burst = (ms - burstAt) / BURST_MS;
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);

    // the slits hanging in the air, splitting open; the cross flung apart
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = COLOR.heavenlyGold;
    ctx.strokeStyle = COLOR.white;
    ctx.lineJoin = "round";
    ctx.lineWidth = SLIT_LINE;
    for (let i = 0; i < cuts.length; i++) {
      const since = ms - cuts[i].endMs;
      if (since < 0 || since >= SLIT_MS) continue;
      const f = since / SLIT_MS;
      drawSlit(ctx, cuts[i], since, GAP, OPEN, 0, 1 - f * f);
    }
    if (burst < 1) {
      ctx.lineWidth = CROSS_LINE;
      const fling = burst > 0 ? FLING * burst * (0.6 + 0.4 * burst) : 0;
      const alpha = burst > 0 ? 1 - burst * burst : 1;
      for (let i = 0; i < cross.length; i++) {
        const since = ms - cross[i].endMs;
        if (since >= 0)
          drawSlit(ctx, cross[i], since, CROSS_GAP, CROSS_OPEN, fling, alpha);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    for (let i = 0; i < cuts.length; i++)
      drawSlash(ctx, cuts[i], ms, CUT_W, now);
    drawSlash(ctx, cross[0], ms, CROSS_W, now);
    drawSlash(ctx, cross[1], ms, CROSS_W, now);
    for (let i = 0; i < cuts.length; i++)
      drawSliceSpill(ctx, cuts[i], ms, SPILL, SPILL_N);
    drawSliceSpill(ctx, cross[0], ms, FIN_SPILL, FIN_SPILL_N);
    drawSliceSpill(ctx, cross[1], ms, FIN_SPILL, FIN_SPILL_N);

    // cut flashes, the streams' glitter, the charge at the top, the burst
    const streamLife = STREAM_MS + LAND_MS + STREAM_N * STREAM_GAP_MS;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      const since = ms - c.endMs;
      if (since < 0 || since > streamLife) continue;
      if (since < FLASH_MS)
        stampGlimmer(
          ctx,
          (c.from.x + c.to.x) / 2,
          (c.from.y + c.to.y) / 2,
          FLASH * (1 - since / FLASH_MS),
          i,
          COLOR.white,
        );
      drawStreamGlitter(ctx, streams[i], since, STREAM_GAP_MS, i * 20);
    }
    const charge = clamp01((ms - hangAt) / HANG_MS);
    if (charge > 0 && ms < cross[0].startMs) {
      stampGlimmer(
        ctx,
        APEX.x,
        APEX.y,
        lerp(GLOW[0], GLOW[1], charge * charge),
        ms * 0.004,
        COLOR.heavenlyGold,
      );
      for (let j = 0; j < PULL_N; j++) {
        const p = ((ms - hangAt) * PULL_RATE + hash01(j, 7200)) % 1;
        const a = hash01(j, 7201) * Math.PI * 2 + p * 1.5;
        const d = PULL * (1 - p) ** 1.5;
        stampGlimmer(
          ctx,
          APEX.x + Math.cos(a) * d,
          APEX.y + Math.sin(a) * d,
          PULL_SPECK * (1 - 0.5 * p),
          j,
          j % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    if (burst >= 0 && burst < 1)
      stampGlimmer(ctx, 0, CY, BURST_FLASH * (1 - burst), 0, COLOR.white);
    const burstSince = ms - burstAt;
    if (burstSince >= 0)
      drawStreamGlitter(ctx, s.burst, burstSince, BURST_GAP_MS, 500);
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    for (let i = 0; i < cuts.length; i++) {
      const since = ms - cuts[i].endMs;
      if (since >= 0 && since <= streamLife)
        drawStreamCoins(ctx, streams[i], since, STREAM_GAP_MS);
    }
    if (burstSince >= 0)
      drawStreamCoins(ctx, s.burst, burstSince, BURST_GAP_MS);

    // the blade, hotter as the dance quickens
    drawWispBetween(
      ctx,
      s.at,
      ms,
      now,
      BLADE,
      clamp01(ms / hangAt + charge),
      0,
      burstAt,
    );
    ctx.restore();
    drawFinale(ctx, to, burstSince, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
