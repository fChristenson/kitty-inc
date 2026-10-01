import { randomInt } from "../../utils";
import type { Floor } from "../../gameState";
import { FLOOR_W } from "../constants";
import {
  loadCoinBurstImages,
  drawCoinBurstFrame,
  getCoinRimPoint,
  getSpriteReach,
  getFullestFrame,
  COIN_SPIN_FRAME_COUNT,
  BILL_SPIN_FRAME_COUNT,
  COIN_BILL_CHANCE,
  type CoinBurstSprite,
} from "../../coinBurst";
import { createParticlePool } from "../../shared/particlePool";
import { drawTwinkle } from "../../shared/twinkle";

// shared coin-burst particle system: any UI element (upgrade button, worker, ...) can
// spawn a burst at a point and reuse the same rAF-driven physics + rendering

const MIN_SPIN_RATE = 0.04; // flipbook frames advanced per physics tick (~16.67ms)
const MAX_SPIN_RATE = 0.12;
// hard cap on simultaneously-active particles — a fast press-and-hold can fire a
// full burst (40-85 particles) every long-press tick (see shared/pressAndHold's
// LONG_PRESS_TICK_MS), spawning particles far faster than a ~1-2s lifespan
// lets them expire; without this cap a sustained hold grows the array (and every
// frame's update/draw cost) without bound instead of settling at a steady state
const MAX_PARTICLES = 750;

export async function loadCoinImage(): Promise<HTMLImageElement> {
  return loadCoinBurstImages();
}

export type CoinLayer = "world" | "overlay";

interface Particle extends CoinBurstSprite {
  floor: Floor; // which floor's screen rect to map this particle's floor-local x/y through
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  gravityRamp: number; // how fast gravity ramps up with age; lower for bills (paper) than coins (metal)
  spinRate: number; // this particle's own frames/tick speed
  spinDir: 1 | -1; // picked once per coin so a burst doesn't spin in lockstep
  homing?: HomingFlight;
  // set by a coin path: its size along the way, times size
  pathScale?: number;
}

export interface HomingBurstOptions {
  // floor-local point to fly into; omitted means drawCoins' homeTarget (the total)
  target?: { x: number; y: number };
  // "overlay" coins are only drawn by a drawCoins call for that layer (e.g. a
  // screen freeze's own overlay), never by the normal world pass
  layer?: CoinLayer;
  onFirstArrive?: () => void;
  onEachArrive?: () => void;
  // ~16.67ms ticks: how long coins pop out (random within [min, max]), and the
  // fixed tick every coin lands on — so a click's coins always arrive exactly
  // that long after it, keeping a held button's readout in step with its clicks
  burstTicks?: [number, number];
  arriveTicks?: number;
  // how many coins the burst pops out (random within [min, max])
  coins?: [number, number];
  // coins land up to this many ticks before arriveTicks, so consecutive
  // bursts overlap in flight instead of travelling as separate clumps
  arriveSpread?: number;
}

interface HomingGroup extends HomingBurstOptions {
  fired: boolean;
  // freeze bursts only: the first coin leaving its frozen spot for the target
  onFirstFlight?: () => void;
  flew?: boolean;
  // freeze bursts only: false skips the glints while they hang
  glint?: boolean;
  // spray coins only: performance.now() they all leave their frozen spots
  releaseAt?: number;
  // spray coins only: they stop spinning face-on as they land
  settleFaceOn?: boolean;
}

interface HomingFlight {
  burstLife: number; // ticks spent bursting out before being pulled in
  flightTicks: number;
  group: HomingGroup;
  // set for a freeze burst: burstLife stays Infinity until the coin tops out,
  // then it hangs there this many ticks before flying
  holdTicks?: number;
  // set for a spray coin: it flies straight from (x0, y0) to (x1, y1) in
  // outTicks, where it freezes
  spray?: SprayFlight;
}

type SprayFlight = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  outTicks: number;
  // instead of the straight line: the point at 0..1 along it, at a steady pace
  path?: CoinPath;
};

export type CoinPath = (f: number) => { x: number; y: number; scale?: number };

const HOMING_FLIGHT_TICKS = 32;
const HOMING_BURST_TICKS: [number, number] = [14, 36];
const HOMING_END_RADIUS = 8;

