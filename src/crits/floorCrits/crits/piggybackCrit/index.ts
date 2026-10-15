// Piggyback, a floor crit: a stack of wisps riding piggyback down the bars.
// A wisp sits on every bar's readout; the number trembles into a wisp that
// hops onto the top bar's wisp's back (a bump, a flash), and the pair leaps
// down onto the next bar's wisp, which climbs on underneath: the stack
// taller, wobblier and quicker with every leap, squashing on each landing.
// On its own bar the tall tower teeters and topples, and every wisp crashes
// down into the bar one after another, the top one in the biggest blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";

// the number trembling and shrinking into the first wisp
const IN_MS = 160;
const TREMBLE = 12;
const SHRINK = 0.3;
// the waiting wisps popping in, sitting HOVER over each readout (READ in
// from the bar's right end), quivering as the stack closes in
const POP_MS = 150;
const READ = 110;
const HOVER = 60;
const ANTICIPATE_MS = 110;
const QUIVER = 7;
// at most this many bars ridden before its own; each leap quicker, arcing
// ARC plus ARC_REACH of its width over, a CROUCH_MS squat between leaps
const MAX_CHAIN = 6;
const LEG_MS: [number, number] = [200, 85];
const CROUCH_MS = 30;
const ARC = 110;
const ARC_REACH = 0.2;
// the stack: wisps GAP apart, stretched mid-leap, squashed on landing
const GAP = 44;
const STRETCH = 0.25;
const SQUASH = 0.35;
const SQUASH_MS = 90;
const NUMBER_SIZE = 1.2;
// its sway (radians): a wobble per wisp, a landing kick per wisp, a lean
// back against the leap; the column bends, its top swinging the most
const WOB = 0.02;
const WOB_FREQ = 0.018;
const KICK = 0.035;
const KICK_DECAY = 140;
const KICK_FREQ = 0.045;
const LEAN = 0.25;
const BEND = 0.6;
// the topple: teetering in swings growing to TEETER_AMP, then falling over
// FALL_MS to THETA_END towards the bar's middle; each wisp, bottom first,
// peels off PEEL_GAP after the last and crashes down into the bar
const TEETER_MS = 170;
const TEETER_AMP = 0.35;
const FALL_MS = 200;
const THETA_END = 1.3;
const PEEL0 = 70;
const PEEL_GAP = 32;
const CRASH_MS = 60;
const EDGE = 40;
// flashes and blasts
const FLASH_MS = 140;
const HOP_FLASH: [number, number] = [150, 250];
const CRASH_FLASH: [number, number] = [140, 230];
const LAND_BLAST = 170;
const LAND_FLASH = 260;
const BOOM = 440;
const BOOM_FLASH = 420;
const KICKED_BOOM = 1e6;
// shakes by step: a crash, the slam, then the landings (HOP_STEP + k) rising
const CRASH_SHAKE = 0.6;
const SLAM_SHAKE = 3.2;
const HOP_SHAKE: [number, number] = [0.5, 1.6];
const HOP_STEP = 2;
const TAIL_MS = 1000;

const WHITE = glowStops(COLOR.white);
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

interface Pile {
  // the bars ridden, top to bottom (not its own)
  chain: number[];
  n: number;
  // wisps in the final stack: the number, the chain's, its own bar's
  m: number;
  // leap k (onto chain[k], or its own bar for k = n)
  legStart: number[];
  legMs: number[];
  landAt: number[];
  fallAt: number;
  // by height in the final stack
  peelAt: number[];
  crashAt: number[];
  boomAt: number;
  // this frame: the waiting spots (its own last), each height's crash spot
  w: Point[];
  drop: Point[];
  base: Point;
  peel: Point;
  outs: Point[];
  // by wisp: 0 the number, i the wisp of leap i - 1's bar
  movers: ((ms: number) => Point | null)[];
}
const piles = new WeakMap<Running, Pile>();

// set by baseAt for the call in progress: the leap's 0..1 (-1 at rest) and
// its sideways heading
let flightU = -1;
let flightDir = 0;

function place(p: Pile, r: Running, bars: Point[]): void {
  const half = r.play.barHalfWidth;
  const reach = half - READ;
  for (let k = 0; k <= p.n; k++) {
    const bar = bars[k < p.n ? p.chain[k] : 0];
    p.w[k].x = bar.x + reach;
    p.w[k].y = bar.y - HOVER;
  }
  const own = bars[0];
  const top = p.m > 1 ? p.m - 1 : 1;
  for (let h = 0; h < p.m; h++) {
    const phi = -THETA_END * (BEND + (1 - BEND) * (h / top));
    const x = p.w[p.n].x + Math.sin(phi) * h * GAP;
    p.drop[h].x = Math.max(
      own.x - half + EDGE,
      Math.min(own.x + half - EDGE, x),
    );
    p.drop[h].y = own.y;
  }
}

// the last leap landed by ms (-1 before the first)
function stage(p: Pile, ms: number): number {
  let s = -1;
  while (s < p.n && ms >= p.landAt[s + 1]) s++;
  return s;
}

