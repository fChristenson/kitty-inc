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
import { drawBeam } from "../beam";

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

// sparks a side, each relit every SPRAY_MS once it lands
const SPRAY_SPARKS = 160;
const SPRAY_MS = 560;
// px per ms (per px of size) they fly out at, and px per ms² they fall
const SPRAY_SPEED: [number, number] = [0.016, 0.05];
const SPRAY_FALL = 0.0001;
// the streak behind each spark, in ms of its flight
const STREAK_MS = 40;
// rad they tilt back out of the hole, off straight along the surface
const SPRAY_TILT: [number, number] = [0.15, 1.25];

// the gush of sparks a bit grinding into something hard throws out of both
// sides of its hole: white-hot streaks flung out along the surface that arc
// over and fall, with heavier chips among them, msSince it bit in, angle the
// way it's boring, intensity 0..1 (more and faster sparks, above 1 too)
export function drawDrillSpray(
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
  // the white-hot contact
  ctx.globalAlpha =
    Math.min(1, intensity) * (0.75 + 0.25 * Math.sin(now * 0.09));
  drawGlow(ctx, GOLD, at.x, at.y, size * 1.6);
  drawGlow(ctx, WHITE, at.x, at.y, size * 0.6);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
  for (let side = -1; side <= 1; side += 2)
    for (let i = 0; i < SPRAY_SPARKS; i++) {
      const seed = i + (side > 0 ? 500 : 900);
      const clock = msSince + hash01(seed, 7) * SPRAY_MS;
      const life = Math.floor(clock / SPRAY_MS);
      const t = clock % SPRAY_MS;
      // none flying yet that would have left before it bit in
      if (life === 0 && t > msSince) continue;
      // the gentler the grind, the fewer sparks
      if (hash01(seed, life) > intensity) continue;
      const chip = i % 4 === 0;
      const a =
        angle + side * (Math.PI / 2 + lerp(SPRAY_TILT, hash01(life, seed)));
      const speed =
        size *
        lerp(SPRAY_SPEED, hash01(seed, life + 3)) *
        (chip ? 0.55 : 1) *
        (0.7 + 0.3 * Math.min(1.5, intensity));
      const fall = size * SPRAY_FALL * (chip ? 1.8 : 1);
      const fade = 1 - t / SPRAY_MS;
      const x = at.x + Math.cos(a) * speed * t;
      const y = at.y + Math.sin(a) * speed * t + 0.5 * fall * t * t;
      if (chip) {
        drawGlitterLight(ctx, x, y, size * 0.2, seed, fade, now);
        continue;
      }
      // a streak back along where it just flew
      const s = Math.max(0, t - STREAK_MS);
      sparkTail.x = at.x + Math.cos(a) * speed * s;
      sparkTail.y = at.y + Math.sin(a) * speed * s + 0.5 * fall * s * s;
      sparkHead.x = x;
      sparkHead.y = y;
      drawBeam(
        ctx,
        sparkTail,
        sparkHead,
        size * 0.13 * (0.4 + 0.6 * fade),
        fade,
      );
    }
}

const sparkTail: Point = { x: 0, y: 0 };
const sparkHead: Point = { x: 0, y: 0 };

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

// a drill grinding through something hard: it stalls on the bite, then bores
// on, its times shifted by the stall
export interface Grind {
  drill: Drill;
  stallMs: number;
  bites: number;
  // when the stall gives, each shove but the punch-through, and that
  gives: number;
  pushes: number[];
  through: number;
  endMs: number;
  // rumbles while it stalls, every RUMBLE_MS
  rumbles: number[];
}

const RUMBLE_MS = 90;
// px the drill judders while it's stalled, and once it's boring in
const JUDDER: [number, number] = [5, 2.5];
// how hard it grinds: a steady gush while stalled, building as it bores
const GRIND_STALLED = 1;
const GRIND_BORING: [number, number] = [0.85, 1.5];
const SPRAY_FADE_MS = 300;

// the drill held stallMs on its bite, grinding in place, before it bores on
export function planGrind(drill: Drill, stallMs: number): Grind {
  const bites = drill.bites;
  const gives = bites + stallMs;
  const rumbles: number[] = [];
  for (let ms = bites + RUMBLE_MS; ms < gives; ms += RUMBLE_MS)
    rumbles.push(ms);
  return {
    drill,
    stallMs,
    bites,
    gives,
    pushes: drill.pushes.slice(0, -1).map((ms) => ms + stallMs),
    through: drill.through + stallMs,
    endMs: drill.endMs + stallMs,
    rumbles,
  };
}

// the grinding drill at ms: juddering while it bites (hardest stalled), with
// the gush of sparks out of its hole, `spray` px the sparks' scale (`gush`
// thins it, for several drills grinding at once)
export function drawGrind(
  ctx: CanvasRenderingContext2D,
  grind: Grind,
  ms: number,
  now: number,
  size: number,
  spray: number,
  gush = 1,
): void {
  const { drill, bites, gives, through, stallMs } = grind;
  const biting = ms >= bites && ms < through;
  const judder = biting ? (ms < gives ? JUDDER[0] : JUDDER[1]) : 0;
  ctx.save();
  ctx.translate(Math.sin(ms * 0.9) * judder, Math.cos(ms * 1.3) * judder * 0.5);
  // its own clock is held at the bite while it stalls
  drawDrill(
    ctx,
    drill,
    ms < bites ? ms : ms < gives ? bites + 1 : ms - stallMs,
    now,
    size,
  );
  ctx.restore();
  if (ms < bites || ms > through + SPRAY_FADE_MS) return;
  const hard =
    ms < gives
      ? GRIND_STALLED
      : lerp(GRIND_BORING, clamp01((ms - gives) / (through - gives)));
  drawDrillSpray(
    ctx,
    drill.target,
    drill.angle,
    ms - bites,
    hard * gush * (1 - clamp01((ms - through) / SPRAY_FADE_MS)),
    spray,
    now,
  );
}
