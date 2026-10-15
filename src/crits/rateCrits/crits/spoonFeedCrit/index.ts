// Spoon Feed, a rate crit: the number shrinks into a wisp that swoops down
// the building leading a river of coins and bills that streams out of it,
// thicker and thicker; over each bar's readout it dips like a spoon and a
// gulp of the river pours down into it, the readout swelling and trembling
// as it swallows, then turning over in a blast; quicker each, the river
// fatter each; over its own it circles once, the readout glowing hotter,
// and dives in, the whole river crashing in after it for the biggest blast:
// each bar runs faster and pays more for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// each readout READOUT of a bar's half width out; the wisp feeds it from LIP
// px over it, dipping DIP px down for HOLD_MS (quickening); FLY_MS from one
// to the next (quickening), bowed SWING px out to alternate sides
const READOUT = 0.6;
const LIP = 90;
const DIP = 34;
const HOLD_MS: [number, number] = [80, 40];
const FLY_MS: [number, number] = [170, 95];
const SWING = 170;
// a gulp: its coins leaving the river head first over POUR_SPREAD_MS, each
// down into the readout in POUR_MS (both quickening), shrinking to SWALLOW
const POUR_SPREAD_MS: [number, number] = [150, 80];
const POUR_MS: [number, number] = [150, 110];
const SWALLOW = 0.35;
// its own: one loop LOOP_X px round its readout in CIRCLE_MS, then a dive
const LOOP_X = 150;
const CIRCLE_MS = 280;
const DIVE_MS = 90;
// the river: COINS of them, OWN_SHARE saved for its own; each pops out of
// the wisp and falls back up to RIVER_MS behind it at FALL ms a ms; SPREAD px
// round its path, THICK times that and GROW times as big by the end
const COINS = 260;
const OWN_SHARE = 0.45;
const RIVER_MS = 220;
const FALL = 0.7;
const SPREAD = 22;
const THICK = 2.2;
const COIN = 22;
const GROW = 1.3;
const COIN_SPIN = 0.03;
const WISP = WISP_SIZE * 1.4;
const GLOW = 170;
const OWN_GLOW = 320;
const TREMBLE = 10;
const OWN_TREMBLE = 20;
const BLAST = 180;
const DIVE_BLAST = 160;
const OWN_BLAST = 440;
// shakes by step: a spoon's arrival or the dive, a gulp, its own
const SHAKES = [0.5, 1.2, 3.2];

const FLY = 0;
const HOLD = 1;
const CIRCLE = 2;
const DIVE = 3;
interface Leg {
  kind: number;
  start: number;
  end: number;
  // the bars it runs from and to (-1: the flash's middle), and the heights
  // off their readouts
  fromBar: number;
  fromDy: number;
  toBar: number;
  toDy: number;
  side: number;
}
interface Plan {
  legs: Leg[];
  pathEnd: number;
  // each feed: its bar, when the wisp gets over it, its gulp starts, its
  // coins take to pour in, and it turns over
  bars: Uint8Array;
  arrives: Float32Array;
  pourAt: Float32Array;
  pourMs: Float32Array;
  hitAt: Float32Array;
  ownFeed: number;
  // each coin: its feed, when it pops out, how far back it falls, when its
  // gulp takes it (after its feed's pourAt), and where in the river it runs
  feedOf: Uint8Array;
  births: Float32Array;
  lags: Float32Array;
  staggers: Float32Array;
  offX: Float32Array;
  offY: Float32Array;
  sprites: CoinBurstSprite[];
}
const plans = new WeakMap<Running, Plan>();
let frameBars: Point[] = [];
let half = 0;
let current: Plan | null = null;
const at: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const readout: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// a fed bar: speed times as fast and paying payout times as much till then
const fed = defineBarEffect<number>({
  speed: () => meta.values.speed,
  payout: () => meta.values.payout,
  ended: (until, now) => now >= until,
});

// bar's readout dy px down (-1: the flash's middle), into out
function spotOf(bar: number, dy: number, out: Point): void {
  if (bar < 0) {
    out.x = 0;
    out.y = 0;
    return;
  }
  out.x = frameBars[bar].x + half * READOUT;
  out.y = frameBars[bar].y + dy;
}