// the stack's bottom after landing s: at rest on w[s], or mid-leap onto the
// next bar's wisp's back
function baseAt(p: Pile, s: number, ms: number): Point {
  const out = p.base;
  flightU = -1;
  flightDir = 0;
  const next = s + 1;
  if (next > p.n || ms < p.legStart[next]) {
    out.x = p.w[s].x;
    out.y = p.w[s].y;
    return out;
  }
  const a = s >= 0 ? p.w[s] : ORIGIN;
  const b = p.w[next];
  const u = clamp01((ms - p.legStart[next]) / p.legMs[next]);
  const dx = b.x - a.x;
  const by = b.y - GAP;
  out.x = a.x + dx * u;
  out.y = lerp(a.y, by, u) - 4 * u * (1 - u) * (ARC + Math.abs(dx) * ARC_REACH);
  flightU = u;
  flightDir = dx >= 0 ? 1 : -1;
  return out;
}

// the stack's sway after landing s, m wisps high (call after baseAt)
function theta(p: Pile, s: number, m: number, ms: number): number {
  if (s === p.n) {
    if (ms < p.fallAt) {
      const u = (ms - p.landAt[s]) / TEETER_MS;
      return TEETER_AMP * u * Math.sin(3 * Math.PI * u);
    }
    const v = Math.min(1, (ms - p.fallAt) / FALL_MS);
    return -THETA_END * v * v;
  }
  let th = WOB * (m - 1) * Math.sin(ms * WOB_FREQ);
  if (s >= 0) {
    const t = ms - p.landAt[s];
    th += KICK * m * Math.exp(-t / KICK_DECAY) * Math.sin(t * KICK_FREQ);
  }
  if (flightU >= 0) th -= flightDir * LEAN * Math.sin(Math.PI * flightU);
  return th;
}

function spacing(p: Pile, s: number, ms: number): number {
  if (flightU >= 0) return GAP * (1 + STRETCH * Math.sin(Math.PI * flightU));
  if (s < 0) return GAP;
  const c = (ms - p.landAt[s]) / SQUASH_MS;
  return c < 1 ? GAP * (1 - SQUASH * Math.sin(Math.PI * c)) : GAP;
}

// height h in the stack after landing s
function columnAt(
  p: Pile,
  s: number,
  h: number,
  ms: number,
  out: Point,
): Point {
  const m = s < 0 ? 1 : s + 2;
  const base = baseAt(p, s, ms);
  const th = theta(p, s, m, ms);
  const gap = spacing(p, s, ms);
  const phi = th * (BEND + (1 - BEND) * (m > 1 ? h / (m - 1) : 0));
  out.x = base.x + Math.sin(phi) * h * gap;
  out.y = base.y - Math.cos(phi) * h * gap;
  return out;
}

// a waiting wisp, quivering harder as the stack closes in
function waiting(
  at: Point,
  until: number,
  ms: number,
  seed: number,
  out: Point,
): Point {
  const a = clamp01(1 - (until - ms) / ANTICIPATE_MS);
  const q = QUIVER * a * a;
  out.x = at.x + Math.sin(ms * 0.9 + seed * 7) * q;
  out.y = at.y + Math.cos(ms * 1.1 + seed * 3) * q;
  return out;
}

function memberAt(p: Pile, i: number, ms: number): Point | null {
  const out = p.outs[i];
  if (i === 0 && ms < IN_MS) return null;
  if (i > 0 && ms < p.landAt[i - 1])
    return waiting(p.w[i - 1], p.landAt[i - 1], ms, i, out);
  const s = stage(p, ms);
  const h = s < 0 ? 0 : s + 1 - i;
  if (s === p.n) {
    if (ms >= p.crashAt[h]) return null;
    const peel = p.peelAt[h];
    if (ms >= peel) {
      const from = columnAt(p, s, h, peel, p.peel);
      const u = (ms - peel) / CRASH_MS;
      const g = u * u;
      out.x = lerp(from.x, p.drop[h].x, g);
      out.y = lerp(from.y, p.drop[h].y, g);
      return out;
    }
  }
  return columnAt(p, s, h, ms, out);
}

function planPile(r: Running, bars: Point[]): Pile {
  const chain = byHeight(bars)
    .filter((bar) => bar !== 0)
    .slice(0, MAX_CHAIN);
  const n = chain.length;
  const m = n + 2;
  const legStart: number[] = [];
  const legMs: number[] = [];
  const landAt: number[] = [];
  let t = IN_MS;
  for (let k = 0; k <= n; k++) {
    if (k) t += CROUCH_MS;
    const d = lerp(LEG_MS[0], LEG_MS[1], n ? k / n : 0);
    legStart.push(t);
    legMs.push(d);
    t += d;
    landAt.push(t);
  }
  const fallAt = t + TEETER_MS;
  const peelAt: number[] = [];
  const crashAt: number[] = [];
  for (let h = 0; h < m; h++) {
    peelAt.push(fallAt + PEEL0 + h * PEEL_GAP);
    crashAt.push(peelAt[h] + CRASH_MS);
  }
  const point = (): Point => ({ x: 0, y: 0 });
  const p: Pile = {
    chain,
    n,
    m,
    legStart,
    legMs,
    landAt,
    fallAt,
    peelAt,
    crashAt,
    boomAt: crashAt[m - 1],
    w: Array.from({ length: n + 1 }, point),
    drop: Array.from({ length: m }, point),
    base: point(),
    peel: point(),
    outs: Array.from({ length: m }, point),
    movers: [],
  };
  for (let i = 0; i < m; i++) p.movers.push((ms) => memberAt(p, i, ms));
  place(p, r, bars);
  return p;
}

