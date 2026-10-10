// floor crits playing a crit's number out onto the income bars in view once
// its flash has slammed in and sat (see critTypes' FloorCritKind), and income
// crits playing it onto the total income (its one "bar"). Each kind is
// its own module under ../crits (../../incomeCrits/crits), loaded when its
// crit is armed or played; every hit calls back so the floors or the total
// can jolt and land their reward
import { coolDownFloorCrits, type CritPlayKind } from "../../critTypes";
import { fadeStops, type FadeStops } from "../../../shared/glowSprite";
import type { Bolt } from "../../../shared/lightning";
import type { Disk, Orbit } from "../../../shared/galaxy";
import type { BarLaunch } from "../../../shared/barLaunch";
import { loadWhenIdle } from "../../../shared/idle";

export interface Point {
  x: number;
  y: number;
}

export interface FloorCritPlay {
  kind: CritPlayKind;
  // the bars it can land on, from the flash's middle in its units, its own
  // floor's first; read every frame so a scroll carries them along
  bars: () => Point[];
  barHalfWidth: number;
  // a hit on bars()[bar] by a number of `color`; step is a snowball's
  // growth so far; spill is its share of a full hit's coin spill, share its
  // share of all the crit's hits
  onHit: (
    bar: number,
    step: number,
    color: string,
    spill: number,
    share?: number,
  ) => void;
  // bars()[bar] leaping off its floor for ms, landing back down (or hauled
  // up, held and dropped)
  onLift?: (bar: number, ms: number, haul: boolean) => void;
  // bars()[bar] crumbling away from its left end over crumbleMs, gone for
  // holdMs, then rebuilt from its left end over rebuildMs
  onCrumble?: (
    bar: number,
    crumbleMs: number,
    holdMs: number,
    rebuildMs: number,
  ) => void;
  // bars()[bar] blasting off to the right like a rocket and back from the left
  onRocket?: (bar: number, launch: BarLaunch) => void;
  // bars()[bar] heating to white-hot over heatMs, held there for holdMs
  onHeat?: (bar: number, heatMs: number, holdMs: number) => void;
  // bars()[bar] shorted out, dark but for blips, for deadMs
  onShort?: (bar: number, deadMs: number) => void;
  // bars()[bar]'s own income bar drawn centred on (0, 0), washed `flash` white
  drawBar?: (ctx: CanvasRenderingContext2D, bar: number, flash: number) => void;
  // these bars are drawn by the crit itself (drawBar); null gives them back
  hideBars?: (bars: number[] | null) => void;
}

// the flash's own baked "x0123456789" glyphs (see critFlash's SpinGlyphs)
export interface FloorCritGlyphs {
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

export interface PlannedCrumble {
  bar: number;
  at: number;
  crumbleMs: number;
  holdMs: number;
  rebuildMs: number;
}

export interface PlannedRocket {
  bar: number;
  at: number;
  launch: BarLaunch;
}

export interface PlannedHeat {
  bar: number;
  at: number;
  heatMs: number;
  holdMs: number;
}

export interface PlannedShort {
  bar: number;
  at: number;
  deadMs: number;
}

export interface Running {
  play: FloorCritPlay;
  glyphs: FloorCritGlyphs;
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
  crumbles: PlannedCrumble[];
  crumbled: number;
  rockets: PlannedRocket[];
  launched: number;
  heats: PlannedHeat[];
  heated: number;
  shorts: PlannedShort[];
  shorted: number;
  endsAt: number;
  // where each bar was last seen, if one scrolls out of bars()
  lastBars: Point[];
  // a catapult's fall: from this height to that one
  span: { from: number; to: number };
  // a lightning crit's bolts, their ends kept on the bars as they scroll
  bolts: Bolt[];
  // shakes a floor crit has kicked itself, off its hits (a blast, a collapse)
  kicked: number;
  // a galaxy crit's disk and its stars, planned at launch
  galaxy: { disk: Disk; stars: Orbit[] } | null;
  shake: (intensity: number) => void;
}

let running: Running | null = null;

// the font the number plays out at, in the flash's units (about twice a
// bar's height)
export const FLOOR_CRIT_FONT = 200;
export const HIT_SHAKE = 0.5;
// a crit's hits spill this many full hits' worth of coins between them, so a
// barrage of fifty hits doesn't flood the coin pool during a held button
const SPILL_HITS = 16;

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
  glyphs: FloorCritGlyphs,
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
  x: bars[bar].x + side * (r.play.barHalfWidth - 120),
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
    at.x + r.play.barHalfWidth * 0.5,
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
    crumble: (
      bar: number,
      at: number,
      crumbleMs: number,
      holdMs: number,
      rebuildMs: number,
    ) => void,
    rocket: (bar: number, at: number, launch: BarLaunch) => void,
    heat: (bar: number, at: number, heatMs: number, holdMs: number) => void,
    short: (bar: number, at: number, deadMs: number) => void,
  ): void;
  draw: Draw;
  // how long it keeps drawing after its last hit
  tailMs?: number;
  // the shake a hit kicks, by its step
  shake?: (step: number) => number;
}

