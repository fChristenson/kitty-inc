// floor crits playing a crit's number out onto the income bars in view once
// its flash has slammed in and sat (see critTypes' CritMoment). Each kind is
// its own module under ../crits, loaded when its crit is armed or played;
// every hit calls back so the floors can jolt and land their levels
import type { CritMoment } from "../../critTypes";
import { fadeStops, type FadeStops } from "../../../shared/glowSprite";
import type { Bolt } from "../../../shared/lightning";
import type { Disk, Orbit } from "../../../shared/galaxy";
import { loadWhenIdle } from "../../../shared/idle";

export interface Point {
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
  // bars()[bar] leaping off its floor for ms, landing back down (or hauled
  // up, held and dropped)
  onLift?: (bar: number, ms: number, haul: boolean) => void;
}

// the flash's own baked "x0123456789" glyphs (see critFlash's SpinGlyphs)
export interface MomentGlyphs {
  sprites: HTMLCanvasElement[];
  advances: number[];
  pad: number;
  font: number;
  index: (char: string) => number;
  color: string;
}

export interface PlannedHit {
  bar: number;
  at: number;
  step: number;
}

export interface PlannedLift {
  bar: number;
  at: number;
  ms: number;
  haul: boolean;
}

export interface Running {
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
  lifts: PlannedLift[];
  lifted: number;
  endsAt: number;
  // where each bar was last seen, if one scrolls out of bars()
  lastBars: Point[];
  // a catapult's fall or a tornado's sweep: from this height to that one
  span: { from: number; to: number };
  // a lightning crit's bolts, their ends kept on the bars as they scroll
  bolts: Bolt[];
  // shakes a moment has kicked itself, off its hits (a blast, a collapse)
  kicked: number;
  // a galaxy crit's disk and its stars, planned at launch
  galaxy: { disk: Disk; stars: Orbit[] } | null;
  shake: (intensity: number) => void;
}

let running: Running | null = null;

// the font the number plays out at, in the flash's units (about twice a
// bar's height)
export const MOMENT_FONT = 200;
export const HIT_SHAKE = 0.5;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// the bar indexes top to bottom
export function byHeight(bars: Point[]): number[] {
  return bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
}