const pool = createParticlePool<Particle>(MAX_PARTICLES);
// screen-covering spray coins (Burst/Spray/Draw) all hang at once, so they get
// their own, larger pool instead of evicting each other at MAX_PARTICLES
const SPRAY_MAX_PARTICLES = 3_000;
const sprayPool = createParticlePool<Particle>(SPRAY_MAX_PARTICLES);

// while a fast hold keeps the pool near its cap, new bursts shrink to the room
// left (never below a small floor) so earlier coins finish their fall instead
// of being evicted mid-air
const CROWDED_BURST_MIN = 10;
function burstCount(min: number, max: number): number {
  const room = MAX_PARTICLES - pool.count();
  return Math.max(
    Math.min(CROWDED_BURST_MIN, min),
    Math.min(randomInt(min, max), room),
  );
}

export function hasActiveCoins(): boolean {
  return pool.hasActive() || sprayPool.hasActive();
}

// draws every particle onto a full-viewport overlay canvas (so a burst can never be
// clipped by the floor it started on), mapping each particle's floor-local x/y through
// getFloorRect(floor) — the floor's current on-screen rect in the overlay's own CSS
// pixel space, null if that floor isn't currently mounted/visible. homeTarget is
// where homing coins (see spawnHomingCoinBurst) end up, in that same space
export function drawCoins(
  ctx: CanvasRenderingContext2D,
  getFloorRect: (
    floor: Floor,
  ) => { left: number; top: number; width: number } | null,
  homeTarget?: { x: number; y: number },
  layer: CoinLayer = "world",
): void {
  // a burst's coins sit next to each other in the pool, so one floor's rect
  // is reused for the whole run instead of re-resolved per coin
  let rectFloor: Floor | null = null;
  let rect: { left: number; top: number; width: number } | null = null;
  const base = ctx.getTransform();
  for (const list of [pool.list, sprayPool.list])
    for (const p of list) {
      if ((p.homing?.group.layer ?? "world") !== layer) continue;
      if (p.floor !== rectFloor) {
        rectFloor = p.floor;
        rect = getFloorRect(p.floor);
      }
      if (!rect) continue;
      const scale = rect.width / FLOOR_W;
      let px = rect.left + p.x * scale;
      let py = rect.top + p.y * scale;

      const t = p.life / p.maxLife;
      let radius = p.size * (1 - t * 0.3) * scale;
      const groupTarget = p.homing?.group.target;
      const hasTarget = groupTarget !== undefined || homeTarget !== undefined;
      if (p.homing && hasTarget) {
        const targetX = groupTarget
          ? rect.left + groupTarget.x * scale
          : homeTarget!.x;
        const targetY = groupTarget
          ? rect.top + groupTarget.y * scale
          : homeTarget!.y;
        const flight = Math.max(
          0,
          (p.life - p.homing.burstLife) / p.homing.flightTicks,
        );
        // accelerates in, so it reads as being pulled into the target; timed
        // streams fly at a steady speed and shrink late, so their path stays full
        const f = Math.min(1, flight);
        const stream = p.homing.group.arriveTicks !== undefined;
        const eased = stream ? f : f * f;
        const shrink = f * f;
        const burstRadius = p.size * (p.pathScale ?? 1) * scale;
        px += (targetX - px) * eased;
        py += (targetY - py) * eased;
        radius = burstRadius + (HOMING_END_RADIUS - burstRadius) * shrink;
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = Math.max(0, 1 - t);
      }
      drawCoinBurstFrame(ctx, p, px, py, radius, base);
      if (p.homing) drawHangGlint(ctx, p, p.homing, px, py, radius);
    }
  ctx.globalAlpha = 1;
}

// a few freeze-burst coins hanging mid-air catch the light: one quick, sharp
// glint each, at its own moment of the hang, so they sparkle one by one
const HANG_GLINT_SHARE = 0.04;
const HANG_GLINT_LENGTH = 0.25; // of the hang

