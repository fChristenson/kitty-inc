// the event streams every freeze event plays into its target: either coins
// (the floor coin system, see registerCoinStream) or lights (the wisp), each
// spawned in bursts per press-and-hold tick from one or more sources, shared
// out so any number of sources adds up to one steady, gapless stream. Coins
// are for handing the target free money, lights for raising its tier and
// similar upgrades
import type { Floor } from "../../gameState";
import type { EventFx, StreamTension } from "../eventFx";
import { EVENT_COIN_TIMING } from "../floorEvents";
import { LONG_PRESS_COIN_ARRIVE_MS, LONG_PRESS_TICK_MS } from "../pressAndHold";
import type { FloorRectResolver } from "../screenFreeze";
import { drawWisp, WISP_SIZE, WISP_TRAIL_MS } from "../wisp";

type Point = { x: number; y: number };

// the whole event freeze, matching arcadeSlotWin.wav's audible length
export const EVENT_STREAM_DURATION_MS = 1_800;
const STREAM_ARRIVE_SPREAD_TICKS = 6;

export type StreamKind = "coins" | "glimmers";

export interface StreamSource {
  floor: Floor;
  x: number;
  y: number;
  // each burst starts somewhere within this box around (x, y)
  spreadX?: number;
  spreadY?: number;
  // floor-local to this source's floor; overrides the stream's own target
  target?: Point;
}

export interface StreamOptions {
  // floor-local to each source's floor; omitted means the total income
  target?: Point;
  durationMs: number;
  isRunning: () => boolean;
  onEachArrive?: () => void;
  // every source streams a whole stream's coins instead of sharing one
  fullPerSource?: boolean;
}

// the coin side lives with the floors' coin system, which registers it here
export interface CoinBurstRequest {
  target?: Point;
  layer: "overlay";
  onEachArrive?: () => void;
  burstTicks: [number, number];
  arriveTicks: number;
  coins: [number, number];
  arriveSpread: number;
}

interface CoinStreamer {
  burst(floor: Floor, x: number, y: number, request: CoinBurstRequest): void;
  draw(
    ctx: CanvasRenderingContext2D,
    getFloorRect: FloorRectResolver,
    homeTarget?: Point,
  ): void;
}

let coinStreamer: CoinStreamer | null = null;

export function registerCoinStream(streamer: CoinStreamer): void {
  coinStreamer = streamer;
}

// 0..1, eased: a spotlit target growing from the first arrivals until the
// stream started at startedAt ends
export function streamGrowth(startedAt: number, now: number): number {
  const growMs = EVENT_STREAM_DURATION_MS - LONG_PRESS_COIN_ARRIVE_MS;
  const t = Math.min(
    1,
    Math.max(0, (now - startedAt - LONG_PRESS_COIN_ARRIVE_MS) / growMs),
  );
  return t * t * (3 - 2 * t);
}

// calls spawn() once per press-and-hold tick over durationMs, stopping early
// enough that the last arrivals land as it ends; stops once isRunning is false
function scheduleEventStream(
  durationMs: number,
  arriveMs: number,
  isRunning: () => boolean,
  spawn: () => void,
): void {
  const bursts = Math.floor((durationMs - arriveMs) / LONG_PRESS_TICK_MS) + 1;
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      if (isRunning()) spawn();
    }, i * LONG_PRESS_TICK_MS);
  }
}

const sourcePoint = (s: StreamSource) => ({
  x: s.x + (Math.random() - 0.5) * (s.spreadX ?? 0),
  y: s.y + (Math.random() - 0.5) * (s.spreadY ?? 0),
});

export function streamCoins(
  sources: StreamSource[],
  { target, durationMs, isRunning, onEachArrive, fullPerSource }: StreamOptions,
): void {
  if (sources.length === 0 || !coinStreamer) return;
  const streamer = coinStreamer;
  // shared out so many sources still add up to about one stream's coins
  const shares = fullPerSource ? 1 : sources.length;
  const coins: [number, number] = [
    Math.max(1, Math.round(18 / shares)),
    Math.max(2, Math.round(28 / shares)),
  ];
  scheduleEventStream(durationMs, LONG_PRESS_COIN_ARRIVE_MS, isRunning, () => {
    for (const s of sources) {
      const from = sourcePoint(s);
      streamer.burst(s.floor, from.x, from.y, {
        ...EVENT_COIN_TIMING,
        target: s.target ?? target,
        layer: "overlay",
        onEachArrive,
        coins,
        arriveSpread: STREAM_ARRIVE_SPREAD_TICKS,
      });
    }
  });
}

