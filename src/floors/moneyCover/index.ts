// shared core of the money-cover events (Burst, Spray, Draw, Stream): their
// crit's click freezes the screen while the button shoots coins and bills
// straight out to spots laid out by the event (or along paths, see flow). They
// hang there, then in the last stretch merge into the total-income readout,
// which pays the floor's income times its floor number before revealing the
// covered crit itself
import type { Floor } from "../../gameState";
import { playCoinDrop, playSold } from "../../sound";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { multiply } from "../../shared/bigNumber";
import { pickCritTierByOdds, type CritTier } from "../../shared/critTypes";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../shared/totalIncomeCoins";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
  type FrameRippler,
  type FrameMotion,
} from "../../shared/screenFreeze";
import { addTotalIncome } from "../../totalIncome";
import {
  drawCoins,
  spawnPathCoins,
  spawnSprayCoins,
  type CoinPath,
} from "../coins";
import { currentPayoutAmount } from "../incomePanel";
import { getButtonCenter } from "../upgradeButton";
import { endEventProc, type EventProcContext } from "../eventProcs";

// ~16.67ms ticks: each coin's shot out of the button to its spot, then its
// flight into the total
const OUT_TICKS: [number, number] = [12, 18];
const FLIGHT_TICKS: [number, number] = [18, 29];
// a flowing coin's quick hop from its path's end into the total, at most
export const FLOW_FLIGHT_MS = 200;
// keeps the coins' spots clear of the screen's edges
const EDGE_MARGIN = 40;

type Point = { x: number; y: number; maxSize?: number };
export type CoverArea = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export interface MoneyCover {
  button: Point;
  // the whole screen, floor-local
  area: CoverArea;
  // one spot per coin, laid out by the event's own layout
  spots: Point[];
  launch(targets: Point[]): void;
  // like launch, but shot out of `from` (floor-local) instead of the button
  launchFrom(from: Point, targets: Point[]): void;
  // launches targets in order, spread evenly over durationMs
  stream(targets: Point[], durationMs: number): void;
  // launches one coin per path in order, spread evenly over durationMs; each
  // follows its path for travelMs, then hops on into the total, or with hold
  // hangs at its path's end until the merge like a spot's coin (its size
  // capped by maxSizes, per path, like a spot's maxSize)
  flow(
    paths: CoinPath[],
    durationMs: number,
    travelMs: number,
    hold?: boolean,
    maxSizes?: number[],
  ): void;
  // launches one coin per path at once, each following its path over exactly
  // travelMs and hanging at its end until the merge
  trace(paths: CoinPath[], travelMs: number): void;
  isLive(): boolean;
}

export interface MoneyCoverOptions {
  layout?: (area: CoverArea) => Point[];
  // the covered crit's tier, revealed at the end; defaults to the crit's own
  tier?: CritTier;
  // on top of the floor's income times its floor number
  rewardMultiplier?: number;
  // coins land face-on, so a drawn shape is fully covered
  settleFaceOn?: boolean;
  // the event's own drawing in the freeze overlay, under the coins;
  // totalTarget is the total-income readout, in the same world space
  drawExtra?: (
    ctx: CanvasRenderingContext2D,
    getFloorRect: FloorRectResolver,
    totalTarget: Point,
  ) => void;
  // like drawExtra, but over the coins
  drawOver?: (
    ctx: CanvasRenderingContext2D,
    getFloorRect: FloorRectResolver,
    totalTarget: Point,
  ) => void;
  // water rippling across the frozen frame
  frameRipple?: FrameRippler;
  // the frozen frame slid and zoomed
  frameMotion?: () => FrameMotion;
  // right as the screen unfreezes
  onEnd?: () => void;
}

const STREAM_INTERVAL_MS = 16;
const TICK_MS = 1000 / 60;

let running: { key: string } | null = null;

// calls launch with the items due so far, in order, spread over durationMs,
// along with how late (ms) each one is past its own due time
export function launchOver<T>(
  items: T[],
  durationMs: number,
  isLive: () => boolean,
  launch: (batch: T[], lateMs: number[]) => void,
): void {
  const startedAt = performance.now();
  let emitted = 0;
  const timer = setInterval(() => {
    if (!isLive()) return clearInterval(timer);
    const elapsed = performance.now() - startedAt;
    const due = Math.min(
      items.length,
      Math.ceil((elapsed / durationMs) * items.length),
    );
    if (due > emitted) {
      const late: number[] = [];
      for (let i = emitted; i < due; i++)
        late.push(elapsed - (i / items.length) * durationMs);
      launch(items.slice(emitted, due), late);
    }
    emitted = due;
    if (emitted >= items.length) clearInterval(timer);
  }, STREAM_INTERVAL_MS);
}

