// crit moments: once a crit's flash has slammed in and sat, its number plays
// out onto the income bars in view (see shared/critTypes' CritMoment): fired
// at its bar character by character, pinballing between bars, snowballing
// down them, juggled onto them, stomped onto all of them, rained onto them,
// stamped onto each, zipped across each, crashed down through them from a
// catapult or flung onto them by a tornado.
// Every hit calls back so the floors can jolt and land their levels
import type { CritMoment } from "../shared/critTypes";
import { drawGlow, fadeStops, type FadeStops } from "../shared/glowSprite";

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

const ZIP_FIRST_MS = 150;
const ZIP_PASS_MS = 170;
const ZIP_DROP_MS = 60;
const ZIP_FONT = 150;
const ZIP_STITCH_MS = 900;

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
    case "stampCrit":
      byHeight(bars).forEach((bar, i) =>
        hit(bar, STAMP_FIRST_MS + i * STAMP_EACH_MS),
      );
      break;
    case "zipCrit":
      byHeight(bars).forEach((bar, i) =>
        hit(bar, ZIP_FIRST_MS + i * (ZIP_PASS_MS + ZIP_DROP_MS) + ZIP_PASS_MS),
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
  }
  r.hits.sort((a, b) => a.at - b.at);
  r.endsAt =
    Math.max(...r.hits.map((h) => h.at)) + (TAIL_MS[r.moment.kind] ?? 0);
}

// how long a moment keeps drawing after its last hit
const TAIL_MS: Partial<Record<CritMoment, number>> = {
  stompCrit: STOMP_SETTLE_MS,
  stampCrit: STAMP_PRINT_MS,
  zipCrit: ZIP_STITCH_MS,
  catapultCrit: CATAPULT_LAND_MS,
};

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
        : kind === "catapultCrit"
          ? CATAPULT_SHAKE
          : kind === "rainCrit"
            ? DROP_SHAKE
            : HIT_SHAKE,
    );
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

  zipCrit(ctx, r, ms, bars) {
    const order = byHeight(bars);
    const half = r.moment.barHalfWidth - 60;
    const start = (i: number) => ZIP_FIRST_MS + i * (ZIP_PASS_MS + ZIP_DROP_MS);
    // each pass runs one way across its bar, the next back the other way
    const pass = (i: number) => {
      const b = bars[order[i]];
      const [from, to] =
        i % 2 ? [b.x + half, b.x - half] : [b.x - half, b.x + half];
      return { from, to, y: b.y };
    };
    // the stitches it leaves along each bar
    ctx.save();
    ctx.strokeStyle = r.glyphs.color;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.setLineDash([40, 28]);
    for (let i = 0; i < order.length; i++) {
      const q = clamp01((ms - start(i)) / ZIP_PASS_MS);
      const fade = 1 - Math.max(0, ms - start(i) - ZIP_PASS_MS) / ZIP_STITCH_MS;
      if (q <= 0 || fade <= 0) continue;
      const p = pass(i);
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.moveTo(p.from, p.y);
      ctx.lineTo(lerp(p.from, p.to, q), p.y);
      ctx.stroke();
    }
    ctx.restore();
    // the needle
    if (ms < ZIP_FIRST_MS) {
      const p = (ms / ZIP_FIRST_MS) ** 2;
      const first = pass(0);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        first.from * p,
        first.y * p,
        lerp(r.flashFont, ZIP_FONT, p),
      );
      return;
    }
    for (let i = 0; i < order.length; i++) {
      const t = ms - start(i);
      if (t < 0 || t >= ZIP_PASS_MS + ZIP_DROP_MS) continue;
      const p = pass(i);
      if (t < ZIP_PASS_MS) {
        drawText(
          ctx,
          r.glyphs,
          r.label,
          lerp(p.from, p.to, t / ZIP_PASS_MS),
          p.y + Math.sin(t * 0.25) * 20,
          ZIP_FONT,
          { along: 0, stretch: 1.4 },
        );
      } else if (i < order.length - 1) {
        const q = (t - ZIP_PASS_MS) / ZIP_DROP_MS;
        drawText(
          ctx,
          r.glyphs,
          r.label,
          p.to,
          lerp(p.y, pass(i + 1).y, q),
          ZIP_FONT,
          {
            along: Math.PI / 2,
            stretch: 1.3,
          },
        );
      }
    }
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
};

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
