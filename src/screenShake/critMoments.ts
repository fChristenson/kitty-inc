// crit moments: once a crit's flash has slammed in and sat, its number plays
// out onto the income bars in view (see shared/critTypes' CritMoment): fired
// at its bar character by character, pinballing between bars, snowballing
// down them, juggled onto them, stomped onto all of them, rained onto them,
// stamped onto each, crashed down through them from a
// catapult, flung onto them by a tornado, flung onto them from orbit,
// pulled across them as a train, blown onto them as bubbles, chained
// through them as a bolt of lightning, slammed into one as a meteor or
// sucked off all of them into a black hole and flung back.
// Every hit calls back so the floors can jolt and land their levels
import type { CritMoment } from "../shared/critTypes";
import { drawGlow, fadeStops, type FadeStops } from "../shared/glowSprite";
import { createBolt, drawBolt, type Bolt } from "../shared/lightning";
import { drawDetonation } from "../shared/explosion";
import { drawGravityHole } from "../shared/clutter";
import { drawWispBetween, WISP_SIZE } from "../shared/wisp";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../coinBurst";

interface Point {
  x: number;
  y: number;
}

export interface FlashMoment {
  kind: CritMoment;
  // the bars it can land on, from the flash's middle in its units, its own
  // floor's first; read every frame so a scroll carries them along
  bars: () => Point[];
  barHalfWidth: number;
  // a hit on bars()[bar] by a number of `color`; step is a snowball's
  // growth so far
  onHit: (bar: number, step: number, color: string) => void;
}

// the flash's own baked "x0123456789" glyphs (see index.ts's SpinGlyphs)
export interface MomentGlyphs {
  sprites: HTMLCanvasElement[];
  advances: number[];
  pad: number;
  font: number;
  index: (char: string) => number;
  color: string;
}

interface PlannedHit {
  bar: number;
  at: number;
  step: number;
}

interface Running {
  moment: FlashMoment;
  glyphs: MomentGlyphs;
  label: string;
  value: number;
  // the flash's font size, and each character's middle from its middle
  flashFont: number;
  charX: number[];
  viewportWidth: number;
  startedAt: number;
  hits: PlannedHit[];
  fired: number;
  endsAt: number;
  // where each bar was last seen, if one scrolls out of bars()
  lastBars: Point[];
  // a catapult's fall or a tornado's sweep: from this height to that one
  span: { from: number; to: number };
  // a lightning crit's bolts, their ends kept on the bars as they scroll
  bolts: Bolt[];
  // shakes a moment has kicked itself, off its hits (a blast, a collapse)
  kicked: number;
  shake: (intensity: number) => void;
}

let running: Running | null = null;

// the font the number plays out at, in the flash's units (about twice a
// bar's height)
const MOMENT_FONT = 200;
const HIT_SHAKE = 0.5;

const RAPID_FLY_MS = 180;
const RAPID_STAGGER_MS = 80;
const RAPID_SPREAD = 130;

const PIN_LEG_MS = 150;
const PIN_MAX_BOUNCES = 4;

const SNOW_FIRST_MS = 220;
const SNOW_LEG_MS = 170;
const SNOW_HOP = 120;

const JUGGLE_MS = 650;
const JUGGLE_SPIN_MS = 400;
const JUGGLE_GATHER_MS = 120;
const JUGGLE_DROP_MS = 230;
const JUGGLE_STAGGER_MS = 80;

const STOMP_GROW_MS = 260;
const STOMP_HIT_MS = 370;
const STOMP_SETTLE_MS = 250;
const STOMP_GROW = 1.25;
const STOMP_SHAKE = 1.6;

const DROPS = 30;
const DROP_FONT = 110;
const DROP_SHAKE = 0.12;
const BURST_MS = 100;

const STAMP_FIRST_MS = 120;
const STAMP_EACH_MS = 150;
const STAMP_LIFT = 140;
const STAMP_PRINT_MS = 900;
const STAMP_FONT = 160;

const CATAPULT_UP_MS = 250;
const CATAPULT_AWAY_MS = 150;
const CATAPULT_FALL_MS = 350;
const CATAPULT_LAND_MS = 250;
const CATAPULT_FONT = 260;
const CATAPULT_SHAKE = 1.4;

const TORNADO_FORM_MS = 300;
const TORNADO_DOWN_MS = 700;
const TORNADO_FLING_MS = 220;
const TORNADO_COPIES = 12;
const TORNADO_FONT = 90;

const LIGHTNING_RISE_MS = 140;
const LIGHTNING_FIRST_MS = 160;
const LIGHTNING_EVERY_MS = 90;
const LIGHTNING_HOLD_MS = 400;
const LIGHTNING_FADE_MS = 200;
const LIGHTNING_WIDTH = 8;
const LIGHTNING_TAIL_MS = 700;
const LIGHTNING_SHAKE = 0.9;
const LIGHTNING_BLAST = 130;
const LIGHTNING_FONT = 130;

// the number diving into the lowest bar in view, whose payout knocks up into
// the bar above, and on up, faster and paying a step more each time
const DOMINO_DIVE_MS = 180;
const DOMINO_FIRST_GAP_MS = 260;
const DOMINO_SPEEDUP = 0.78;
const DOMINO_MIN_GAP_MS = 110;
const DOMINO_ARC = 220;
const DOMINO_BLAST = 130;
const DOMINO_BLAST_STEP = 40;
const DOMINO_SHAKE = 0.5;
const DOMINO_SHAKE_STEP = 0.25;
const DOMINO_FONT = 110;
const DOMINO_TAIL_MS = 800;
const dominoGap = (k: number) =>
  Math.max(DOMINO_MIN_GAP_MS, DOMINO_FIRST_GAP_MS * DOMINO_SPEEDUP ** k);
// when the k-th bar up is knocked
const dominoAt = (k: number) => {
  let at = DOMINO_DIVE_MS;
  for (let i = 0; i < k; i++) at += dominoGap(i);
  return at;
};