export function isMoneyCoverRunning(key?: string): boolean {
  return running !== null && (key === undefined || running.key === key);
}

export function canStartMoneyCover(context: EventProcContext): boolean {
  return (
    !running && !isScreenFrozen() && context.getScreenAreaLocal !== undefined
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: Point,
): void {
  drawCoins(ctx, getFloorRect, totalTarget, "overlay");
}

// one jittered spot per cell of a grid over the area, shuffled, so the coins
// cover all of it evenly
export function coverSpots(area: CoverArea, count: number): Point[] {
  const width = area.right - area.left - EDGE_MARGIN * 2;
  const height = area.bottom - area.top - EDGE_MARGIN * 2;
  const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const spots: Point[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      spots.push({
        x: area.left + EDGE_MARGIN + ((c + Math.random()) / cols) * width,
        y: area.top + EDGE_MARGIN + ((r + Math.random()) / rows) * height,
      });
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots;
}

export function startMoneyCover(
  key: string,
  floor: Floor,
  context: EventProcContext,
  { durationMs, mergeMs = 0 }: { durationMs: number; mergeMs?: number },
  {
    layout,
    tier: coveredTier,
    rewardMultiplier = 1,
    settleFaceOn,
    drawExtra,
    drawOver,
    frameRipple,
    frameMotion,
    onEnd,
  }: MoneyCoverOptions,
): MoneyCover | null {
  if (!canStartMoneyCover(context)) return null;
  const tier = coveredTier ?? context.critTier ?? pickCritTierByOdds();
  const floorNumber = context.floors.indexOf(floor) + 1;
  const cover = { key };
  running = cover;
  freezeScreen(
    (ctx, getFloorRect, totalTarget) => {
      drawExtra?.(ctx, getFloorRect, totalTarget);
      drawOverlay(ctx, getFloorRect, totalTarget);
      drawOver?.(ctx, getFloorRect, totalTarget);
    },
    { spotlightTotal: true, frameRipple, frameMotion },
  );

  let flew = false;
  let arrived = false;
  const arrival = {
    releaseAt: performance.now() + durationMs - mergeMs,
    outTicks: OUT_TICKS,
    flightTicks: FLIGHT_TICKS,
    onFirstFlight: () => {
      if (flew) return;
      flew = true;
      playCoinDrop();
    },
    onFirstArrive: () => {
      if (arrived) return;
      arrived = true;
      playSold();
    },
    onEachArrive: pulseHudTotalFlash,
    settleFaceOn,
  };
  const button = getButtonCenter(context.isGroundFloor);

  setTimeout(() => {
    if (running !== cover) return;
    running = null;
    onEnd?.();
    unfreezeScreen();
    addTotalIncome(
      multiply(
        currentPayoutAmount(floor, Date.now()),
        floorNumber * rewardMultiplier,
      ),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    endEventProc(key);
  }, durationMs);

  const launch = (targets: Point[]) =>
    spawnSprayCoins(floor, button.x, button.y, targets, arrival);
  const isLive = () => running === cover;
  const area = context.getScreenAreaLocal!(floor);
  return {
    button,
    area,
    spots: layout?.(area) ?? [],
    launch,
    launchFrom: (from, targets) =>
      spawnSprayCoins(floor, from.x, from.y, targets, arrival),
    stream: (targets, streamMs) =>
      launchOver(targets, streamMs, isLive, (batch) => launch(batch)),
    flow: (paths, streamMs, travelMs, hold = false, maxSizes = []) => {
      const { releaseAt: _, ...pathArrival } = arrival;
      const ticks = travelMs / TICK_MS;
      const flight = FLOW_FLIGHT_MS / TICK_MS;
      const items = paths.map((path, i) => ({ path, maxSize: maxSizes[i] }));
      // each coin starts as far along as it would be if launched on time, so
      // a batch spreads out evenly instead of leaving the button in a clump
      launchOver(items, streamMs, isLive, (batch, lateMs) =>
        spawnPathCoins(
          floor,
          batch.map((item) => item.path),
          hold
            ? { ...arrival, outTicks: [ticks * 0.97, ticks * 1.03] }
            : {
                ...pathArrival,
                outTicks: [ticks * 0.97, ticks * 1.03],
                flightTicks: [flight * 0.6, flight],
              },
          lateMs.map((ms) => ms / TICK_MS),
          batch.map((item) => item.maxSize),
        ),
      );
    },
    trace: (paths, travelMs) => {
      const ticks = travelMs / TICK_MS;
      spawnPathCoins(floor, paths, { ...arrival, outTicks: [ticks, ticks] });
    },
    isLive,
  };
}
