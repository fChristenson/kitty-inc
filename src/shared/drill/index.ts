// drills for events: a drill head (a white-hot wisp tip inside a whirling
// cone of glitter) planned at arm time to fly at a target actor (a bar, a
// worker, a lock, the button, another wisp), bite into it, bore in shuddering
// pushes and punch through, plus the sparks and chips it throws back out of
// the hole and the hole it leaves. Plan with planDrill, draw with drawDrill,
// and fire the hit beats off its bites / pushes / through times
import { COLOR } from "../../palette";
import { drawGlow, fadeStops, type FadeStops } from "../glowSprite";
import { drawGlitterLight, drawWispBetween, type Point } from "../wisp";
import { clamp01, easeIn, easeOut, lerp } from "../easing";
import { hash01 } from "../twinkle";

export interface Drill {
  target: Point;
  // the way it's heading (rad)
  angle: number;
  startMs: number;
  // when it bites into the target, each shove deeper, and when it's through
  bites: number;
  pushes: number[];
  through: number;
  endMs: number;
  // the tip at ms (one point, rewritten), and how deep it's bored 0..1
  at: (ms: number) => Point;
  depth: (ms: number) => number;
}

export interface DrillPlan {
  approachMs: number;
  boreMs: number;
  // shoves while boring, each a little quicker than the last
  pushes?: number;
  // px it sinks into the target, and flies on past it once through
  reach?: number;
  exit?: number;
  exitMs?: number;
  startMs?: number;
}

// px the tip shudders sideways while it bores
const SHUDDER = 3;

// flown dead at target from `from`, speeding up, then bored into it in
// fits and starts and, given an exit, punched out the far side
export function planDrill(
  from: Point,
  target: Point,
  {
    approachMs,
    boreMs,
    pushes = 4,
    reach = 36,
    exit = 0,
    exitMs = 160,
    startMs = 0,
  }: DrillPlan,
): Drill {
  const angle = Math.atan2(target.y - from.y, target.x - from.x);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const bites = startMs + approachMs;
  const through = bites + boreMs;
  // shorter shoves as it gets going
  const weights = Array.from({ length: pushes }, (_, k) =>
    lerp([1.35, 0.65], k / Math.max(1, pushes - 1)),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  let clock = bites;
  const pushTimes = weights.map((w) => (clock += (boreMs * w) / sum));
  const depth = (ms: number) => {
    if (ms <= bites) return 0;
    if (ms >= through) return 1;
    let from = bites;
    for (let k = 0; k < pushes; k++) {
      const to = pushTimes[k];
      if (ms < to) return (k + easeOut((ms - from) / (to - from))) / pushes;
      from = to;
    }
    return 1;
  };
  const spot: Point = { x: 0, y: 0 };
  return {
    target,
    angle,
    startMs,
    bites,
    pushes: pushTimes,
    through,
    endMs: through + (exit > 0 ? exitMs : 0),
    at: (ms) => {
      if (ms < bites) {
        const u = easeIn(clamp01((ms - startMs) / approachMs));
        spot.x = lerp([from.x, target.x], u);
        spot.y = lerp([from.y, target.y], u);
        return spot;
      }
      let sunk = reach * depth(ms);
      let shake = ms < through ? Math.sin(ms * 0.9) * SHUDDER : 0;
      if (ms >= through && exit > 0) {
        sunk += exit * easeIn(clamp01((ms - through) / exitMs));
        shake = 0;
      }
      spot.x = target.x + dx * sunk - dy * shake;
      spot.y = target.y + dy * sunk + dx * shake;
      return spot;
    },
    depth,
  };
}

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);
const HOLE: FadeStops = [
  [0, "#000000"],
  [0.6, "#000000cc"],
  [1, "#00000000"],
];
const RIM: FadeStops = [
  [0, `${COLOR.heavenlyGold}00`],
  [0.62, `${COLOR.heavenlyGold}00`],
  [0.78, COLOR.heavenlyGold],
  [1, `${COLOR.heavenlyGold}00`],
];
// the head's cone, as multiples of its size: long, wide at the back
const CONE_L = 1.7;
const CONE_R = 0.5;
const HELIX = 9;
const TURNS = 2.5;