registerFloorCrit("piggybackCrit", {
  plan(r, bars, hit) {
    const p = planPile(r, bars);
    piles.set(r, p);
    for (let k = 0; k < p.n; k++) hit(p.chain[k], p.landAt[k], HOP_STEP + k);
    hit(0, p.landAt[p.n], HOP_STEP + p.n);
    for (let h = 0; h < p.m - 1; h++) hit(0, p.crashAt[h], 0);
    hit(0, p.boomAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const p = piles.get(r);
    if (!p) return;
    place(p, r, bars);
    const now = r.startedAt + ms;
    const n = p.n;
    const m = p.m;

    // the number trembling harder as it shrinks into the first wisp
    if (ms < IN_MS) {
      const q = ms / IN_MS;
      const shiver = TREMBLE * q;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        Math.sin(ms * 0.11) * shiver,
        Math.cos(ms * 0.13) * shiver,
        r.flashFont * lerp(1, SHRINK, q * q),
        { alpha: 1 - clamp01((q - 0.7) / 0.3) },
      );
    }
    // a swoosh each leap, the bang on the slam
    while (r.kicked <= n && ms >= p.legStart[r.kicked]) {
      r.kicked++;
      playSwoosh();
    }
    if (ms >= p.boomAt && r.kicked < KICKED_BOOM) {
      r.kicked = KICKED_BOOM;
      playExplosion();
    }

    // flashes: each landing's bump, each crash, the slam
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k <= n; k++) {
      const age = ms - p.landAt[k];
      if (age < 0 || age >= FLASH_MS) continue;
      ctx.globalAlpha = 1 - age / FLASH_MS;
      spot.x = p.w[k].x;
      spot.y = p.w[k].y - GAP * 0.5;
      const radius =
        k === n
          ? LAND_FLASH
          : lerp(HOP_FLASH[0], HOP_FLASH[1], n > 1 ? k / (n - 1) : 0);
      drawGlow(ctx, WHITE, spot.x, spot.y, radius);
    }
    for (let h = 0; h < m - 1; h++) {
      const age = ms - p.crashAt[h];
      if (age < 0 || age >= FLASH_MS) continue;
      ctx.globalAlpha = 1 - age / FLASH_MS;
      const radius = lerp(CRASH_FLASH[0], CRASH_FLASH[1], h / (m - 1));
      drawGlow(ctx, WHITE, p.drop[h].x, p.drop[h].y, radius);
    }
    const boomAge = ms - p.boomAt;
    if (boomAge >= 0 && boomAge < FLASH_MS * 2) {
      ctx.globalAlpha = 1 - boomAge / (FLASH_MS * 2);
      drawGlow(ctx, WHITE, p.drop[m - 1].x, p.drop[m - 1].y, BOOM_FLASH);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    // the wisps: waiting on their readouts, then riding the stack, hotter
    // the taller it grows, white-hot as they crash
    const pop = clamp01(ms / POP_MS);
    const s = stage(p, ms);
    const stackHeat = s < 0 ? 0.3 : Math.min(1, 0.25 + 0.1 * (s + 2));
    for (let i = 0; i < m; i++) {
      const joined = i === 0 ? ms >= IN_MS : ms >= p.landAt[i - 1];
      const h = m - 1 - i;
      const heat = !joined
        ? clamp01(1 - (p.landAt[i - 1] - ms) / ANTICIPATE_MS)
        : ms >= p.peelAt[h]
          ? 1
          : stackHeat;
      drawWispBetween(
        ctx,
        p.movers[i],
        ms,
        now,
        WISP_SIZE * (i === 0 ? NUMBER_SIZE : pop),
        heat,
        i === 0 ? IN_MS : 0,
        p.crashAt[h],
      );
    }

    // the blasts: the stack landing on its own bar, the top wisp's slam
    drawDetonation(ctx, p.w[n], ms - p.landAt[n], LAND_BLAST, now);
    drawDetonation(ctx, p.drop[m - 1], boomAge, BOOM, now);
  },
  tailMs: TAIL_MS,
  shake: (step) =>
    step === 1
      ? SLAM_SHAKE
      : step === 0
        ? CRASH_SHAKE
        : lerp(
            HOP_SHAKE[0],
            HOP_SHAKE[1],
            clamp01((step - HOP_STEP) / MAX_CHAIN),
          ),
});
