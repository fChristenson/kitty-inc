// summoning for events and crits: a magic circle of light drawn on the ground
// in one stroke, then an inner ring and a star of marks, the rings turning
// against each other faster and faster with glitter rising off them, until
// a pillar of light erupts out of it. Plan it once (planSummon, in one of
// SUMMON_LOOKS or its own), then each frame drawSummon, and drawSummonPillar
// from the eruption
import { COLOR } from "../../../palette";
import { clamp01 } from "../../easing";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { hash01, stampGlimmer } from "../../twinkle";
import type { Point } from "../../wisp";
import { drawBeam } from "../beam";

// the circle lies on the ground: SQUASH as tall as it's wide
const SQUASH = 0.3;
// drawn: the outer ring in OUTER_MS, the inner one in INNER_MS, the marks
// fading in over MARKS_MS
const OUTER_MS = 240;
const INNER_MS = 160;
const MARKS_MS = 140;
// the rings and marks, of the radius
const INNER = 0.72;
const RIM = 0.034;
const INNER_RIM = 0.024;
const MARK = 0.019;
const TICK_OUT = 0.94;
const TICK_IN = 0.8;
const PEN = 0.095;
const BEAD = 0.07;
// glitter rising RISE of the radius off the rings, RISE_MS a trip at rest,
// RISE_FAST times as quick by the eruption
const RISERS = 18;
const RISE = 0.52;
const RISE_MS = 600;
const RISE_FAST = 5;
const RISER = 0.062;
// the circle fading as the pillar erupts, the pillar PILLAR of the radius
// wide, narrowing and fading over PILLAR_MS
const FADE_MS = 250;
const PILLAR = 0.7;
const PILLAR_NARROW = 0.6;
const PILLAR_MS = 500;

// what a circle's marks look like: only rings, ticks, stars and beads of light
export interface SummonLook {
  // the star's points, how many points each line skips (1: a polygon), and
  // how fast it turns against the rings (times their turn)
  star: number;
  skip: number;
  starTurn: number;
  // a second figure inside the star, `inner` of the radius (0: none), turning
  // `innerTurn` times the rings' turn
  inner: number;
  innerStar: number;
  innerSkip: number;
  innerTurn: number;
  // ticks round the rim
  ticks: number;
  // more rings, as shares of the radius
  rings: readonly number[];
  // beads of light riding the rim, turning `beadTurn` times the rings
  beads: number;
  beadTurn: number;
}

const CLASSIC: SummonLook = {
  star: 6,
  skip: 2,
  starTurn: -1.5,
  inner: 0,
  innerStar: 0,
  innerSkip: 1,
  innerTurn: 0,
  ticks: 24,
  rings: [],
  beads: 0,
  beadTurn: 0,
};

// the circles to pick from: vary them between crits and between the circles
// of one crit
export const SUMMON_LOOKS: readonly SummonLook[] = [
  CLASSIC,
  // a pentagram with a pentagon spinning the other way inside it
  {
    ...CLASSIC,
    star: 5,
    skip: 2,
    inner: 0.3,
    innerStar: 5,
    innerTurn: 2.5,
    ticks: 20,
  },
  // a seven-point star, beads racing round the rim
  {
    ...CLASSIC,
    star: 7,
    skip: 3,
    starTurn: -1,
    ticks: 14,
    beads: 7,
    beadTurn: -2,
  },
  // an eight-point star round a square, a ring between them
  {
    ...CLASSIC,
    star: 8,
    skip: 3,
    inner: 0.4,
    innerStar: 4,
    innerTurn: -3,
    ticks: 32,
    rings: [0.42],
  },
  // triangles: a big one and a small one turning against it, three rings
  {
    ...CLASSIC,
    star: 3,
    skip: 1,
    starTurn: 1.2,
    inner: 0.35,
    innerStar: 3,
    innerTurn: -2.5,
    ticks: 36,
    rings: [0.86, 0.36],
  },
  // a squared star of two squares, a fine comb of ticks and four beads
  {
    ...CLASSIC,
    star: 8,
    skip: 2,
    starTurn: -0.8,
    ticks: 48,
    beads: 4,
    beadTurn: 3,
  },
  // a hexagon round a hexagram, beads on the rim
  {
    ...CLASSIC,
    star: 6,
    skip: 1,
    starTurn: 0.7,
    inner: 0.62,
    innerStar: 6,
    innerSkip: 2,
    innerTurn: -2,
    ticks: 12,
    beads: 6,
    beadTurn: -1.5,
  },
];

// a look from SUMMON_LOOKS by number, wrapping round
export const summonLook = (n: number): SummonLook =>
  SUMMON_LOOKS[
    ((n % SUMMON_LOOKS.length) + SUMMON_LOOKS.length) % SUMMON_LOOKS.length
  ];

export interface Summon {
  startMs: number;
  innerMs: number;
  marksMs: number;
  eruptMs: number;
  turns: number;
  // when each full turn comes round, quicker and quicker: a jolt each
  revs: number[];
  look: SummonLook;
}