// text centred on (x, y) at `font`: turned rot, scaled sx/sy on its own axes,
// then stretched along `along` (radians) by `stretch`
export function drawText(
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

export type Draw = (
  ctx: CanvasRenderingContext2D,
  r: Running,
  ms: number,
  bars: Point[],
) => void;

// a spot along bar i, `side` -1..1 of the way from its middle to its ends
export const along = (
  r: Running,
  bars: Point[],
  bar: number,
  side: number,
) => ({
  x: bars[bar].x + side * (r.moment.barHalfWidth - 120),
  y: bars[bar].y,
});

// a payout's multiplier slamming down from big beside its bar, rising off it
export function drawPays(
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
export function glowStops(color: string): FadeStops {
  let stops = glowStopsByColor.get(color);
  if (!stops) {
    stops = fadeStops(color);
    glowStopsByColor.set(color, stops);
  }
  return stops;
}

// a floor crit kind: plan lays out its hits (and any bars leaping off their
// floors) on the bars, draw plays it
export interface FloorCritDef {
  plan(
    r: Running,
    bars: Point[],
    hit: (bar: number, at: number, step?: number) => void,
    lift: (bar: number, at: number, ms: number, haul?: boolean) => void,
  ): void;
  draw: Draw;
  // how long it keeps drawing after its last hit
  tailMs?: number;
  // the shake a hit kicks, by its step
  shake?: (step: number) => number;
}

const DEFS: Partial<Record<CritMoment, FloorCritDef>> = {};

// each kind's module calls this once it loads
export function registerFloorCrit(kind: CritMoment, def: FloorCritDef): void {
  DEFS[kind] = def;
}

const LOADERS: Record<CritMoment, () => Promise<unknown>> = {
  rapidFireCrit: () => import("../crits/rapidFireCrit"),
  pinballCrit: () => import("../crits/pinballCrit"),
  snowballCrit: () => import("../crits/snowballCrit"),
  juggleCrit: () => import("../crits/juggleCrit"),
  stompCrit: () => import("../crits/stompCrit"),
  rainCrit: () => import("../crits/rainCrit"),
  stampCrit: () => import("../crits/stampCrit"),
  catapultCrit: () => import("../crits/catapultCrit"),
  tornadoCrit: () => import("../crits/tornadoCrit"),
  orbitCrit: () => import("../crits/orbitCrit"),
  trainCrit: () => import("../crits/trainCrit"),
  bubbleCrit: () => import("../crits/bubbleCrit"),
  lightningCrit: () => import("../crits/lightningCrit"),
  meteorCrit: () => import("../crits/meteorCrit"),
  blackHoleCrit: () => import("../crits/blackHoleCrit"),
  dominoCrit: () => import("../crits/dominoCrit"),
  meteorShowerCrit: () => import("../crits/meteorShowerCrit"),
  volcanoCrit: () => import("../crits/volcanoCrit"),
  supernovaCrit: () => import("../crits/supernovaCrit"),
  galaxyCrit: () => import("../crits/galaxyCrit"),
  binaryStarCrit: () => import("../crits/binaryStarCrit"),
  pearlsCrit: () => import("../crits/pearlsCrit"),
  starBirthCrit: () => import("../crits/starBirthCrit"),
  laserCrit: () => import("../crits/laserCrit"),
  drillCrit: () => import("../crits/drillCrit"),
  quakeCrit: () => import("../crits/quakeCrit"),
  fireworksCrit: () => import("../crits/fireworksCrit"),
  shatterCrit: () => import("../crits/shatterCrit"),
  railgunCrit: () => import("../crits/railgunCrit"),
  buzzsawCrit: () => import("../crits/buzzsawCrit"),
  tractorBeamCrit: () => import("../crits/tractorBeamCrit"),
  orbitalStrikeCrit: () => import("../crits/orbitalStrikeCrit"),
  nukeCrit: () => import("../crits/nukeCrit"),
  ricochetLaserCrit: () => import("../crits/ricochetLaserCrit"),
  plasmaBallCrit: () => import("../crits/plasmaBallCrit"),
  portalCrit: () => import("../crits/portalCrit"),
  bunkerBusterCrit: () => import("../crits/bunkerBusterCrit"),
  airstrikeCrit: () => import("../crits/airstrikeCrit"),
  hyperspaceCrit: () => import("../crits/hyperspaceCrit"),
  missileSwarmCrit: () => import("../crits/missileSwarmCrit"),
  clusterBombCrit: () => import("../crits/clusterBombCrit"),
  missileDefenseCrit: () => import("../crits/missileDefenseCrit"),
  icbmCrit: () => import("../crits/icbmCrit"),
  artilleryBarrageCrit: () => import("../crits/artilleryBarrageCrit"),
};
const loading = new Map<CritMoment, Promise<unknown>>();

// loads kind's module (once)
function preloadFloorCrit(kind: CritMoment): Promise<unknown> {
  let promise = loading.get(kind);
  if (!promise) {
    promise = LOADERS[kind]().catch(() => loading.delete(kind));
    loading.set(kind, promise);
  }
  return promise;
}

// preloadFloorCrit at idle, queued once per kind
const queuedKinds = new Set<CritMoment>();
export function preloadFloorCritWhenIdle(kind: CritMoment): void {
  if (loading.has(kind) || queuedKinds.has(kind)) return;
  queuedKinds.add(kind);
  loadWhenIdle(() => {
    queuedKinds.delete(kind);
    return preloadFloorCrit(kind);
  });
}

interface PendingLaunch {
  moment: FlashMoment;
  glyphs: MomentGlyphs;
  label: string;
  flashFont: number;
  viewportWidth: number;
  shake: (intensity: number) => void;
}

// a floor crit launched before its module has loaded: it starts on the
// first frame after it has
let pending: PendingLaunch | null = null;

export function isMomentRunning(): boolean {
  return running !== null || pending !== null;
}

function plan(r: Running, bars: Point[], def: FloorCritDef): void {
  def.plan(
    r,
    bars,
    (bar, at, step = 0) => r.hits.push({ bar, at, step }),
    (bar, at, ms, haul = false) => r.lifts.push({ bar, at, ms, haul }),
  );
  r.hits.sort((a, b) => a.at - b.at);
  r.lifts.sort((a, b) => a.at - b.at);
  if (!r.endsAt)
    r.endsAt = Math.max(...r.hits.map((h) => h.at)) + (def.tailMs ?? 0);
}

function start(p: PendingLaunch, def: FloorCritDef, now: number): void {
  const { moment, glyphs, label, flashFont } = p;
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
    viewportWidth: p.viewportWidth,
    startedAt: now,
    hits: [],
    fired: 0,
    lifts: [],
    lifted: 0,
    endsAt: 0,
    lastBars: bars,
    span: { from: 0, to: 0 },
    bolts: [],
    kicked: 0,
    galaxy: null,
    shake: p.shake,
  };
  plan(running, bars, def);
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
  const launch = { moment, glyphs, label, flashFont, viewportWidth, shake };
  const def = DEFS[moment.kind];
  if (def) {
    start(launch, def, now);
    return;
  }
  pending = launch;
  preloadFloorCrit(moment.kind).then(() => {
    if (pending === launch && !DEFS[moment.kind]) pending = null;
  });
}

export function drawMoment(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  now: number,
): void {
  if (pending) {
    const def = DEFS[pending.moment.kind];
    if (!def) return;
    const launch = pending;
    pending = null;
    start(launch, def, now);
  }
  const r = running;
  if (!r) return;
  const def = DEFS[r.moment.kind]!;
  const ms = now - r.startedAt;
  const seen = r.moment.bars();
  const bars = r.lastBars.map((last, i) => seen[i] ?? last);
  r.lastBars = bars;
  while (r.lifted < r.lifts.length && r.lifts[r.lifted].at <= ms) {
    const lift = r.lifts[r.lifted++];
    r.moment.onLift?.(lift.bar, lift.ms, lift.haul);
  }
  while (r.fired < r.hits.length && r.hits[r.fired].at <= ms) {
    const { bar, step } = r.hits[r.fired++];
    r.shake(def.shake?.(step) ?? HIT_SHAKE);
    r.moment.onHit(bar, step, r.glyphs.color);
  }
  if (ms >= r.endsAt) {
    running = null;
    return;
  }
  ctx.save();
  ctx.translate(centerX, centerY);
  def.draw(ctx, r, ms, bars);
  ctx.restore();
}