// lights: each a wisp flying its own curve into the target, one leaving a
// source (taking turns) every LIGHT_EVERY_TICKS
const GLIMMER_TRAVEL_MS: [number, number] = [380, 480];
const LIGHT_EVERY_TICKS = 4;
// how far a light's path bows out to one side, of the distance it flies
const GLIMMER_BEND: [number, number] = [0.15, 0.4];

interface Glimmer {
  floor: Floor;
  from: Point;
  // floor-local; null flies into the total
  target: Point | null;
  bend: number;
  launchAt: number;
  arriveAt: number;
}

let glimmers: Glimmer[] = [];

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

export function streamGlimmers(
  sources: StreamSource[],
  { target, durationMs, isRunning, onEachArrive }: StreamOptions,
): void {
  if (sources.length === 0) return;
  let tick = 0;
  let turn = Math.floor(Math.random() * sources.length);
  scheduleEventStream(durationMs, GLIMMER_TRAVEL_MS[1], isRunning, () => {
    if (tick++ % LIGHT_EVERY_TICKS !== 0) return;
    const s = sources[turn++ % sources.length];
    const now = performance.now();
    const travel = between(GLIMMER_TRAVEL_MS);
    glimmers.push({
      floor: s.floor,
      from: sourcePoint(s),
      target: s.target ?? target ?? null,
      bend: between(GLIMMER_BEND) * (Math.random() < 0.5 ? -1 : 1),
      launchAt: now,
      arriveAt: now + travel,
    });
    setTimeout(() => {
      if (isRunning()) onEachArrive?.();
    }, travel);
  });
}

// where a light is p (0..1) along its curve, in world space
function glimmerPoint(from: Point, to: Point, bend: number, p: number): Point {
  // pulled in ever faster, like a homing coin
  const t = p ** 1.6;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = (from.x + to.x) / 2 - dy * bend;
  const cy = (from.y + to.y) / 2 + dx * bend;
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}

function drawGlimmers(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  homeTarget: Point | undefined,
): void {
  const now = performance.now();
  // kept on past arriving while their trails fade
  glimmers = glimmers.filter((g) => now < g.arriveAt + WISP_TRAIL_MS);
  for (const g of glimmers) {
    const rect = getFloorRect(g.floor);
    if (!rect) continue;
    const from = { x: rect.left + g.from.x, y: rect.top + g.from.y };
    const to = g.target
      ? { x: rect.left + g.target.x, y: rect.top + g.target.y }
      : homeTarget;
    if (!to) continue;
    drawWisp(
      ctx,
      (t) =>
        t < g.launchAt || t > g.arriveAt
          ? null
          : glimmerPoint(
              from,
              to,
              g.bend,
              (t - g.launchAt) / (g.arriveAt - g.launchAt),
            ),
      now,
      now,
      WISP_SIZE,
    );
  }
}

// every stream's coins and glimmers still in flight; homeTarget (world space)
// is where streams without a target fly, the total-income readout
export function drawEventStreams(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  homeTarget?: Point,
): void {
  coinStreamer?.draw(ctx, getFloorRect, homeTarget);
  drawGlimmers(ctx, getFloorRect, homeTarget);
}

// the freeze overlay of a stream into one floor's target at (x, y), local to
// that floor: its effects with drawTarget in between, then the streams in flight
export function drawStreamOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  floor: Floor,
  fx: EventFx,
  x: number,
  y: number,
  drawTarget: (tension: StreamTension) => void,
): void {
  const rect = getFloorRect(floor);
  if (rect) {
    ctx.save();
    ctx.translate(rect.left, rect.top);
    fx.draw(ctx, x, y, drawTarget);
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}
