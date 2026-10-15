// swarms for events and crits: a big flock of glitter specks (and a few
// lead wisps) moving as one mass round a centre that travels a path, each
// member trailing it a little, wheeling round it faster and faster, the
// flock spreading and packing as it goes; members peel off and dive onto
// targets in waves, or all at once. Plan it once (planSwarm with a path for
// its centre and how spread it is), plan the dives (planDives), then each
// frame drawSwarm for the flock and drawDives for the members diving, and
// place a lead wisp with swarmAt
import { COLOR } from "../../../palette";
import { clamp01, lerp, type Range } from "../../easing";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { hash01, stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

const TAU = Math.PI * 2;
// a member's own wheel speed varies this much either way, and it flutters
// FLUTTER of the spread in and out
const WHEEL_JITTER = 0.35;
const FLUTTER = 0.18;
const FLUTTER_RATE = 0.006;
// a diving member bows DIVE_BOW of its way off the straight line
const DIVE_BOW = 0.25;

// a key in a swarm's path or spread: at ms, (x, y) or a radius r
export interface SwarmKey {
  ms: number;
  x?: number;
  y?: number;
  r?: number;
}

// the key before ms and how far (eased) it is to the next
function keyAt(keys: readonly SwarmKey[], ms: number): [number, number] {
  let k = 0;
  while (k < keys.length - 1 && ms >= keys[k + 1].ms) k++;
  const next = keys[Math.min(k + 1, keys.length - 1)];
  const span = next.ms - keys[k].ms;
  const u = span > 0 ? clamp01((ms - keys[k].ms) / span) : 1;
  return [k, u * u * (3 - 2 * u)];
}

// a centre path gliding key to key (x, y), offset by `base()` each frame
// (a target that scrolls); held at its ends
export function swarmPath(
  keys: readonly SwarmKey[],
  base?: () => Point,
): (ms: number, into: Point) => Point {
  return (ms, into) => {
    const [k, u] = keyAt(keys, ms);
    const a = keys[k];
    const b = keys[Math.min(k + 1, keys.length - 1)];
    const o = base?.();
    into.x = (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * u + (o?.x ?? 0);
    into.y = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * u + (o?.y ?? 0);
    return into;
  };
}

// a spread easing key to key (r)
export function swarmSpread(keys: readonly SwarmKey[]): (ms: number) => number {
  return (ms) => {
    const [k, u] = keyAt(keys, ms);
    const a = keys[k].r ?? 0;
    const b = keys[Math.min(k + 1, keys.length - 1)].r ?? 0;
    return a + (b - a) * u;
  };
}

export interface SwarmPlan {
  count: number;
  startMs: number;
  endMs: number;
  // px the flock spreads at ms (its radius)
  spread: (ms: number) => number;
  // laps a second it wheels round its centre, from startMs to endMs
  spinHz?: Range;
  // ms the farthest-back member trails the centre's path
  lagMs?: number;
  // the flock's height as a share of its width
  squash?: number;
}

export interface Swarm {
  count: number;
  startMs: number;
  endMs: number;
  spread: (ms: number) => number;
  spinHz: Range;
  lagMs: number;
  squash: number;
  // per member: its angle, distance (0..1 of the spread), lag (0..1),
  // wheel speed and flutter phase
  angle: Float32Array;
  reach: Float32Array;
  lag: Float32Array;
  wheel: Float32Array;
  phase: Float32Array;
  // where its centre is at ms, written into `into`
  center: (ms: number, into: Point) => Point;
}

export function planSwarm(
  center: (ms: number, into: Point) => Point,
  {
    count,
    startMs,
    endMs,
    spread,
    spinHz = [0.4, 2],
    lagMs = 160,
    squash = 0.7,
  }: SwarmPlan,
): Swarm {
  const angle = new Float32Array(count);
  const reach = new Float32Array(count);
  const lag = new Float32Array(count);
  const wheel = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    angle[i] = hash01(i, 501) * TAU;
    reach[i] = Math.sqrt(hash01(i, 502));
    lag[i] = hash01(i, 503);
    wheel[i] = 1 + (hash01(i, 504) * 2 - 1) * WHEEL_JITTER;
    phase[i] = hash01(i, 505) * TAU;
  }
  return {
    count,
    startMs,
    endMs,
    spread,
    spinHz,
    lagMs,
    squash,
    angle,
    reach,
    lag,
    wheel,
    phase,
    center,
  };
}

// how far it has wheeled by ms (rad): spinning up from spinHz[0] to [1]
export function swarmTurn(swarm: Swarm, ms: number): number {
  const span = Math.max(1, swarm.endMs - swarm.startMs) / 1000;
  const s = Math.max(0, ms - swarm.startMs) / 1000;
  const v = Math.min(s, span);
  const [a, b] = swarm.spinHz;
  return TAU * (a * v + ((b - a) * v * v) / (2 * span) + b * (s - v));
}

const c: Point = { x: 0, y: 0 };

// member i at ms, written into `into`
export function swarmAt(
  swarm: Swarm,
  i: number,
  ms: number,
  into: Point,
): Point {
  swarm.center(ms - swarm.lag[i] * swarm.lagMs, c);
  const turn = swarmTurn(swarm, ms) * swarm.wheel[i];
  const a = swarm.angle[i] + turn;
  const r =
    swarm.reach[i] *
    swarm.spread(ms) *
    (1 + FLUTTER * Math.sin(ms * FLUTTER_RATE + swarm.phase[i]));
  into.x = c.x + Math.cos(a) * r;
  into.y = c.y + Math.sin(a) * r * swarm.squash;
  return into;
}

export interface Dives {
  // when each member peels off (Infinity: never), and which target it takes
  startMs: Float32Array;
  target: Int16Array;
  flightMs: number;
}

// the members peeling off onto `targets` targets: target k's share in turn,
// each wave `waves[k]` ms from the start, its members spread over spreadMs;
// `share` of the flock dives in all (the rest stays to the end)
export function planDives(
  swarm: Swarm,
  waves: readonly number[],
  spreadMs: number,
  flightMs: number,
  share = 1,
): Dives {
  const startMs = new Float32Array(swarm.count).fill(Infinity);
  const target = new Int16Array(swarm.count);
  const diving = Math.floor(swarm.count * share);
  for (let i = 0; i < diving; i++) {
    const k = i % waves.length;
    target[i] = k;
    startMs[i] = waves[k] + hash01(i, 506) * spreadMs;
  }
  return { startMs, target, flightMs };
}

// the rest of the flock (those not diving yet) diving onto `target` at once
// from startMs, spread over spreadMs: the climax
export function diveRest(
  dives: Dives,
  target: number,
  startMs: number,
  spreadMs: number,
): void {
  for (let i = 0; i < dives.startMs.length; i++) {
    if (dives.startMs[i] !== Infinity) continue;
    dives.startMs[i] = startMs + hash01(i, 507) * spreadMs;
    dives.target[i] = target;
  }
}

// every member still in the flock at ms (dives skipped), `size` px specks
export function drawSwarm(
  ctx: CanvasRenderingContext2D,
  swarm: Swarm,
  ms: number,
  size: number,
  dives?: Dives,
  alpha = 1,
): void {
  if (ms < swarm.startMs || alpha <= 0) return;
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = base * alpha;
  beginLightBatch(ctx);
  for (let i = 0; i < swarm.count; i++) {
    if (dives && ms >= dives.startMs[i]) continue;
    swarmAt(swarm, i, ms, p);
    stampGlimmer(
      ctx,
      p.x,
      p.y,
      size * (0.7 + 0.6 * swarm.reach[i]),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}

const p: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };

// member i diving at ms, from where it peeled off onto `to`; null before it
// peels off or once it has landed
export function diveAt(
  swarm: Swarm,
  dives: Dives,
  i: number,
  ms: number,
  to: Point,
  into: Point,
): Point | null {
  const start = dives.startMs[i];
  const u = (ms - start) / dives.flightMs;
  if (!(u >= 0) || u >= 1) return null;
  swarmAt(swarm, i, start, from);
  const e = u * u;
  const bow = DIVE_BOW * Math.sin(Math.PI * u) * (i % 2 ? 1 : -1);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  into.x = from.x + dx * e - dy * bow;
  into.y = from.y + dy * e + dx * bow;
  return into;
}

// every member diving at ms onto its target (targets[dives.target[i]]),
// streaking in faster and faster, `size` px
export function drawDives(
  ctx: CanvasRenderingContext2D,
  swarm: Swarm,
  dives: Dives,
  targets: readonly Point[],
  ms: number,
  size: number,
): void {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < swarm.count; i++) {
    const to = targets[dives.target[i]];
    if (!to || !diveAt(swarm, dives, i, ms, to, p)) continue;
    const u = clamp01((ms - dives.startMs[i]) / dives.flightMs);
    stampGlimmer(
      ctx,
      p.x,
      p.y,
      size * lerp([1.2, 0.7], u),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}
