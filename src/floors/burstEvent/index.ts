// the "Burst" event: it covers its crit, whose click freezes the screen while
// the button blows out one instant explosion of coins and bills covering the
// whole screen. They hang where they land, then in the last
// stretch merge into the total-income readout, which pays the floor's income
// times its floor number before revealing the covered crit itself
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playCoinDrop, playExplosion, playSold } from "../../sound";
import { shakeScreen } from "../../screenShake";
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
import { forceTestCrit, getButtonCenter } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";

const COINS = 300;
// ~16.67ms ticks: each coin's blast out of the button to its spot, then its
// flight into the total
const OUT_TICKS: [number, number] = [12, 18];
const FLIGHT_TICKS: [number, number] = [18, 29];
const EXPLOSION_SHAKE = 1.1;
// keeps the coins' spots clear of the screen's edges
const EDGE_MARGIN = 40;

let running: object | null = null;

registerEventProc(
  {
    key: "burst",
    chance: () => CONFIG.burstEvent.chance,
    isInProgress: () => running !== null,
    canArm: (_floor, { getScreenAreaLocal }) =>
      !running && !isScreenFrozen() && getScreenAreaLocal !== undefined,
    arm: startBurst,
  },
  { label: "Burst", color: COLOR.moneyGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Burst
export function forceBurstEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc("burst", floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  drawCoins(ctx, getFloorRect, totalTarget, "overlay");
}

// one jittered spot per cell of a grid over the area, shuffled, so the coins
// cover all of it evenly but land in no visible order
function coverSpots(
  area: { left: number; top: number; right: number; bottom: number },
  count: number,
): { x: number; y: number }[] {
  const width = area.right - area.left - EDGE_MARGIN * 2;
  const height = area.bottom - area.top - EDGE_MARGIN * 2;
  const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const spots: { x: number; y: number }[] = [];
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

function startBurst(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen() || !context.getScreenAreaLocal) return;
  const tier = context.critTier ?? pickCritTierByOdds();
  const floorNumber = context.floors.indexOf(floor) + 1;
  const { durationMs, mergeMs } = CONFIG.burstEvent;
  const burst = {};
  running = burst;
  freezeScreen(drawOverlay, { spotlightTotal: true });

  const releaseAt = performance.now() + durationMs - mergeMs;
  let flew = false;
  let arrived = false;
  const arrival = {
    releaseAt,
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
  spawnSprayCoins(
    floor,
    button.x,
    button.y,
    coverSpots(context.getScreenAreaLocal(floor), COINS),
    arrival,
  );
  playExplosion();
  shakeScreen(EXPLOSION_SHAKE);

  setTimeout(() => {
    if (running !== burst) return;
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
    endEventProc("burst");
  }, durationMs);
}