// the number thrown off the top, then a meteor tearing in from the top
// corner, faster and faster, into one bar
const METEOR_LIFT_MS = 120;
const METEOR_FALL_MS = 380;
const METEOR_HIT_MS = METEOR_LIFT_MS + METEOR_FALL_MS;
const METEOR_EASE = 1.6;
const METEOR_SIZE = 3;
const METEOR_BLAST = 240;
const METEOR_SHAKE = 2.4;
const METEOR_CLUSTER = [
  { dx: -150, dy: -40, at: 70, size: 130 },
  { dx: 130, dy: 30, at: 120, size: 130 },
  { dx: -40, dy: 60, at: 170, size: 130 },
];
const METEOR_CLUSTER_SHAKE = 0.8;
const METEOR_PAYS = "x5";
const METEOR_FONT = 150;
const METEOR_TAIL_MS = 900;

// a black hole opening where the number is, swallowing it and the coins off
// every bar, then collapsing in a blast that flings them back
const HOLE_OPEN_MS = 250;
const HOLE_SIZE = 460;
const HOLE_SUCK_MS = 450;
// coins it swallows: one in BAR_SHARE off a bar, the rest from all over
// the screen; all of them flung back onto the bars
const HOLE_COINS = 800;
const HOLE_BAR_SHARE = 3;
// they leave over this long, one after another
const HOLE_SUCK_SPREAD_MS = 400;
// how far round its bar a coin starts, up or down
const HOLE_COIN_SCATTER = 60;
// the screen they come from, of the viewport's width from its middle
const HOLE_FIELD: [number, number] = [0.55, 0.9];
const HOLE_COLLAPSE_MS = 1150;
const HOLE_SHRINK_MS = 150;
const HOLE_RETURN_MS = 250;
const HOLE_RETURNED_MS = HOLE_COLLAPSE_MS + HOLE_RETURN_MS;
const HOLE_BLAST = 300;
const HOLE_SHAKE = 2.2;
const HOLE_COIN = 45;
const HOLE_PAYS = "x2";
const HOLE_FONT = 120;
const HOLE_TAIL_MS = 800;
const holeHash = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
// each coin's own randoms, -1..1 (where it starts and lands) and 0..1 (when
// it leaves, its size)
const holeU = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => holeHash(i, 1) * 2 - 1,
);
const holeV = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => holeHash(i, 2) * 2 - 1,
);
const holeStart = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => HOLE_OPEN_MS + holeHash(i, 3) * HOLE_SUCK_SPREAD_MS,
);
const holeSize = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => HOLE_COIN * (0.7 + 0.6 * holeHash(i, 4)),
);
const holeCoins: CoinBurstSprite[] = Array.from(
  { length: HOLE_COINS },
  (_, i) => ({
    kind: i % 4 === 0 ? "bill" : "coin",
    spinFrame: 0,
    axisAngle: (holeHash(i, 5) - 0.5) * Math.PI,
  }),
);

const ORBIT_GATHER_MS = 150;
const ORBIT_SPIN_MS = 450;
const ORBIT_GAP_MS = 90;
const ORBIT_FLING_MS = 200;
const ORBIT_FONT = 90;
// how far it's thrown along its orbit before curving onto its bar
const ORBIT_KICK = 0.8;

const TRAIN_LEAD_MS = 200;
const TRAIN_ROW_MS = 260;
const TRAIN_CARS = 4;
const TRAIN_GAP = 150;
const TRAIN_FONT = 150;
const TRAIN_CAR_FONT = 115;
// how high it rides over each bar's middle, and the rails under it
const TRAIN_RIDE = 95;
const TRAIN_RAIL = 50;

const BUBBLES_PER_BAR = 2;
const BUBBLE_R = 75;
const BUBBLE_FONT = 70;
const BUBBLE_WOBBLE = 40;
const BUBBLE_POP_MS = 150;
const BUBBLE_SHAKE = 0.25;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export function isMomentRunning(): boolean {
  return running !== null;
}

// the bar indexes top to bottom
function byHeight(bars: Point[]): number[] {
  return bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
}

// a pinball's bounces: the other bars, top and bottom ones in turn, then home
function pinballOrder(bars: Point[]): number[] {
  const others = byHeight(bars).filter((i) => i !== 0);
  const order: number[] = [];
  while (others.length && order.length < PIN_MAX_BOUNCES)
    order.push(order.length % 2 ? others.pop()! : others.shift()!);
  return [...order, 0];
}

// each character's juggled drop: the bars spread top to bottom
function juggleTargets(bars: Point[], count: number): number[] {
  const sorted = byHeight(bars);
  return Array.from(
    { length: count },
    (_, i) =>
      sorted[
        count === 1 ? 0 : Math.round((i * (sorted.length - 1)) / (count - 1))
      ],
  );
}

function drop(i: number, barCount: number, viewportWidth: number) {
  return {
    bar: i % barCount,
    delay: i * 12,
    duration: 450 + ((i * 37) % 200),
    // where along its bar, -1..1
    along: ((i * 53) % 100) / 50 - 1,
    arc: viewportWidth * (0.25 + ((i * 29) % 80) / 400),
  };
}

function bubble(i: number, barCount: number) {
  return {
    bar: i % barCount,
    delay: i * 40,
    duration: 600 + ((i * 53) % 250),
    // where along its bar, -1..1
    along: ((i * 71) % 100) / 50 - 1,
  };
}

const lightningAt = (i: number) => LIGHTNING_FIRST_MS + i * LIGHTNING_EVERY_MS;

// where a lightning crit's first bolt cracks down from, above the top bar
const lightningSky = (r: Running, bars: Point[], top: number) => ({
  x: bars[top].x + r.viewportWidth * 0.15,
  y: bars[top].y - r.viewportWidth * 1.2,
});

const orbitRelease = (i: number) =>
  ORBIT_GATHER_MS + ORBIT_SPIN_MS + i * ORBIT_GAP_MS;
// spinning ever faster
const orbitAngle = (i: number, count: number, ms: number) =>
  (i / count) * Math.PI * 2 + (ms / 1000) * (4 + ms / 150);