// the wisp at ms: a pure function of ms, so its trail and river follow it
function pathAt(ms: number): Point {
  const { legs, pathEnd } = current!;
  const t = Math.max(IN_MS, Math.min(pathEnd, ms));
  let lo = 0;
  let hi = legs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (legs[mid].end <= t) lo = mid + 1;
    else hi = mid;
  }
  const leg = legs[lo];
  const u = clamp01((t - leg.start) / (leg.end - leg.start || 1));
  if (leg.kind === FLY) {
    spotOf(leg.fromBar, leg.fromDy, a);
    spotOf(leg.toBar, leg.toDy, b);
    const cx = (a.x + b.x) / 2 + leg.side * SWING;
    const cy = (a.y + b.y) / 2;
    const v = 1 - u;
    at.x = v * v * a.x + 2 * v * u * cx + u * u * b.x;
    at.y = v * v * a.y + 2 * v * u * cy + u * u * b.y;
    return at;
  }
  spotOf(leg.toBar, 0, b);
  if (leg.kind === HOLD) {
    at.x = b.x;
    at.y = b.y + leg.toDy + DIP * Math.sin(Math.PI * u);
  } else if (leg.kind === CIRCLE) {
    const angle = Math.PI * 2 * u;
    at.x = b.x + Math.sin(angle) * LOOP_X;
    at.y = b.y - Math.cos(angle) * LIP;
  } else {
    at.x = b.x;
    at.y = b.y - LIP * (1 - u * u);
  }
  return at;
}

const wispAt = (ms: number): Point | null => (ms < IN_MS ? null : pathAt(ms));

// how far behind the wisp coin i runs at ms
const lagAt = (p: Plan, i: number, ms: number): number =>
  Math.min(p.lags[i], (ms - p.births[i]) * FALL);

