// crit moments: once a crit's flash has slammed in and sat, its number plays
// out onto the income bars in view (see shared/critTypes' CritMoment): fired
// at its bar character by character, pinballing between bars, snowballing
// down them, juggled onto them, stomped onto all of them or rained onto them.
// Every hit calls back so the floors can jolt and land their levels
import type { CritMoment } from "../shared/critTypes";

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
  // a hit on bars()[bar]; step is a snowball's growth so far
  onHit: (bar: number, step: number) => void;
}

// the flash's own baked "x0123456789" glyphs (see index.ts's SpinGlyphs)
export interface MomentGlyphs {
  sprites: HTMLCanvasElement[];
  advances: number[];
  pad: number;
  font: number;
  index: (char: string) => number;
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
  }
  r.hits.sort((a, b) => a.at - b.at);
  r.endsAt =
    Math.max(...r.hits.map((h) => h.at)) +
    (r.moment.kind === "stompCrit" ? STOMP_SETTLE_MS : 0);
}

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
    const kind = r.moment.kind;
    r.shake(
      kind === "stompCrit"
        ? STOMP_SHAKE
        : kind === "rainCrit"
          ? DROP_SHAKE
          : HIT_SHAKE,
    );
    r.moment.onHit(bar, step);
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
};