// the train's track: from the flash down a zigzag along the bars, top to
// bottom, one run across each
function trainTrack(r: Running, bars: Point[]) {
  const half = r.moment.barHalfWidth - 80;
  const points: Point[] = [{ x: 0, y: 0 }];
  byHeight(bars).forEach((bar, i) => {
    const b = bars[bar];
    const y = b.y - TRAIN_RIDE;
    const [from, to] =
      i % 2 ? [b.x + half, b.x - half] : [b.x - half, b.x + half];
    points.push({ x: from, y }, { x: to, y });
  });
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  return { points, lengths, total: lengths[lengths.length - 1] };
}

function trackAt(
  track: ReturnType<typeof trainTrack>,
  s: number,
): Point & { angle: number } {
  const { points, lengths } = track;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const a = points[i - 1];
  const b = points[i];
  const q = clamp01((s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1));
  return {
    x: lerp(a.x, b.x, q),
    y: lerp(a.y, b.y, q),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

function plan(r: Running, bars: Point[]): void {
  const count = r.label.length;
  const hit = (bar: number, at: number, step = 0) =>
    r.hits.push({ bar, at, step });
  switch (r.moment.kind) {
    case "rapidFireCrit":
      for (let i = 0; i < count; i++)
        hit(0, RAPID_FLY_MS + i * RAPID_STAGGER_MS);
      break;
    case "pinballCrit":
      pinballOrder(bars).forEach((bar, i) => hit(bar, (i + 1) * PIN_LEG_MS));
      break;
    case "snowballCrit":
      byHeight(bars).forEach((bar, i) =>
        hit(bar, SNOW_FIRST_MS + i * SNOW_LEG_MS, i),
      );
      break;
    case "juggleCrit":
      juggleTargets(bars, count).forEach((bar, i) =>
        hit(bar, JUGGLE_MS + i * JUGGLE_STAGGER_MS + JUGGLE_DROP_MS),
      );
      break;
    case "stompCrit":
      bars.forEach((_, bar) => hit(bar, STOMP_HIT_MS));
      break;
    case "rainCrit":
      for (let i = 0; i < DROPS; i++) {
        const d = drop(i, bars.length, r.viewportWidth);
        hit(d.bar, d.delay + d.duration);
      }
      break;
    case "stampCrit":
      byHeight(bars).forEach((bar, i) =>
        hit(bar, STAMP_FIRST_MS + i * STAMP_EACH_MS),
      );
      break;
    case "catapultCrit": {
      // flung off the top of the screen, crashing down past the lowest bar
      const lowest = Math.max(...bars.map((b) => b.y));
      r.span = {
        from: -r.viewportWidth * 1.2,
        to: lowest + r.viewportWidth * 0.3,
      };
      bars.forEach((b, bar) => hit(bar, catapultHitAt(r, b.y)));
      break;
    }
    case "tornadoCrit": {
      const ys = bars.map((b) => b.y);
      r.span = { from: Math.min(0, Math.min(...ys)), to: Math.max(...ys) };
      bars.forEach((b, bar) =>
        hit(bar, tornadoPassesAt(r, b.y) + TORNADO_FLING_MS),
      );
      break;
    }
    case "meteorCrit":
      // any bar in view but its own, if there's one
      hit(
        bars.length > 1 ? 1 + Math.floor(Math.random() * (bars.length - 1)) : 0,
        METEOR_HIT_MS,
      );
      break;
    case "blackHoleCrit":
      bars.forEach((_, bar) => hit(bar, HOLE_RETURNED_MS));
      break;
    case "dominoCrit":
      // bottom to top; step is how many it has knocked before
      byHeight(bars)
        .reverse()
        .forEach((bar, k) => hit(bar, dominoAt(k), k));
      break;
    case "lightningCrit": {
      // from the sky onto the top bar, then bar to bar down the building
      const order = byHeight(bars);
      order.forEach((bar, i) => {
        const from =
          i === 0 ? lightningSky(r, bars, bar) : { ...bars[order[i - 1]] };
        r.bolts.push(createBolt(from, { ...bars[bar] }, 3));
        hit(bar, lightningAt(i));
      });
      break;
    }
    case "orbitCrit":
      byHeight(bars).forEach((bar, i) =>
        hit(bar, orbitRelease(i) + ORBIT_FLING_MS),
      );
      break;
    case "trainCrit": {
      // a steady pace, the cars trailing in off the track's end after
      const track = trainTrack(r, bars);
      const trainMs = TRAIN_LEAD_MS + bars.length * TRAIN_ROW_MS;
      r.span = { from: 0, to: trainMs };
      byHeight(bars).forEach((bar, i) => {
        const mid = (track.lengths[1 + i * 2] + track.lengths[2 + i * 2]) / 2;
        hit(bar, (mid / track.total) * trainMs);
      });
      r.hits.sort((a, b) => a.at - b.at);
      r.endsAt = trainMs * (1 + (TRAIN_CARS * TRAIN_GAP) / track.total);
      return;
    }
    case "bubbleCrit":
      for (let i = 0; i < bars.length * BUBBLES_PER_BAR; i++) {
        const b = bubble(i, bars.length);
        hit(b.bar, b.delay + b.duration);
      }
      break;
  }
  r.hits.sort((a, b) => a.at - b.at);
  r.endsAt =
    Math.max(...r.hits.map((h) => h.at)) + (TAIL_MS[r.moment.kind] ?? 0);
}

// how long a moment keeps drawing after its last hit
const TAIL_MS: Partial<Record<CritMoment, number>> = {
  stompCrit: STOMP_SETTLE_MS,
  stampCrit: STAMP_PRINT_MS,
  catapultCrit: CATAPULT_LAND_MS,
  bubbleCrit: BUBBLE_POP_MS,
  lightningCrit: LIGHTNING_TAIL_MS,
  meteorCrit: METEOR_TAIL_MS,
  blackHoleCrit: HOLE_TAIL_MS,
  dominoCrit: DOMINO_TAIL_MS,
};

function shakeOf(kind: CritMoment, step: number): number {
  switch (kind) {
    case "stompCrit":
      return STOMP_SHAKE;
    case "catapultCrit":
      return CATAPULT_SHAKE;
    case "rainCrit":
      return DROP_SHAKE;
    case "bubbleCrit":
      return BUBBLE_SHAKE;
    case "lightningCrit":
      return LIGHTNING_SHAKE;
    case "meteorCrit":
      return METEOR_SHAKE;
    case "blackHoleCrit":
      return HIT_SHAKE;
    case "dominoCrit":
      return DOMINO_SHAKE + DOMINO_SHAKE_STEP * step;
    default:
      return HIT_SHAKE;
  }
}

const catapultY = (r: Running, ms: number) => {
  const p = clamp01(
    (ms - CATAPULT_UP_MS - CATAPULT_AWAY_MS) / CATAPULT_FALL_MS,
  );
  return lerp(r.span.from, r.span.to, p * p);
};

const catapultHitAt = (r: Running, y: number) =>
  CATAPULT_UP_MS +
  CATAPULT_AWAY_MS +
  Math.sqrt(clamp01((y - r.span.from) / (r.span.to - r.span.from))) *
    CATAPULT_FALL_MS;

const tornadoY = (r: Running, ms: number) =>
  lerp(
    r.span.from,
    r.span.to,
    clamp01((ms - TORNADO_FORM_MS) / TORNADO_DOWN_MS),
  );

const tornadoPassesAt = (r: Running, y: number) =>
  TORNADO_FORM_MS +
  clamp01((y - r.span.from) / Math.max(1, r.span.to - r.span.from)) *
    TORNADO_DOWN_MS;

export function launchMoment(
  moment: FlashMoment,
  glyphs: MomentGlyphs,
  label: string,
  flashFont: number,
  viewportWidth: number,
  now: number,
  shake: (intensity: number) => void,
): void {
  const chars = [...label].map(glyphs.index);
  if (chars.some((i) => i < 0)) return;
  const bars = moment.bars();
  if (bars.length === 0) return;
  const scale = flashFont / glyphs.font;
  let x = 0;
  for (const i of chars) x += glyphs.advances[i];
  x = (-x * scale) / 2;
  const charX = chars.map((i) => {
    const mid = x + (glyphs.advances[i] * scale) / 2;
    x += glyphs.advances[i] * scale;
    return mid;
  });
  running = {
    moment,
    glyphs,
    label,
    value: Number(label.slice(1)) || 0,
    flashFont,
    charX,
    viewportWidth,
    startedAt: now,
    hits: [],
    fired: 0,
    endsAt: 0,
    lastBars: bars,
    span: { from: 0, to: 0 },
    bolts: [],
    kicked: 0,
    shake,
  };
  plan(running, bars);
}

// text centred on (x, y) at `font`: turned rot, scaled sx/sy on its own axes,
// then stretched along `along` (radians) by `stretch`
function drawText(
  ctx: CanvasRenderingContext2D,
  glyphs: MomentGlyphs,
  text: string,
  x: number,
  y: number,
  font: number,
  opts: {
    rot?: number;
    sx?: number;
    sy?: number;
    alpha?: number;
    along?: number;
    stretch?: number;
  } = {},
): void {
  const scale = font / glyphs.font;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  ctx.translate(x, y);
  if (opts.stretch && opts.along !== undefined) {
    ctx.rotate(opts.along);
    ctx.scale(opts.stretch, 1 / opts.stretch);
    ctx.rotate(-opts.along);
  }
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.sx !== undefined || opts.sy !== undefined)
    ctx.scale(opts.sx ?? 1, opts.sy ?? 1);
  let width = 0;
  for (const c of text) width += glyphs.advances[glyphs.index(c)];
  let left = (-width * scale) / 2;
  for (const c of text) {
    const i = glyphs.index(c);
    const sprite = glyphs.sprites[i];
    ctx.drawImage(
      sprite,
      left - glyphs.pad * scale,
      (-sprite.height * scale) / 2,
      sprite.width * scale,
      sprite.height * scale,
    );
    left += glyphs.advances[i] * scale;
  }
  ctx.restore();
}

export function drawMoment(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  now: number,
): void {
  const r = running;
  if (!r) return;
  const ms = now - r.startedAt;
  const seen = r.moment.bars();
  const bars = r.lastBars.map((last, i) => seen[i] ?? last);
  r.lastBars = bars;
  while (r.fired < r.hits.length && r.hits[r.fired].at <= ms) {
    const { bar, step } = r.hits[r.fired++];
    r.shake(shakeOf(r.moment.kind, step));
    r.moment.onHit(bar, step, r.glyphs.color);
  }
  if (ms >= r.endsAt) {
    running = null;
    return;
  }
  ctx.save();
  ctx.translate(centerX, centerY);
  DRAW[r.moment.kind](ctx, r, ms, bars);
  ctx.restore();
}

type Draw = (
  ctx: CanvasRenderingContext2D,
  r: Running,
  ms: number,
  bars: Point[],
) => void;

// a spot along bar i, `side` -1..1 of the way from its middle to its ends
const along = (r: Running, bars: Point[], bar: number, side: number) => ({
  x: bars[bar].x + side * (r.moment.barHalfWidth - 120),
  y: bars[bar].y,
});

const DRAW: Record<CritMoment, Draw> = {
  rapidFireCrit(ctx, r, ms, bars) {
    const to = bars[0];
    const count = r.charX.length;
    for (let i = 0; i < count; i++) {
      const hitAt = RAPID_FLY_MS + i * RAPID_STAGGER_MS;
      if (ms >= hitAt) continue;
      // speeding up the whole way, so it hits at full speed
      const u = ms / hitAt;
      const p = u * u;
      drawText(
        ctx,
        r.glyphs,
        r.label[i],
        r.charX[i] +
          (to.x + (i - (count - 1) / 2) * RAPID_SPREAD - r.charX[i]) * p,
        to.y * p,
        lerp(r.flashFont, MOMENT_FONT, p),
        { sx: 1 - 0.3 * u, sy: 1 + 0.5 * u },
      );
    }
  },

  pinballCrit(ctx, r, ms, bars) {
    const legs = r.hits.length;
    const leg = Math.floor(ms / PIN_LEG_MS);
    if (leg >= legs) return;
    const spot = (i: number) => along(r, bars, r.hits[i].bar, i % 2 ? -1 : 1);
    const from = leg === 0 ? { x: 0, y: 0 } : spot(leg - 1);
    const to = spot(leg);
    const q = (ms % PIN_LEG_MS) / PIN_LEG_MS;
    drawText(
      ctx,
      r.glyphs,
      r.label,
      lerp(from.x, to.x, q),
      lerp(from.y, to.y, q),
      leg === 0 ? lerp(r.flashFont, MOMENT_FONT, q) : MOMENT_FONT,
      {
        rot: ms * 0.03,
        along: Math.atan2(to.y - from.y, to.x - from.x),
        stretch: 1.35,
      },
    );
  },

  snowballCrit(ctx, r, ms, bars) {
    const legs = r.hits.length;
    const leg =
      ms < SNOW_FIRST_MS
        ? 0
        : 1 + Math.floor((ms - SNOW_FIRST_MS) / SNOW_LEG_MS);
    if (leg >= legs) return;
    const spot = (i: number) => along(r, bars, r.hits[i].bar, i % 2 ? -1 : 1);
    const from = leg === 0 ? { x: 0, y: 0 } : spot(leg - 1);
    const to = spot(leg);
    const q =
      leg === 0
        ? ms / SNOW_FIRST_MS
        : ((ms - SNOW_FIRST_MS) % SNOW_LEG_MS) / SNOW_LEG_MS;
    // a hop off each bar onto the next, growing a step with each one
    const hop = leg === 0 ? 0 : SNOW_HOP * 4 * q * (1 - q);
    drawText(
      ctx,
      r.glyphs,
      `x${r.value + leg}`,
      lerp(from.x, to.x, q),
      lerp(from.y, to.y, leg === 0 ? q * q : q) - hop,
      leg === 0
        ? lerp(r.flashFont, MOMENT_FONT * 0.9, q)
        : MOMENT_FONT * (0.9 + 0.15 * leg),
      { rot: (to.x - from.x) * q * 0.004 + leg * 2 },
    );
  },

  juggleCrit(ctx, r, ms, bars) {
    const count = r.charX.length;
    const rx = r.viewportWidth * 0.22;
    const ry = r.viewportWidth * 0.12;
    const juggled = (i: number, t: number): Point => {
      const a = (2 * Math.PI * t) / JUGGLE_SPIN_MS + (2 * Math.PI * i) / count;
      const q = clamp01(t / JUGGLE_GATHER_MS);
      return {
        x: lerp(r.charX[i], rx * Math.cos(a), q),
        y: lerp(0, ry * Math.sin(a), q),
      };
    };
    for (let i = 0; i < count; i++) {
      const release = JUGGLE_MS + i * JUGGLE_STAGGER_MS;
      if (ms >= release + JUGGLE_DROP_MS) continue;
      let at = juggled(i, Math.min(ms, release));
      if (ms > release) {
        const p = ((ms - release) / JUGGLE_DROP_MS) ** 2;
        const to = bars[r.hits[i].bar];
        at = { x: lerp(at.x, to.x, p), y: lerp(at.y, to.y, p) };
      }
      drawText(
        ctx,
        r.glyphs,
        r.label[i],
        at.x,
        at.y,
        lerp(r.flashFont, MOMENT_FONT * 1.1, clamp01(ms / JUGGLE_GATHER_MS)),
        { rot: ms * 0.02 * (i % 2 ? 1 : -1) },
      );
    }
  },

  stompCrit(ctx, r, ms, bars) {
    const midY = bars.reduce((sum, b) => sum + b.y, 0) / bars.length;
    const big = r.flashFont * STOMP_GROW;
    if (ms < STOMP_GROW_MS) {
      const e = 1 - (1 - ms / STOMP_GROW_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        -r.viewportWidth * 0.05 * e,
        lerp(r.flashFont, big, e),
      );
    } else if (ms < STOMP_HIT_MS) {
      const q = (ms - STOMP_GROW_MS) / (STOMP_HIT_MS - STOMP_GROW_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(-r.viewportWidth * 0.05, midY, q * q),
        lerp(big, r.flashFont * 1.2, q),
      );
    } else {
      // squashed flat by the stomp, fading
      const q = (ms - STOMP_HIT_MS) / STOMP_SETTLE_MS;
      const k = Math.exp(-q * 5);
      drawText(ctx, r.glyphs, r.label, 0, midY, r.flashFont * 1.2, {
        sx: 1 + 0.3 * k,
        sy: 1 - 0.5 * k,
        alpha: 1 - q,
      });
    }
  },

  rainCrit(ctx, r, ms, bars) {
    if (ms < BURST_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + ms / (BURST_MS * 2)),
        {
          alpha: 1 - ms / BURST_MS,
        },
      );
    for (let i = 0; i < DROPS; i++) {
      const d = drop(i, bars.length, r.viewportWidth);
      const p = (ms - d.delay) / d.duration;
      if (p < 0 || p >= 1) continue;
      const to = along(r, bars, d.bar, d.along);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p * p - d.arc * 4 * p * (1 - p),
        DROP_FONT,
      );
    }
  },

  stampCrit(ctx, r, ms, bars) {
    const order = byHeight(bars);
    const hitAt = (i: number) => STAMP_FIRST_MS + i * STAMP_EACH_MS;
    // the glowing prints it leaves on the bars it has hit
    order.forEach((bar, i) => {
      const since = ms - hitAt(i);
      if (since < 0 || since >= STAMP_PRINT_MS) return;
      const k = 1 - since / STAMP_PRINT_MS;
      const at = bars[bar];
      ctx.save();
      ctx.globalAlpha = 0.6 * k;
      drawGlow(
        ctx,
        glowStops(r.glyphs.color),
        at.x,
        at.y,
        r.moment.barHalfWidth * 0.7,
        0.4,
      );
      ctx.restore();
      drawText(ctx, r.glyphs, r.label, at.x, at.y, STAMP_FONT * 0.8, {
        alpha: 0.85 * k,
      });
    });
    // the stamp: lifting off each bar and coming down hard on the next
    const last = order.length - 1;
    if (ms > hitAt(last) + 120) return;
    const i = Math.min(
      last,
      Math.max(0, Math.floor((ms - STAMP_FIRST_MS) / STAMP_EACH_MS) + 1),
    );
    const legMs = i === 0 ? STAMP_FIRST_MS : STAMP_EACH_MS;
    const q = clamp01((ms - (hitAt(i) - legMs)) / legMs);
    const from = i === 0 ? { x: 0, y: 0 } : bars[order[i - 1]];
    const to = bars[order[i]];
    const down = q * q;
    const lift =
      i === 0 ? 0 : Math.sin(Math.PI * Math.min(1, q * 1.2)) * STAMP_LIFT;
    const font = i === 0 ? lerp(r.flashFont, STAMP_FONT, down) : STAMP_FONT;
    const squash = ms >= hitAt(i) ? Math.exp(-(ms - hitAt(i)) / 40) : 0;
    drawText(
      ctx,
      r.glyphs,
      r.label,
      lerp(from.x, to.x, down),
      lerp(from.y, to.y - font * 0.35, down) - lift,
      font,
      { sx: 1 + 0.3 * squash, sy: 1 - 0.4 * squash },
    );
  },

  catapultCrit(ctx, r, ms, bars) {
    const x = bars[0].x;
    if (ms < CATAPULT_UP_MS) {
      // flung up off the top of the screen, spinning
      const p = (ms / CATAPULT_UP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * p,
        lerp(0, r.span.from, p),
        lerp(r.flashFont, r.flashFont * 1.2, p),
        {
          rot: p * 8,
          along: Math.PI / 2,
          stretch: 1 + 0.5 * p,
        },
      );
      return;
    }
    if (ms < CATAPULT_UP_MS + CATAPULT_AWAY_MS) return;
    const land = CATAPULT_UP_MS + CATAPULT_AWAY_MS + CATAPULT_FALL_MS;
    if (ms < land) {
      // crashing straight down through every bar
      drawText(ctx, r.glyphs, r.label, x, catapultY(r, ms), CATAPULT_FONT, {
        along: Math.PI / 2,
        stretch: 1.5,
      });
      return;
    }
    const q = (ms - land) / CATAPULT_LAND_MS;
    ctx.save();
    ctx.globalAlpha = 1 - q;
    drawGlow(
      ctx,
      glowStops(r.glyphs.color),
      x,
      r.span.to,
      r.viewportWidth * 0.4 * (0.5 + q),
    );
    ctx.restore();
    drawText(ctx, r.glyphs, r.label, x, r.span.to, CATAPULT_FONT, {
      sx: 1.4,
      sy: 0.6,
      alpha: 1 - q,
    });
  },

  tornadoCrit(ctx, r, ms, bars) {
    const x = bars[0].x;
    const form = clamp01(ms / TORNADO_FORM_MS);
    const cy =
      ms < TORNADO_FORM_MS ? lerp(0, r.span.from, form) : tornadoY(r, ms);
    // the number breaking up into the funnel's copies
    if (form < 1)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * form,
        cy,
        lerp(r.flashFont, TORNADO_FONT, form),
        {
          alpha: 1 - form,
        },
      );
    const fade = clamp01((TORNADO_FORM_MS + TORNADO_DOWN_MS + 150 - ms) / 150);
    const w = r.viewportWidth;
    for (let k = 0; k < TORNADO_COPIES; k++) {
      const h = k / (TORNADO_COPIES - 1);
      const a = ms * 0.02 + k * 1.3;
      const radius = (w * 0.03 + w * 0.17 * h) * form;
      const depth = Math.sin(a);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * form + Math.cos(a) * radius,
        cy - w * 0.3 * h * form,
        TORNADO_FONT * (1 + 0.25 * depth),
        { alpha: (0.55 + 0.45 * depth) * fade * form, rot: Math.cos(a) * 0.4 },
      );
    }
    // a copy flung off onto each bar as the funnel passes it
    bars.forEach((b, bar) => {
      const passes = tornadoPassesAt(r, b.y);
      const t = (ms - passes) / TORNADO_FLING_MS;
      if (t < 0 || t >= 1) return;
      const to = along(r, bars, bar, bar % 2 ? -1 : 1);
      const fromY = tornadoY(r, passes) - w * 0.08;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(x, to.x, t),
        lerp(fromY, to.y, t) - w * 0.1 * 4 * t * (1 - t),
        MOMENT_FONT * 0.75,
        { rot: t * 6 },
      );
    });
  },

  orbitCrit(ctx, r, ms, bars) {
    const order = byHeight(bars);
    const count = order.length;
    const gather = clamp01(ms / ORBIT_GATHER_MS);
    const rx = r.viewportWidth * 0.3 * gather;
    const ry = rx * 0.4;
    const last = orbitRelease(count - 1);
    // the moons behind it, the number, then the moons in front and the
    // flung ones
    for (const front of [false, true]) {
      if (front)
        drawText(
          ctx,
          r.glyphs,
          r.label,
          0,
          0,
          lerp(r.flashFont, r.flashFont * 0.8, gather),
          { alpha: clamp01(1 - (ms - last) / ORBIT_FLING_MS) },
        );
      for (let i = 0; i < count; i++) {
        const release = orbitRelease(i);
        if (ms >= release + ORBIT_FLING_MS) continue;
        const a = orbitAngle(i, count, Math.min(ms, release));
        const at = { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
        if (ms < release) {
          const depth = Math.sin(a);
          if (depth > 0 !== front) continue;
          drawText(
            ctx,
            r.glyphs,
            r.label,
            at.x,
            at.y,
            ORBIT_FONT * (1 + 0.3 * depth) * lerp(0.4, 1, gather),
            { alpha: 0.75 + 0.25 * depth },
          );
          continue;
        }
        if (!front) continue;
        // flung off along its orbit, curving onto its bar at full speed
        const p = (ms - release) / ORBIT_FLING_MS;
        const to = along(r, bars, order[i], i % 2 ? -1 : 1);
        drawText(
          ctx,
          r.glyphs,
          r.label,
          lerp(at.x - Math.sin(a) * rx * ORBIT_KICK * p, to.x, p * p),
          lerp(at.y + Math.cos(a) * ry * ORBIT_KICK * p, to.y, p * p),
          lerp(ORBIT_FONT, MOMENT_FONT * 0.8, p),
          { rot: p * 6 },
        );
      }
    }
  },

  trainCrit(ctx, r, ms, bars) {
    const track = trainTrack(r, bars);
    const trainMs = r.span.to;
    const head = (ms / trainMs) * track.total;
    // the rails it lays as it goes, fading once it's through
    const railFade = clamp01((r.endsAt - ms) / 300);
    ctx.save();
    ctx.globalAlpha = 0.7 * railFade;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.setLineDash([30, 22]);
    ctx.beginPath();
    ctx.moveTo(track.points[0].x, track.points[0].y + TRAIN_RAIL);
    for (let i = 1; i < track.points.length; i++) {
      if (track.lengths[i - 1] >= head) break;
      const p =
        track.lengths[i] <= head ? track.points[i] : trackAt(track, head);
      ctx.lineTo(p.x, p.y + TRAIN_RAIL);
    }
    ctx.stroke();
    ctx.restore();
    for (let c = TRAIN_CARS; c >= 0; c--) {
      const s = head - c * TRAIN_GAP;
      if (s < 0 || s >= track.total) continue;
      const p = trackAt(track, s);
      const font =
        c === 0
          ? lerp(r.flashFont, TRAIN_FONT, clamp01(s / TRAIN_GAP))
          : TRAIN_CAR_FONT;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        p.x,
        p.y + Math.sin(ms * 0.05 + c) * 6,
        font,
        { along: p.angle, stretch: 1.15 },
      );
    }
  },

  bubbleCrit(ctx, r, ms, bars) {
    if (ms < BURST_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + ms / (BURST_MS * 2)),
        { alpha: 1 - ms / BURST_MS },
      );
    ctx.save();
    ctx.lineWidth = 6;
    for (let i = 0; i < bars.length * BUBBLES_PER_BAR; i++) {
      const b = bubble(i, bars.length);
      const t = ms - b.delay;
      if (t < 0 || t >= b.duration + BUBBLE_POP_MS) continue;
      const to = along(r, bars, b.bar, b.along);
      if (t >= b.duration) {
        // popped: a ring bursting off where it landed
        const q = (t - b.duration) / BUBBLE_POP_MS;
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          to.x,
          to.y - BUBBLE_R,
          BUBBLE_R * (1 + 0.8 * q),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        continue;
      }
      // wobbling down onto its bar, blown up to size as it leaves
      const p = t / b.duration;
      const grow = Math.min(1, p * 5);
      const x = to.x * p + Math.sin(p * 9 + i) * BUBBLE_WOBBLE * (1 - p);
      const y = (to.y - BUBBLE_R) * p;
      const radius = BUBBLE_R * grow;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(186,230,253,0.18)";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(
        x - radius * 0.4,
        y - radius * 0.45,
        radius * 0.22,
        radius * 0.12,
        -0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      drawText(ctx, r.glyphs, r.label, x, y, BUBBLE_FONT * grow);
    }
    ctx.restore();
  },

  lightningCrit(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const top = bars[order[0]];
    if (ms < LIGHTNING_RISE_MS) {
      // shot up off the top into the sky the bolt comes down from
      const p = (ms / LIGHTNING_RISE_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(0, top.y - r.viewportWidth, p),
        r.flashFont,
        { along: Math.PI / 2, stretch: 1 + p, alpha: 1 - p },
      );
    }
    const fadesAt = lightningAt(order.length - 1) + LIGHTNING_HOLD_MS;
    // the whole chain stays lit as it grows, then fades together
    const boltAlpha = 1 - clamp01((ms - fadesAt) / LIGHTNING_FADE_MS);
    order.forEach((bar, i) => {
      const at = bars[bar];
      const since = ms - lightningAt(i);
      if (since < 0) return;
      const last = i === order.length - 1;
      if (boltAlpha > 0) {
        // its ends kept on the bars as they scroll
        const bolt = r.bolts[i];
        const from = i === 0 ? lightningSky(r, bars, bar) : bars[order[i - 1]];
        bolt.from.x = from.x;
        bolt.from.y = from.y;
        bolt.to.x = at.x;
        bolt.to.y = at.y;
        drawBolt(ctx, bolt, boltAlpha, LIGHTNING_WIDTH, "#ffffff");
      }
      drawDetonation(ctx, at, since, LIGHTNING_BLAST * (last ? 1.3 : 1), now);
      drawPays(ctx, r, "x2", at, since, LIGHTNING_FONT, LIGHTNING_TAIL_MS);
    });
  },

  meteorCrit(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    if (ms < METEOR_LIFT_MS) {
      // thrown up off the top into the sky the meteor comes down from
      const p = (ms / METEOR_LIFT_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, w * 0.4 * p, -w * 1.2 * p, r.flashFont, {
        along: -Math.PI / 3,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    const target = r.hits[0].bar;
    const to = along(r, bars, target, 0.4);
    const top = Math.min(...bars.map((b) => b.y));
    const from = { x: w * 0.9, y: top - w * 1.1 };
    const meteorAt = (t: number) => {
      const p = clamp01((t - METEOR_LIFT_MS) / METEOR_FALL_MS) ** METEOR_EASE;
      return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) };
    };
    drawWispBetween(
      ctx,
      meteorAt,
      ms,
      now,
      WISP_SIZE * METEOR_SIZE,
      1,
      METEOR_LIFT_MS,
      METEOR_HIT_MS,
    );
    // the crater: one big blast, then more going off round it
    const since = ms - METEOR_HIT_MS;
    drawDetonation(ctx, to, since, METEOR_BLAST, now);
    METEOR_CLUSTER.forEach((c, i) => {
      if (since >= c.at && r.kicked === i) {
        r.kicked++;
        r.shake(METEOR_CLUSTER_SHAKE);
      }
      drawDetonation(
        ctx,
        { x: to.x + c.dx, y: to.y + c.dy },
        since - c.at,
        c.size,
        now,
      );
    });
    drawPays(
      ctx,
      r,
      METEOR_PAYS,
      bars[target],
      since,
      METEOR_FONT,
      METEOR_TAIL_MS,
    );
  },

  blackHoleCrit(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    // the number swallowed first, spiralling into the hole as it opens
    const gulp = clamp01(ms / HOLE_OPEN_MS);
    if (gulp < 1)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - gulp), {
        rot: gulp * gulp * 6,
      });
    const size =
      ms < HOLE_COLLAPSE_MS - HOLE_SHRINK_MS
        ? HOLE_SIZE *
          (1 - (1 - gulp) ** 3) *
          (1 + 0.15 * clamp01((ms - HOLE_OPEN_MS) / 700))
        : HOLE_SIZE *
          1.15 *
          clamp01((HOLE_COLLAPSE_MS - ms) / HOLE_SHRINK_MS) ** 2;
    ctx.save();
    drawGravityHole(ctx, { x: 0, y: 0 }, size, 1, ms, now);
    ctx.restore();
    const base = ctx.getTransform();
    const w = r.viewportWidth;
    const n = bars.length;
    beginCoinBatch(ctx);
    // coins off every bar and from all over the screen spiralling into it
    for (let i = 0; i < HOLE_COINS; i++) {
      const p = (ms - holeStart[i]) / HOLE_SUCK_MS;
      if (p < 0 || p >= 1) continue;
      let x: number;
      let y: number;
      if (i % HOLE_BAR_SHARE === 0) {
        const b = bars[i % n];
        x = b.x + holeU[i] * (r.moment.barHalfWidth - 60);
        y = b.y + holeV[i] * HOLE_COIN_SCATTER;
      } else {
        x = holeU[i] * w * HOLE_FIELD[0];
        y = holeV[i] * w * HOLE_FIELD[1];
      }
      const a = Math.atan2(y, x) + p * p * 5;
      const reach = Math.hypot(x, y) * (1 - p) ** 1.5;
      const coin = holeCoins[i];
      coin.spinFrame = ms * 0.02 + i;
      drawCoinBurstFrame(
        ctx,
        coin,
        Math.cos(a) * reach,
        Math.sin(a) * reach,
        holeSize[i] * (1 - p * 0.7),
        base,
      );
    }
    // the collapse, flinging them all back out onto the bars
    const since = ms - HOLE_COLLAPSE_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(HOLE_SHAKE);
    }
    drawDetonation(ctx, { x: 0, y: 0 }, since, HOLE_BLAST, now);
    const back = since / HOLE_RETURN_MS;
    if (back >= 0 && back < 1)
      for (let i = 0; i < HOLE_COINS; i++) {
        const b = bars[i % n];
        const k = back * back;
        const coin = holeCoins[i];
        coin.spinFrame = ms * 0.02 + i;
        drawCoinBurstFrame(
          ctx,
          coin,
          (b.x + holeV[i] * (r.moment.barHalfWidth - 60)) * k,
          (b.y + holeU[i] * HOLE_COIN_SCATTER) * k,
          holeSize[i] * 1.2,
          base,
        );
      }
    endCoinBatch(ctx);
    bars.forEach((b) =>
      drawPays(
        ctx,
        r,
        HOLE_PAYS,
        b,
        ms - HOLE_RETURNED_MS,
        HOLE_FONT,
        HOLE_TAIL_MS,
      ),
    );
  },

  dominoCrit(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars).reverse();
    // each knock lands on alternate ends of its bar
    const spot = (k: number) => along(r, bars, order[k], k % 2 ? -0.7 : 0.7);
    if (ms < DOMINO_DIVE_MS) {
      // diving into the lowest bar, faster and faster
      const p = (ms / DOMINO_DIVE_MS) ** 2;
      const to = spot(0);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p,
        lerp(r.flashFont, MOMENT_FONT, p),
        { rot: p * 4 },
      );
    }
    order.forEach((_, k) => {
      const at = dominoAt(k);
      if (k > 0) {
        // knocked up off the bar below in an arc, speeding into this one
        const from = spot(k - 1);
        const to = spot(k);
        const gap = dominoGap(k - 1);
        drawWispBetween(
          ctx,
          (t) => {
            const p = clamp01((t - (at - gap)) / gap) ** 1.3;
            return {
              x: lerp(from.x, to.x, p),
              y: lerp(from.y, to.y, p) - DOMINO_ARC * Math.sin(Math.PI * p),
            };
          },
          ms,
          now,
          WISP_SIZE * (1.2 + 0.3 * k),
          Math.min(1, 0.3 + 0.2 * k),
          at - gap,
          at,
        );
      }
      const last = k === order.length - 1;
      drawDetonation(
        ctx,
        spot(k),
        ms - at,
        (DOMINO_BLAST + DOMINO_BLAST_STEP * k) * (last ? 1.5 : 1),
        now,
      );
      drawPays(
        ctx,
        r,
        `x${k + 1}`,
        bars[order[k]],
        ms - at,
        DOMINO_FONT + 15 * k,
        DOMINO_TAIL_MS,
      );
    });
  },
};

// a payout's multiplier slamming down from big beside its bar, rising off it
function drawPays(
  ctx: CanvasRenderingContext2D,
  r: Running,
  label: string,
  at: Point,
  since: number,
  font: number,
  ms: number,
): void {
  const t = since / ms;
  if (t < 0 || t >= 1) return;
  drawText(
    ctx,
    r.glyphs,
    label,
    at.x + r.moment.barHalfWidth * 0.5,
    at.y - 120 - 120 * (1 - (1 - t) ** 2),
    font * lerp(2.4, 1, clamp01(since / 110) ** 2),
    { alpha: t < 0.7 ? 1 : (1 - t) / 0.3 },
  );
}

// a glow of `color` fading out, per color
const glowStopsByColor = new Map<string, FadeStops>();
function glowStops(color: string): FadeStops {
  let stops = glowStopsByColor.get(color);
  if (!stops) {
    stops = fadeStops(color);
    glowStopsByColor.set(color, stops);
  }
  return stops;
}
