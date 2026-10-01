// shared core of the money-cover events (Burst, Spray): their crit's click
// freezes the screen while the button shoots coins and bills straight out to
// spots covering the whole screen. They hang there, then in the last stretch
// merge into the total-income readout, which pays the floor's income times its
// floor number before revealing the covered crit itself
import type { Floor } from "../../gameState";
import { playCoinDrop, playSold } from "../../sound";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { multiply } from "../../shared/bigNumber";
import { pickCritTierByOdds } from "../../shared/critTypes";
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

type Point = { x: number; y: number };

export interface MoneyCover {
  button: Point;
  // the screen-covering spots, one per coin, in no visible order
  spots: Point[];
  launch(targets: Point[]): void;
  isLive(): boolean;
}

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
function coverSpots(
  area: { left: number; top: number; right: number; bottom: number },
  count: number,
): Point[] {
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
  coins: number,
  { durationMs, mergeMs }: { durationMs: number; mergeMs: number },
): MoneyCover | null {
  if (!canStartMoneyCover(context)) return null;
  const tier = context.critTier ?? pickCritTierByOdds();
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
  };
  const button = getButtonCenter(context.isGroundFloor);

  setTimeout(() => {
    if (running !== cover) return;
    running = null;
    unfreezeScreen();
    addTotalIncome(
      multiply(currentPayoutAmount(floor, Date.now()), floorNumber),
    );
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    endEventProc(key);
  }, durationMs);

  return {
    button,
    spots: coverSpots(context.getScreenAreaLocal!(floor), coins),
    launch: (targets) =>
      spawnSprayCoins(floor, button.x, button.y, targets, arrival),
    isLive: () => running === cover,
  };
}