const DEFS: Partial<Record<CritPlayKind, FloorCritDef>> = {};

// each kind's module calls this once it loads
export function registerFloorCrit(kind: CritPlayKind, def: FloorCritDef): void {
  DEFS[kind] = def;
}

const LOADERS: Record<CritPlayKind, () => Promise<unknown>> = {
  windfallCrit: () => import("../../incomeCrits/crits/windfallCrit"),
  bulletHoseCrit: () => import("../../incomeCrits/crits/bulletHoseCrit"),
  boltMagnetCrit: () => import("../../incomeCrits/crits/boltMagnetCrit"),
  bombLobCrit: () => import("../../incomeCrits/crits/bombLobCrit"),
  haloDiveCrit: () => import("../../incomeCrits/crits/haloDiveCrit"),
  victoryLapCrit: () => import("../../incomeCrits/crits/victoryLapCrit"),
  ceilingBounceCrit: () => import("../../incomeCrits/crits/ceilingBounceCrit"),
  drillBitCrit: () => import("../../incomeCrits/crits/drillBitCrit"),
  gulpCrit: () => import("../../incomeCrits/crits/gulpCrit"),
  goldCoatCrit: () => import("../../incomeCrits/crits/goldCoatCrit"),
  pegboardCrit: () => import("../../incomeCrits/crits/pegboardCrit"),
  starFlingCrit: () => import("../../incomeCrits/crits/starFlingCrit"),
  moneySpoutCrit: () => import("../../incomeCrits/crits/moneySpoutCrit"),
  salvoCrit: () => import("../../incomeCrits/crits/salvoCrit"),
  lightPillarsCrit: () => import("../../incomeCrits/crits/lightPillarsCrit"),
  bankShotCrit: () => import("../../incomeCrits/crits/bankShotCrit"),
  bombletsCrit: () => import("../../incomeCrits/crits/bombletsCrit"),
  mortarsCrit: () => import("../../incomeCrits/crits/mortarsCrit"),
  arcChainCrit: () => import("../../incomeCrits/crits/arcChainCrit"),
  sweepUpCrit: () => import("../../incomeCrits/crits/sweepUpCrit"),
  corkPopCrit: () => import("../../incomeCrits/crits/corkPopCrit"),
  homingMissilesCrit: () =>
    import("../../incomeCrits/crits/homingMissilesCrit"),
  skyrocketsCrit: () => import("../../incomeCrits/crits/skyrocketsCrit"),
  rapidFireCrit: () => import("../crits/rapidFireCrit"),
  pinballCrit: () => import("../crits/pinballCrit"),
  snowballCrit: () => import("../crits/snowballCrit"),
  juggleCrit: () => import("../crits/juggleCrit"),
  stompCrit: () => import("../crits/stompCrit"),
  rainCrit: () => import("../crits/rainCrit"),
  stampCrit: () => import("../crits/stampCrit"),
  catapultCrit: () => import("../crits/catapultCrit"),
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
  crashLandingCrit: () => import("../crits/crashLandingCrit"),
  saberCrit: () => import("../crits/saberCrit"),
  liftoffCrit: () => import("../crits/liftoffCrit"),
  gunshipCrit: () => import("../crits/gunshipCrit"),
  freezeRayCrit: () => import("../crits/freezeRayCrit"),
  missileTangleCrit: () => import("../crits/missileTangleCrit"),
  windmillCrit: () => import("../crits/windmillCrit"),
  saturnCrit: () => import("../crits/saturnCrit"),
  beatmapCrit: () => import("../crits/beatmapCrit"),
  meltdownCrit: () => import("../crits/meltdownCrit"),
  crunchCrit: () => import("../crits/crunchCrit"),
  atomsCrit: () => import("../crits/atomsCrit"),
  reactorCrit: () => import("../crits/reactorCrit"),
  staticCrit: () => import("../crits/staticCrit"),
  empCrit: () => import("../crits/empCrit"),
  inspiralCrit: () => import("../crits/inspiralCrit"),
  thunderstormCrit: () => import("../crits/thunderstormCrit"),
  shotgunCrit: () => import("../crits/shotgunCrit"),
  solarFlareCrit: () => import("../crits/solarFlareCrit"),
  flakCrit: () => import("../crits/flakCrit"),
  revolverCrit: () => import("../crits/revolverCrit"),
  geysersCrit: () => import("../crits/geysersCrit"),
  plasmaCannonCrit: () => import("../crits/plasmaCannonCrit"),
  grenadesCrit: () => import("../crits/grenadesCrit"),
  rocketPodsCrit: () => import("../crits/rocketPodsCrit"),
  bankShotsCrit: () => import("../crits/bankShotsCrit"),
  minigunCrit: () => import("../crits/minigunCrit"),
  claymoresCrit: () => import("../crits/claymoresCrit"),
  strafeCrit: () => import("../crits/strafeCrit"),
  coinShotCrit: () => import("../crits/coinShotCrit"),
  rodsCrit: () => import("../crits/rodsCrit"),
  ionCannonCrit: () => import("../crits/ionCannonCrit"),
  boltWhipCrit: () => import("../crits/boltWhipCrit"),
  designatorCrit: () => import("../crits/designatorCrit"),
  beamSplitterCrit: () => import("../crits/beamSplitterCrit"),
  teslaCannonCrit: () => import("../crits/teslaCannonCrit"),
};
const loading = new Map<CritPlayKind, Promise<unknown>>();