registerFloorCrit("spoonFeedCrit", {
  reward(t) {
    t.flipRate();
    fed.set(t.floor, t.now + (t.own ? meta.values.ownMs : meta.values.ms));
    t.punch(`x${meta.values.speed} Speed & Pay`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const feeds = order.length;
    const ownFeed = feeds - 1;
    const legs: Leg[] = [];
    const arrives = new Float32Array(feeds);
    const pourAt = new Float32Array(feeds);
    const pourMs = new Float32Array(feeds);
    const hitAt = new Float32Array(feeds);
    const legStarts = new Float32Array(feeds);
    let t = IN_MS;
    let fromBar = -1;
    let fromDy = 0;
    order.forEach((bar, k) => {
      const q = k / Math.max(1, ownFeed - 1);
      const fly = lerp(FLY_MS[0], FLY_MS[1], Math.min(1, q));
      legStarts[k] = t;
      legs.push({
        kind: FLY,
        start: t,
        end: t + fly,
        fromBar,
        fromDy,
        toBar: bar,
        toDy: -LIP,
        side: k % 2 === 0 ? 1 : -1,
      });
      t += fly;
      arrives[k] = t;
      // the readout jolting as the spoon gets over it
      hit(bar, t, 0);
      if (k === ownFeed) {
        legs.push({
          kind: CIRCLE,
          start: t,
          end: t + CIRCLE_MS,
          fromBar: bar,
          fromDy: -LIP,
          toBar: bar,
          toDy: -LIP,
          side: 1,
        });
        t += CIRCLE_MS;
        legs.push({
          kind: DIVE,
          start: t,
          end: t + DIVE_MS,
          fromBar: bar,
          fromDy: -LIP,
          toBar: bar,
          toDy: 0,
          side: 1,
        });
        t += DIVE_MS;
        hit(bar, t, 0);
        return;
      }
      const hold = lerp(HOLD_MS[0], HOLD_MS[1], q);
      legs.push({
        kind: HOLD,
        start: t,
        end: t + hold,
        fromBar: bar,
        fromDy: -LIP,
        toBar: bar,
        toDy: -LIP,
        side: 1,
      });
      pourAt[k] = t;
      pourMs[k] = lerp(POUR_MS[0], POUR_MS[1], q);
      hitAt[k] = t + lerp(POUR_SPREAD_MS[0], POUR_SPREAD_MS[1], q) + pourMs[k];
      hit(bar, hitAt[k], 1);
      t += hold;
      fromBar = bar;
      fromDy = -LIP;
    });
    const pathEnd = t;
    // the coins: a growing gulp for each bar, the rest for its own
    const own = feeds > 1 ? Math.round(COINS * OWN_SHARE) : COINS;
    const counts = new Uint16Array(feeds);
    let weights = 0;
    for (let k = 0; k < ownFeed; k++) weights += 1 + 0.6 * k;
    let given = 0;
    for (let k = 0; k < ownFeed; k++) {
      counts[k] = Math.round(((COINS - own) * (1 + 0.6 * k)) / weights);
      given += counts[k];
    }
    counts[ownFeed] = COINS - given;
    const feedOf = new Uint8Array(COINS);
    const births = new Float32Array(COINS);
    const lags = new Float32Array(COINS);
    const staggers = new Float32Array(COINS);
    let i = 0;
    let ownHit = pathEnd + 60;
    for (let k = 0; k < feeds; k++) {
      const isOwn = k === ownFeed;
      // its own's pour out all the way down, a bar's on the way to it
      const from = isOwn ? IN_MS : legStarts[k];
      const to = arrives[k] - (isOwn ? 0 : 30);
      const spread = isOwn ? 0 : hitAt[k] - pourMs[k] - pourAt[k];
      for (let j = 0; j < counts[k]; j++, i++) {
        feedOf[i] = k;
        births[i] = lerp(from, to, j / counts[k]);
        lags[i] = RIVER_MS * holeHash(i, 9120);
        staggers[i] = (lags[i] / RIVER_MS) * spread;
        if (!isOwn) continue;
        // when it reaches the end of the wisp's path, still falling back or not
        const settled = births[i] + lags[i] / FALL;
        const arrival =
          settled - lags[i] >= pathEnd
            ? (pathEnd - FALL * births[i]) / (1 - FALL)
            : pathEnd + lags[i];
        if (arrival > ownHit) ownHit = arrival;
      }
    }
    hitAt[ownFeed] = ownHit;
    pourAt[ownFeed] = arrives[ownFeed];
    hit(0, ownHit, 2);
    plans.set(r, {
      legs,
      pathEnd,
      bars: Uint8Array.from(order),
      arrives,
      pourAt,
      pourMs,
      hitAt,
      ownFeed,
      feedOf,
      births,
      lags,
      staggers,
      offX: Float32Array.from(
        { length: COINS },
        (_, n) => (holeHash(n, 9121) * 2 - 1) * SPREAD,
      ),
      offY: Float32Array.from(
        { length: COINS },
        (_, n) => (holeHash(n, 9122) * 2 - 1) * SPREAD,
      ),
      sprites: Array.from({ length: COINS }, (_, n) => ({
        kind: n % 5 === 0 ? "bill" : "coin",
        spinFrame: 0,
        axisAngle: (holeHash(n, 9123) - 0.5) * Math.PI,
      })),
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    frameBars = bars;
    half = r.play.barHalfWidth;
    current = plan;
    const { pathEnd, arrives, pourAt, pourMs, hitAt, ownFeed } = plan;
    const { feedOf, births, staggers, offX, offY, sprites } = plan;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.6 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    // a whoosh as the spoon swoops in over each readout
    while (r.kicked < arrives.length && ms >= arrives[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    // each readout swelling and trembling as it swallows its gulp
    for (let k = 0; k < arrives.length; k++) {
      const start = pourAt[k];
      if (ms < start || ms >= hitAt[k]) continue;
      const c = clamp01((ms - start) / (hitAt[k] - start));
      const own = k === ownFeed;
      spotOf(plan.bars[k], 0, readout);
      trembleAt(c, ms, own ? OWN_TREMBLE : TREMBLE, shiver);
      shiver.x += readout.x;
      shiver.y += readout.y;
      drawChargeGlow(ctx, shiver, c, own ? OWN_GLOW : GLOW, now);
    }
    // the river streaming behind the wisp, each gulp pouring down out of it
    const span = pathEnd - IN_MS;
    const transform = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < COINS; i++) {
      if (ms < births[i]) continue;
      const k = feedOf[i];
      const pourStart = pourAt[k] + staggers[i];
      let x: number;
      let y: number;
      let size: number;
      if (k === ownFeed || ms < pourStart) {
        const tau = ms - lagAt(plan, i, ms);
        if (tau >= pathEnd) continue;
        const grown = clamp01((tau - IN_MS) / span);
        // squeezed into its own readout as the wisp dives in
        const squeeze = clamp01((pathEnd - tau) / DIVE_MS);
        const thick = lerp(1, THICK, grown) * squeeze;
        const p = pathAt(tau);
        x = p.x + offX[i] * thick;
        y = p.y + offY[i] * thick;
        size = COIN * lerp(1, GROW, grown);
      } else {
        const u = (ms - pourStart) / pourMs[k];
        if (u >= 1) continue;
        const tau = pourStart - lagAt(plan, i, pourStart);
        const grown = clamp01((tau - IN_MS) / span);
        const thick = lerp(1, THICK, grown);
        const p = pathAt(tau);
        const fromX = p.x + offX[i] * thick;
        const fromY = p.y + offY[i] * thick;
        spotOf(plan.bars[k], 0, readout);
        // gulped: quickening into the readout and shrinking away
        const e = u * (0.5 + 0.5 * u);
        x = lerp(fromX, readout.x, e);
        y = lerp(fromY, readout.y, e);
        size = COIN * lerp(1, GROW, grown) * lerp(1, SWALLOW, e);
      }
      sprites[i].spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(ctx, sprites[i], x, y, size, transform);
    }
    endCoinBatch(ctx);
    drawWispBetween(
      ctx,
      wispAt,
      ms,
      now,
      WISP,
      clamp01((ms - arrives[ownFeed]) / (pathEnd - arrives[ownFeed])),
      IN_MS,
      pathEnd,
    );
    for (let k = 0; k < arrives.length; k++) {
      const own = k === ownFeed;
      spotOf(plan.bars[k], 0, readout);
      drawDetonation(ctx, readout, ms - hitAt[k], own ? OWN_BLAST : BLAST, now);
      if (own) drawDetonation(ctx, readout, ms - pathEnd, DIVE_BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
