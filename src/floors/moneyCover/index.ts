// shared core of the money-cover events (Burst, Spray, Draw): their crit's
// click freezes the screen while the button shoots coins and bills straight
// out to spots laid out by the event. They hang there, then in the last
// stretch merge into the total-income readout, which pays the floor's income
// times its floor number before revealing the covered crit itself
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
} from "../../shared/screenFreeze";
import { addTotalIncome } from "../../totalIncome";
import { drawCoins, spawnSprayCoins } from "../coins";
import { currentPayoutAmount } from "../incomePanel";
import { getButtonCenter } from "../upgradeButton";
import { endEventProc, type EventProcContext } from "../eventProcs";

// ~16.67ms ticks: each coin's shot out of the button to its spot, then its
// flight into the total
const OUT_TICKS: [number, number] = [12, 18];
const FLIGHT_TICKS: [number, number] = [18, 29];
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
  // one spot per coin, laid out by the event's own layout
  spots: Point[];
  launch(targets: Point[]): void;
  // launches targets in order, spread evenly over durationMs
  stream(targets: Point[], durationMs: number): void;
  isLive(): boolean;
}

export interface MoneyCoverOptions {
  layout: (area: CoverArea) => Point[];
  // the covered crit's tier, revealed at the end; defaults to the crit's own
  tier?: CritTier;
  // on top of the floor's income times its floor number
  rewardMultiplier?: number;
  // coins land face-on, so a drawn shape is fully covered
  settleFaceOn?: boolean;
}

const STREAM_INTERVAL_MS = 16;

let running: { key: string } | null = null;

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
  { durationMs, mergeMs }: { durationMs: number; mergeMs: number },
  {
    layout,
    tier: coveredTier,
    rewardMultiplier = 1,
    settleFaceOn,
  }: MoneyCoverOptions,
): MoneyCover | null {
  if (!canStartMoneyCover(context)) return null;
  const tier = coveredTier ?? context.critTier ?? pickCritTierByOdds();
  const floorNumber = context.floors.indexOf(floor) + 1;
  const cover = { key };
  running = cover;
  freezeScreen(drawOverlay, { spotlightTotal: true });

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
  return {
    button,
    spots: layout(context.getScreenAreaLocal!(floor)),
    launch,
    stream: (targets, streamMs) => {
      const startedAt = performance.now();
      let emitted = 0;
      const timer = setInterval(() => {
        if (!isLive()) return clearInterval(timer);
        const due = Math.min(
          targets.length,
          Math.ceil(
            ((performance.now() - startedAt) / streamMs) * targets.length,
          ),
        );
        if (due > emitted) launch(targets.slice(emitted, due));
        emitted = due;
        if (emitted >= targets.length) clearInterval(timer);
      }, STREAM_INTERVAL_MS);
    },
    isLive,
  };
}