// loads kind's module (once)
function preloadFloorCrit(kind: CritPlayKind): Promise<unknown> {
  let promise = loading.get(kind);
  if (!promise) {
    promise = LOADERS[kind]().catch(() => loading.delete(kind));
    loading.set(kind, promise);
  }
  return promise;
}

// preloadFloorCrit at idle, queued once per kind
const queuedKinds = new Set<CritPlayKind>();
export function preloadFloorCritWhenIdle(kind: CritPlayKind): void {
  if (loading.has(kind) || queuedKinds.has(kind)) return;
  queuedKinds.add(kind);
  loadWhenIdle(() => {
    queuedKinds.delete(kind);
    return preloadFloorCrit(kind);
  });
}

interface PendingLaunch {
  play: FloorCritPlay;
  glyphs: FloorCritGlyphs;
  label: string;
  flashFont: number;
  viewportWidth: number;
  shake: (intensity: number) => void;
}

// a floor crit launched before its module has loaded: it starts on the
// first frame after it has
let pending: PendingLaunch | null = null;

export function isFloorCritRunning(): boolean {
  return running !== null || pending !== null;
}

function plan(r: Running, bars: Point[], def: FloorCritDef): void {
  def.plan(
    r,
    bars,
    (bar, at, step = 0) => r.hits.push({ bar, at, step }),
    (bar, at, ms, haul = false) => r.lifts.push({ bar, at, ms, haul }),
    (bar, at, crumbleMs, holdMs, rebuildMs) =>
      r.crumbles.push({ bar, at, crumbleMs, holdMs, rebuildMs }),
    (bar, at, launch) => r.rockets.push({ bar, at, launch }),
    (bar, at, heatMs, holdMs) => r.heats.push({ bar, at, heatMs, holdMs }),
    (bar, at, deadMs) => r.shorts.push({ bar, at, deadMs }),
  );
  r.hits.sort((a, b) => a.at - b.at);
  r.lifts.sort((a, b) => a.at - b.at);
  r.crumbles.sort((a, b) => a.at - b.at);
  r.rockets.sort((a, b) => a.at - b.at);
  r.heats.sort((a, b) => a.at - b.at);
  r.shorts.sort((a, b) => a.at - b.at);
  if (!r.endsAt)
    r.endsAt = Math.max(...r.hits.map((h) => h.at)) + (def.tailMs ?? 0);
}

