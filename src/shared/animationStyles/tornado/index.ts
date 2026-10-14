// tornadoes for events and crits: a funnel of glitter whirling up from a
// point on the ground, narrow at its foot and wide at its top, its rings
// turning faster and faster (the low ones fastest), its top swaying, while
// its foot travels along a path; whatever it touches is caught, lifted and
// spun up round it, higher and faster, until it's flung out. Plan it once
// (planTornado with a path for its foot), then each frame drawTornado, place
// what it has caught with liftAt and fling it with flingFrom
import { COLOR } from "../../../palette";
import { clamp01, lerp, type Range } from "../../easing";
import { drawGlow, fadeStops } from "../../glowSprite";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";

const TAU = Math.PI * 2;
// the funnel seen from the side: its rings SQUASH as tall as they're wide,
// RINGS of them with SPECKS specks each, the specks wound TWIST rad from
// foot to top; the funnel's radius grows as h^FLARE
const SQUASH = 0.28;
const RINGS = 11;
const SPECKS = 8;
const TWIST = 3;
const FLARE = 1.6;
const SPECK = 0.11;
// the low rings turn LOW_SPIN times as fast as the top
const LOW_SPIN = 1.8;
// the dust kicked up round its foot, DUST specks out to DUST_OUT of the foot
const DUST = 10;
const DUST_OUT = 2.4;
// its top sways SWAY_HZ times a second
const SWAY_HZ = 0.7;
// a caught thing climbs to the top over RISE_MS, then rides round it
const RISE_MS = 700;
const BODY = fadeStops(COLOR.heavenlyGold);

export interface TornadoPlan {
  startMs: number;
  endMs: number;
  // px from its foot to its top, and the funnel's radius at each
  height: number;
  foot?: number;
  top?: number;
  // laps a second at the top, from touchdown to the end
  spinHz?: Range;
  // px its top sways either way
  sway?: number;
  // ms it takes to reach full size after touching down
  growMs?: number;
}

export interface Tornado {
  startMs: number;
  endMs: number;
  height: number;
  foot: number;
  top: number;
  spinHz: Range;
  sway: number;
  growMs: number;
  // where its foot is at ms, written into `into`
  at: (ms: number, into: Point) => Point;
}

export function planTornado(
  at: (ms: number, into: Point) => Point,
  {
    startMs,
    endMs,
    height,
    foot = 30,
    top = 200,
    spinHz = [0.8, 3.2],
    sway = 60,
    growMs = 300,
  }: TornadoPlan,
): Tornado {
  return { startMs, endMs, height, foot, top, spinHz, sway, growMs, at };
}

// how far its top has turned by ms (rad): spinning up from spinHz[0] to [1]
export function tornadoTurn(t: Tornado, ms: number): number {
  const s = Math.max(0, ms - t.startMs) / 1000;
  const span = (t.endMs - t.startMs) / 1000;
  const [a, b] = t.spinHz;
  const v = Math.min(s, span);
  // the integral of the speed ramping a..b over the span, held after it
  return TAU * (a * v + ((b - a) * v * v) / (2 * span) + b * (s - v));
}

// how grown (0..1) it is at ms
export const tornadoGrow = (t: Tornado, ms: number): number =>
  clamp01((ms - t.startMs) / t.growMs);

const foot: Point = { x: 0, y: 0 };

// a point h up the funnel standing on `f`, grown `grow`
function place(
  t: Tornado,
  f: Point,
  grow: number,
  ms: number,
  h: number,
  a: number,
  into: Point,
): Point {
  const r = lerp([t.foot, t.top], h ** FLARE) * grow;
  const lean = t.sway * Math.sin((ms / 1000) * SWAY_HZ * TAU + h * 2) * h * h;
  into.x = f.x + lean + Math.cos(a) * r;
  into.y = f.y - h * t.height * grow + Math.sin(a) * r * SQUASH;
  return into;
}