function drawHangGlint(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  homing: HomingFlight,
  x: number,
  y: number,
  radius: number,
): void {
  if (homing.holdTicks === undefined || homing.burstLife === Infinity) return;
  if (homing.group.glint === false) return;
  const left = homing.burstLife - p.life;
  if (left <= 0) return;
  // axisAngle is random per coin, so it picks which coins glint and when
  const pick = (Math.sin(p.axisAngle * 91.7) + 1) / 2;
  if (pick > HANG_GLINT_SHARE) return;
  const start = (pick / HANG_GLINT_SHARE) * (1 - HANG_GLINT_LENGTH);
  const hold = 1 - left / homing.holdTicks;
  const t = (hold - start) / HANG_GLINT_LENGTH;
  if (t <= 0 || t >= 1) return;
  // on the coin's upper-right rim, where light would catch its edge
  const rim = getCoinRimPoint(p, x, y, radius * 0.9, -Math.PI / 4);
  drawTwinkle(
    ctx,
    rim.x,
    rim.y,
    radius * 0.6 * Math.sin(Math.PI * t) ** 2,
    t * 2,
  );
}

function advanceCoin(p: Particle, dt: number): void {
  const homing = p.homing;
  if (homing?.spray) {
    const { spray, group } = homing;
    if (p.life < spray.outTicks) {
      p.life = Math.min(spray.outTicks, p.life + dt);
      const pos = sprayPosition(spray, p.life);
      p.x = pos.x;
      p.y = pos.y;
      if (spray.path) p.pathScale = pos.scale;
      p.spinFrame += p.spinDir * p.spinRate * dt;
      if (p.life >= spray.outTicks && group.settleFaceOn)
        p.spinFrame = getFullestFrame(p.kind);
      return;
    }
    if (homing.burstLife === Infinity) {
      if (performance.now() < (group.releaseAt ?? 0)) return;
      homing.burstLife = p.life;
      p.maxLife = p.life + homing.flightTicks;
      if (!group.flew) {
        group.flew = true;
        group.onFirstFlight?.();
      }
    }
  }
  if (homing?.holdTicks !== undefined) {
    // a freeze-burst coin topping out: it hangs right here, then flies
    if (homing.burstLife === Infinity && p.vy >= 0) {
      homing.burstLife = p.life + homing.holdTicks;
      p.maxLife = homing.burstLife + homing.flightTicks;
    }
    if (p.life < homing.burstLife && homing.burstLife !== Infinity) {
      p.life += dt;
      if (p.life >= homing.burstLife && !homing.group.flew) {
        homing.group.flew = true;
        homing.group.onFirstFlight?.();
      }
      return;
    }
  }
  if (p.homing && p.life >= p.homing.burstLife) {
    // mid-flight: drawCoins owns the position, only the spin keeps going
    p.life += dt;
    p.spinFrame += p.spinDir * p.spinRate * dt;
    const { group } = p.homing;
    if (p.life >= p.maxLife) {
      group.onEachArrive?.();
      if (!group.fired) {
        group.fired = true;
        group.onFirstArrive?.();
      }
    }
    return;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // gravity ramps up with age so coins pop up, then drop heavily rather than
  // floating — bills use a much gentler ramp (see gravityRamp's own comment)
  // since paper flutters down instead of dropping like metal
  p.vy += (p.gravity + p.life * p.gravityRamp) * dt;
  p.vx *= Math.pow(0.96, dt);
  p.life += dt;
  p.spinFrame += p.spinDir * p.spinRate * dt;
}

// spawns a coin burst at (x, y) — floor-local coordinates — and drives its own rAF
// loop, calling onFrame after each physics step. scale (1 = normal) uniformly
// scales the spawn-point offset, velocity, size, and gravity together, same
// convention as coinBurst.ts's own spawnCoinBurstAt — a bigger scale reads as a
// uniformly bigger burst, not just bigger sprites moving at normal speed
export function spawnCoinBurst(
  floor: Floor,
  x: number,
  y: number,
  onFrame: () => void,
  scale = 1,
): void {
  spawnBurstParticles(floor, x, y, scale, null);
  pool.ensureTicking((dt) => {
    pool.update(dt, advanceCoin);
    onFrame();
  });
}

const FREEZE_HOLD_TICKS: [number, number] = [12, 34];
const FREEZE_FLIGHT_TICKS: [number, number] = [24, 42];
// a freeze burst erupts this much faster and from a wider spot than a regular
// one, so its coins hang scattered across the screen instead of in one clump
const FREEZE_SPEED_BOOST = 1.9;
const FREEZE_SPAWN_SPREAD_PX = 60;

function randomIn([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

// same burst as spawnCoinBurst, but each coin freezes mid-air the moment it
// would start falling, hangs there a beat, then gets pulled into the total
export function spawnFreezeCoinBurst(
  floor: Floor,
  x: number,
  y: number,
  arrival: Pick<HomingBurstOptions, "onFirstArrive" | "onEachArrive"> & {
    onFirstFlight?: () => void;
  },
  glint = true,
): void {
  spawnBurstParticles(floor, x, y, 1, { ...arrival, fired: false, glint });
  pool.ensureTicking((dt) => pool.update(dt, advanceCoin));
}

function spawnBurstParticles(
  floor: Floor,
  x: number,
  y: number,
  scale: number,
  freezeGroup: HomingGroup | null,
): void {
  const count = burstCount(40, 85);
  for (let i = 0; i < count; i++) {
    // upward/outward hemisphere only (not fully random) so coins pop up and out
    // first, then arc back down under gravity instead of scattering downward too
    const angle = -Math.random() * Math.PI;
    const speed =
      (3 + Math.random() * 16) * scale * (freezeGroup ? FREEZE_SPEED_BOOST : 1);
    const spread = freezeGroup ? FREEZE_SPAWN_SPREAD_PX : 20 * scale;
    const kind: "coin" | "bill" =
      Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
    pool.spawn({
      floor,
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: freezeGroup ? Infinity : 45 + Math.random() * 75,
      size: (22 + Math.random() * 46) * scale * 1.15 * 1.25,
      // bills are paper — they fall a flat 0.2 slower than coins, and ramp up to
      // full fall speed more gradually
      gravity:
        Math.max(0, 0.2 + Math.random() * 0.35 - (kind === "bill" ? 0.2 : 0)) *
        scale,
      gravityRamp: (kind === "bill" ? 0.05 : 0.08) * scale,
      kind,
      spinFrame:
        Math.random() *
        (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
      spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
      spinDir: Math.random() < 0.5 ? 1 : -1,
      axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
      homing: freezeGroup
        ? {
            burstLife: Infinity,
            flightTicks: randomIn(FREEZE_FLIGHT_TICKS),
            group: freezeGroup,
            holdTicks: randomIn(FREEZE_HOLD_TICKS),
          }
        : undefined,
    });
  }
}

// same pop-out as spawnCoinBurst, but every coin then gets pulled into a
// target instead of falling away. Returns how many coins were spawned
export function spawnHomingCoinBurst(
  floor: Floor,
  x: number,
  y: number,
  options: HomingBurstOptions,
): number {
  const group: HomingGroup = { ...options, fired: false };
  const count = burstCount(...(options.coins ?? [18, 28]));
  for (let i = 0; i < count; i++) {
    const angle = -Math.random() * Math.PI;
    const speed = 3 + Math.random() * 12;
    const kind: "coin" | "bill" =
      Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
    // staggered so the coins stream into the total instead of landing at once
    const [minBurst, maxBurst] = options.burstTicks ?? HOMING_BURST_TICKS;
    const burstLife = minBurst + Math.random() * (maxBurst - minBurst);
    const flightTicks = options.arriveTicks
      ? Math.max(
          2,
          options.arriveTicks -
            Math.random() * (options.arriveSpread ?? 0) -
            burstLife,
        )
      : HOMING_FLIGHT_TICKS;
    pool.spawn({
      floor,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: burstLife + flightTicks,
      size: (22 + Math.random() * 40) * 1.15 * 1.25,
      gravity: 0.1 + Math.random() * 0.15,
      gravityRamp: 0,
      kind,
      spinFrame:
        Math.random() *
        (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
      spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
      spinDir: Math.random() < 0.5 ? 1 : -1,
      axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
      homing: { burstLife, flightTicks, group },
    });
  }

  pool.ensureTicking((dt) => {
    pool.update(dt, advanceCoin);
  });
  return count;
}

// spray coins fly at constant speed, braking to a stop only in the last 0.1s
const SPRAY_STOP_TICKS = 6;

function sprayPosition(
  s: SprayFlight,
  ticks: number,
): { x: number; y: number; scale?: number } {
  if (s.path) return s.path(Math.min(1, ticks / s.outTicks));
  const stop = Math.min(SPRAY_STOP_TICKS, s.outTicks);
  const cruise = s.outTicks - stop;
  const total = cruise + stop / 2;
  const brake = Math.max(0, ticks - cruise);
  const f =
    (Math.min(ticks, cruise) + brake - (brake * brake) / (2 * stop)) / total;
  return { x: s.x0 + (s.x1 - s.x0) * f, y: s.y0 + (s.y1 - s.y0) * f };
}

export interface SprayOptions {
  // performance.now() every coin leaves its frozen spot for the total
  releaseAt: number;
  outTicks: [number, number]; // how long each coin takes to reach its spot
  flightTicks: [number, number]; // and then to fly into the total
  onFirstFlight?: () => void;
  onFirstArrive?: () => void;
  onEachArrive?: () => void;
  // land face-on instead of mid-spin, so the coins cover their spots fully
  settleFaceOn?: boolean;
}

// one coin or bill per target (floor-local, like x/y): each is blasted out of
// (x, y) like a burst coin, lands on its target as it slows, freezes there,
// then gets pulled into the total at releaseAt. A target's maxSize caps how
// far its coin or bill may reach from the target, at any spin or tilt
export function spawnSprayCoins(
  floor: Floor,
  x: number,
  y: number,
  targets: { x: number; y: number; maxSize?: number }[],
  { releaseAt, outTicks, flightTicks, ...arrival }: SprayOptions,
): void {
  const group: HomingGroup = {
    ...arrival,
    layer: "overlay",
    fired: false,
    releaseAt,
  };
  for (const target of targets)
    spawnSprayCoin(floor, group, flightTicks, target.maxSize, {
      x0: x,
      y0: y,
      x1: target.x,
      y1: target.y,
      outTicks: randomIn(outTicks),
    });
  sprayPool.ensureTicking((dt) => sprayPool.update(dt, advanceCoin));
}

// one coin or bill per path (floor-local), each following its own path over
// outTicks, then flying straight on into the total. ages (ticks, per path)
// start a coin that far along, as if launched that much earlier
export function spawnPathCoins(
  floor: Floor,
  paths: CoinPath[],
  { outTicks, flightTicks, ...arrival }: Omit<SprayOptions, "releaseAt">,
  ages: number[] = [],
): void {
  const group: HomingGroup = { ...arrival, layer: "overlay", fired: false };
  paths.forEach((path, i) => {
    const start = path(0);
    const end = path(1);
    const flight: SprayFlight = {
      x0: start.x,
      y0: start.y,
      x1: end.x,
      y1: end.y,
      outTicks: randomIn(outTicks),
      path,
    };
    spawnSprayCoin(floor, group, flightTicks, undefined, flight, ages[i]);
  });
  sprayPool.ensureTicking((dt) => sprayPool.update(dt, advanceCoin));
}

function spawnSprayCoin(
  floor: Floor,
  group: HomingGroup,
  flightTicks: [number, number],
  maxSize: number | undefined,
  spray: SprayFlight,
  age = 0,
): void {
  const kind: "coin" | "bill" =
    Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
  const life = Math.min(Math.max(0, age), spray.outTicks);
  const at =
    life > 0 ? sprayPosition(spray, life) : { x: spray.x0, y: spray.y0 };
  sprayPool.spawn({
    floor,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    life,
    maxLife: Infinity,
    size: Math.min(
      (22 + Math.random() * 46) * 1.15 * 1.25,
      (maxSize ?? Infinity) / getSpriteReach(kind),
    ),
    gravity: 0,
    gravityRamp: 0,
    kind,
    spinFrame:
      Math.random() *
      (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
    spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
    spinDir: Math.random() < 0.5 ? 1 : -1,
    axisAngle: (Math.random() * 2 - 1) * (Math.PI / 2),
    homing: {
      burstLife: Infinity,
      flightTicks: randomIn(flightTicks),
      group,
      spray,
    },
  });
}