function start(p: PendingLaunch, def: FloorCritDef, now: number): void {
  const { play, glyphs, label, flashFont } = p;
  const chars = [...label].map(glyphs.index);
  if (chars.some((i) => i < 0)) return;
  const bars = play.bars();
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
    play,
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
    crumbles: [],
    crumbled: 0,
    rockets: [],
    launched: 0,
    heats: [],
    heated: 0,
    shorts: [],
    shorted: 0,
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

export function launchFloorCrit(
  play: FloorCritPlay,
  glyphs: FloorCritGlyphs,
  label: string,
  flashFont: number,
  viewportWidth: number,
  now: number,
  shake: (intensity: number) => void,
): void {
  const launch = { play, glyphs, label, flashFont, viewportWidth, shake };
  const def = DEFS[play.kind];
  if (def) {
    start(launch, def, now);
    return;
  }
  pending = launch;
  preloadFloorCrit(play.kind).then(() => {
    if (pending === launch && !DEFS[play.kind]) pending = null;
  });
}

export function drawFloorCrit(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  now: number,
): void {
  if (pending) {
    const def = DEFS[pending.play.kind];
    if (!def) return;
    const launch = pending;
    pending = null;
    start(launch, def, now);
  }
  const r = running;
  if (!r) return;
  const def = DEFS[r.play.kind]!;
  const ms = now - r.startedAt;
  const seen = r.play.bars();
  const bars = r.lastBars.map((last, i) => seen[i] ?? last);
  r.lastBars = bars;
  while (r.lifted < r.lifts.length && r.lifts[r.lifted].at <= ms) {
    const lift = r.lifts[r.lifted++];
    r.play.onLift?.(lift.bar, lift.ms, lift.haul);
  }
  while (r.crumbled < r.crumbles.length && r.crumbles[r.crumbled].at <= ms) {
    const c = r.crumbles[r.crumbled++];
    r.play.onCrumble?.(c.bar, c.crumbleMs, c.holdMs, c.rebuildMs);
  }
  while (r.launched < r.rockets.length && r.rockets[r.launched].at <= ms) {
    const rocket = r.rockets[r.launched++];
    r.play.onRocket?.(rocket.bar, rocket.launch);
  }
  while (r.heated < r.heats.length && r.heats[r.heated].at <= ms) {
    const h = r.heats[r.heated++];
    r.play.onHeat?.(h.bar, h.heatMs, h.holdMs);
  }
  while (r.shorted < r.shorts.length && r.shorts[r.shorted].at <= ms) {
    const s = r.shorts[r.shorted++];
    r.play.onShort?.(s.bar, s.deadMs);
  }
  const spill = Math.min(1, SPILL_HITS / r.hits.length);
  while (r.fired < r.hits.length && r.hits[r.fired].at <= ms) {
    const { bar, step } = r.hits[r.fired++];
    r.shake(def.shake?.(step) ?? HIT_SHAKE);
    r.play.onHit(bar, step, r.glyphs.color, spill, 1 / r.hits.length);
  }
  if (ms >= r.endsAt) {
    running = null;
    r.play.hideBars?.(null);
    coolDownFloorCrits();
    return;
  }
  ctx.save();
  ctx.translate(centerX, centerY);
  def.draw(ctx, r, ms, bars);
  ctx.restore();
}