// a point on the funnel h (0 foot..1 top) up, at angle a round it
export function funnelAt(
  t: Tornado,
  ms: number,
  h: number,
  a: number,
  into: Point,
): Point {
  return place(t, t.at(ms, foot), tornadoGrow(t, ms), ms, h, a, into);
}

const p: Point = { x: 0, y: 0 };
const q: Point = { x: 0, y: 0 };

// the funnel at ms, `alpha` fading it: a soft gold body, its rings of
// glitter whirling (the near side brighter) and dust spinning round its foot
export function drawTornado(
  ctx: CanvasRenderingContext2D,
  t: Tornado,
  ms: number,
  alpha = 1,
): void {
  if (ms < t.startMs || alpha <= 0) return;
  const grow = tornadoGrow(t, ms);
  const turn = tornadoTurn(t, ms);
  const f = t.at(ms, foot);
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  // the body: a glow up its middle
  for (let k = 0; k < 2; k++) {
    const h = (k + 0.5) / 2;
    place(t, f, grow, ms, h, 0, p);
    place(t, f, grow, ms, h, Math.PI, q);
    ctx.globalAlpha = base * alpha * 0.25;
    drawGlow(ctx, BODY, (p.x + q.x) / 2, p.y, Math.abs(p.x - q.x) * 0.6 + 10);
  }
  beginLightBatch(ctx);
  for (let i = 0; i < RINGS * SPECKS; i++) {
    const ring = Math.floor(i / SPECKS);
    const h = (ring + 0.5) / RINGS;
    const a =
      turn * lerp([LOW_SPIN, 1], h) + ((i % SPECKS) / SPECKS) * TAU + h * TWIST;
    place(t, f, grow, ms, h, a, p);
    const near = 0.5 + 0.5 * Math.sin(a);
    ctx.globalAlpha = base * alpha * (0.25 + 0.75 * near);
    const r = lerp([t.foot, t.top], h ** FLARE) * grow;
    stampGlimmer(
      ctx,
      p.x,
      p.y,
      Math.max(6, r * SPECK) * (0.6 + 0.4 * near),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  // the dust round its foot
  for (let i = 0; i < DUST; i++) {
    const a = turn * LOW_SPIN * 1.3 + (i / DUST) * TAU;
    const out =
      t.foot * DUST_OUT * grow * (0.7 + 0.3 * Math.sin(ms * 0.01 + i));
    ctx.globalAlpha = base * alpha * 0.7;
    stampGlimmer(
      ctx,
      f.x + Math.cos(a) * out,
      f.y + Math.sin(a) * out * SQUASH,
      t.foot * 0.35,
      i + 200,
      COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}

// a thing caught at caughtMs, ms on: climbing the funnel as it's spun round
// it, faster as it rises; `seed` (0..1) spreads things round and up it
export function liftAt(
  t: Tornado,
  ms: number,
  caughtMs: number,
  seed: number,
  into: Point,
): Point {
  const rise = clamp01((ms - caughtMs) / RISE_MS);
  const h = (0.15 + 0.8 * seed) * Math.sqrt(rise);
  const a = tornadoTurn(t, ms) * lerp([LOW_SPIN, 1], h) + seed * TAU;
  return funnelAt(t, ms, h, a, into);
}

// a thing flung off the funnel at flungMs (where liftAt had it), u (0..1)
// of its way onto `to`, swinging out the way it was spinning first
export function flingFrom(
  t: Tornado,
  flungMs: number,
  caughtMs: number,
  seed: number,
  to: Point,
  u: number,
  into: Point,
): Point {
  liftAt(t, flungMs, caughtMs, seed, p);
  t.at(flungMs, foot);
  // out from the funnel's middle, sideways
  const out = Math.sign(p.x - foot.x) || 1;
  const vx = p.x + out * t.top * 1.5;
  const vy = p.y - t.top * 0.5;
  const e = u * u;
  const w = 1 - u;
  into.x = w * w * p.x + 2 * w * u * vx + e * to.x;
  into.y = w * w * p.y + 2 * w * u * vy + e * to.y;
  return into;
}