// the whirling cone of a drill head, its tip at `tip` pointing along angle,
// turned `turn` rad round its axis; draw the tip's wisp over it
export function drawDrillHead(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  angle: number,
  size: number,
  turn: number,
  now: number,
  alpha = 1,
): void {
  if (alpha <= 0) return;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 * alpha;
  drawGlow(
    ctx,
    GOLD,
    tip.x - dx * size * CONE_L * 0.5,
    tip.y - dy * size * CONE_L * 0.5,
    size * 1.1,
  );
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
  // two strands spiralling down the cone, brighter on the near side
  for (let s = 0; s < 2; s++)
    for (let k = 0; k < HELIX; k++) {
      const u = (k + 0.5) / HELIX;
      const phase = u * TURNS * Math.PI * 2 + turn + s * Math.PI;
      const off = size * CONE_R * u * Math.cos(phase);
      const back = size * CONE_L * u;
      const near = 0.5 + 0.5 * Math.sin(phase);
      drawGlitterLight(
        ctx,
        tip.x - dx * back - dy * off,
        tip.y - dy * back + dx * off,
        size * 0.13 * (0.6 + 0.4 * u),
        k + s * 37,
        alpha * (0.3 + 0.7 * near),
        now,
      );
    }
  ctx.globalAlpha = 1;
}

const SPARKS = 18;
const SPARK_MS = 280;
// sparks spray back out within this many rad either side of straight back
const SPARK_FAN = 1.0;

// the sparks and chips a boring drill throws back out of the hole at `at`,
// msSince it bit in, intensity 0..1 (ease it out after it's through)
export function drawDrillSparks(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  msSince: number,
  intensity: number,
  size: number,
  now: number,
): void {
  if (msSince < 0 || intensity <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = intensity * (0.7 + 0.3 * Math.sin(now * 0.07));
  drawGlow(ctx, GOLD, at.x, at.y, size * 1.3);
  drawGlow(ctx, WHITE, at.x, at.y, size * 0.45);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  const back = angle + Math.PI;
  for (let i = 0; i < SPARKS; i++) {
    const clock = msSince + hash01(i, 11) * SPARK_MS;
    const life = Math.floor(clock / SPARK_MS);
    const t = (clock % SPARK_MS) / SPARK_MS;
    if (clock < SPARK_MS && t > msSince / SPARK_MS) continue;
    const a = back + (hash01(i, life) * 2 - 1) * SPARK_FAN;
    // every third a bigger chip, flung farther and falling harder
    const chip = i % 3 === 0;
    const reach =
      size *
      (chip ? 3.6 : 2.4) *
      (0.4 + 0.6 * hash01(life, i)) *
      easeOut(t) *
      intensity;
    drawGlitterLight(
      ctx,
      at.x + Math.cos(a) * reach,
      at.y + Math.sin(a) * reach + size * (chip ? 2.4 : 1.2) * t * t,
      size * (chip ? 0.2 : 0.12) * (1 - 0.6 * t),
      i + 400,
      (1 - t) * intensity,
      now,
    );
  }
}

// the hole bored into the target at `at`, depth 0..1
export function drawDrillHole(
  ctx: CanvasRenderingContext2D,
  at: Point,
  depth: number,
  size: number,
  alpha = 1,
): void {
  if (depth <= 0 || alpha <= 0) return;
  const r = size * 0.6 * (0.35 + 0.65 * depth);
  ctx.globalAlpha = alpha * 0.85;
  drawGlow(ctx, HOLE, at.x, at.y, r);
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  drawGlow(ctx, RIM, at.x, at.y, r * 1.15);
  ctx.globalCompositeOperation = previous;
  ctx.globalAlpha = 1;
}

// laps a second the head spins, cruising and once it bites
const SPIN = [3, 9];
const SPARKS_FADE_MS = 220;
const HOLE_FADE_MS = 500;

// the whole drill at ms, `size` across its head: the hole it's bored, the
// spinning head with its wisp tip, and the sparks while it bores
export function drawDrill(
  ctx: CanvasRenderingContext2D,
  drill: Drill,
  ms: number,
  now: number,
  size: number,
): void {
  if (ms < drill.startMs || ms > drill.endMs + HOLE_FADE_MS) return;
  const { bites, through, angle, target } = drill;
  if (ms >= bites)
    drawDrillHole(
      ctx,
      target,
      drill.depth(ms),
      size,
      1 - clamp01((ms - through) / HOLE_FADE_MS),
    );
  if (ms <= drill.endMs) {
    const turn = (Math.PI * 2 * (ms < bites ? SPIN[0] : SPIN[1]) * ms) / 1000;
    const tip = drill.at(ms);
    drawDrillHead(ctx, tip, angle, size, turn, now);
  }
  drawWispBetween(
    ctx,
    drill.at,
    ms,
    now,
    size * 0.5,
    ms >= bites ? 1 : 0.6,
    drill.startMs,
    drill.endMs,
  );
  if (ms >= bites)
    drawDrillSparks(
      ctx,
      target,
      angle,
      ms - bites,
      1 - clamp01((ms - through) / SPARKS_FADE_MS),
      size,
      now,
    );
}