// a circle drawn from startMs, turning `turns` times till it erupts at eruptMs
export function planSummon(
  startMs: number,
  eruptMs: number,
  turns = 7,
  look: SummonLook = CLASSIC,
): Summon {
  const innerMs = startMs + OUTER_MS;
  const marksMs = innerMs + INNER_MS;
  const revs: number[] = [];
  for (let k = 1; k < turns; k++)
    revs.push(marksMs + (eruptMs - marksMs) * Math.cbrt(k / turns));
  return { startMs, innerMs, marksMs, eruptMs, turns, revs, look };
}

// radians it has turned by ms: slow, then whipping round
export function summonTurn(s: Summon, ms: number): number {
  const t = clamp01((ms - s.marksMs) / (s.eruptMs - s.marksMs));
  return s.turns * Math.PI * 2 * t * t * t;
}

const p: Point = { x: 0, y: 0 };
const q: Point = { x: 0, y: 0 };
const onRing = (at: Point, r: number, a: number, into: Point): Point => {
  into.x = at.x + Math.cos(a) * r;
  into.y = at.y + Math.sin(a) * r * SQUASH;
  return into;
};

function ring(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  drawn: number,
  width: number,
): void {
  if (drawn <= 0) return;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, r, r * SQUASH, 0, 0, Math.PI * 2 * drawn);
  ctx.lineWidth = width;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = width / 3;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
}

// a star of `points` points `r` round, each line skipping `skip`, turned `a0`
function star(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  points: number,
  skip: number,
  a0: number,
): void {
  for (let i = 0; i < points; i++) {
    const a = a0 + (i / points) * Math.PI * 2;
    onRing(at, r, a, p);
    onRing(at, r, a + (skip / points) * Math.PI * 2, q);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
}

// the circle at ms, `radius` px across its middle at `at`
export function drawSummon(
  ctx: CanvasRenderingContext2D,
  s: Summon,
  ms: number,
  at: Point,
  radius: number,
): void {
  if (ms < s.startMs) return;
  const fade = 1 - clamp01((ms - s.eruptMs) / FADE_MS);
  if (fade <= 0) return;
  const { look } = s;
  const turn = summonTurn(s, ms);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * fade;
  const pen = clamp01((ms - s.startMs) / OUTER_MS);
  ring(ctx, at, radius, pen, radius * RIM);
  const inner = clamp01((ms - s.innerMs) / INNER_MS);
  ring(ctx, at, radius * INNER, inner, radius * INNER_RIM);
  for (let i = 0; i < look.rings.length; i++)
    ring(ctx, at, radius * look.rings[i], inner, radius * INNER_RIM * 0.8);
  const marks = clamp01((ms - s.marksMs) / MARKS_MS);
  if (marks > 0) {
    ctx.globalAlpha = alpha * fade * marks;
    ctx.lineWidth = radius * MARK;
    ctx.strokeStyle = COLOR.heavenlyGold;
    ctx.beginPath();
    for (let i = 0; i < look.ticks; i++) {
      const a = (i / look.ticks) * Math.PI * 2 + turn;
      onRing(at, radius * TICK_OUT, a, p);
      onRing(at, radius * TICK_IN, a, q);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    star(ctx, at, radius * INNER, look.star, look.skip, turn * look.starTurn);
    if (look.inner > 0)
      star(
        ctx,
        at,
        radius * look.inner,
        look.innerStar,
        look.innerSkip,
        turn * look.innerTurn,
      );
    ctx.stroke();
  }
  beginLightBatch(ctx);
  if (pen > 0 && pen < 1) {
    onRing(at, radius, Math.PI * 2 * pen, p);
    stampGlimmer(ctx, p.x, p.y, radius * PEN, 1, COLOR.white);
  }
  if (marks > 0) {
    for (let i = 0; i < look.beads; i++) {
      onRing(
        at,
        radius,
        (i / look.beads) * Math.PI * 2 + turn * look.beadTurn,
        p,
      );
      stampGlimmer(ctx, p.x, p.y, radius * BEAD * marks, i + 40, COLOR.white);
    }
    const build = clamp01((ms - s.marksMs) / (s.eruptMs - s.marksMs));
    const rate = 1 + (RISE_FAST - 1) * build;
    for (let i = 0; i < RISERS; i++) {
      const rise = ((ms * rate) / RISE_MS + hash01(i, 91)) % 1;
      onRing(
        at,
        radius * (TICK_IN + (1 - TICK_IN) * hash01(i, 92)),
        hash01(i, 93) * Math.PI * 2 + turn * 0.5,
        p,
      );
      stampGlimmer(
        ctx,
        p.x,
        p.y - rise * radius * RISE,
        radius * RISER * (1 - rise),
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
  }
  endLightBatch(ctx);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

// the pillar of light erupting out of the circle, `height` px up
export function drawSummonPillar(
  ctx: CanvasRenderingContext2D,
  s: Summon,
  ms: number,
  at: Point,
  radius: number,
  height: number,
): void {
  const since = ms - s.eruptMs;
  if (since < 0 || since >= PILLAR_MS) return;
  const u = since / PILLAR_MS;
  q.x = at.x;
  q.y = at.y - height;
  drawBeam(ctx, at, q, radius * PILLAR * (1 - u * PILLAR_NARROW), 1 - u);
}
