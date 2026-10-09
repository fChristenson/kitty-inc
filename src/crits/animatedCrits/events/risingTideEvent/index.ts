// the "Rising Tide" event: it covers its crit, whose click freezes the screen
// while blue water (shared/water) floods up the building from below the
// street; each floor's income bar it reaches slams and rises to the highest
// floor tier among the floors in view (see ../floodLift). Then the water
// fades, the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh, startWaterLoop } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWater, WATER_WAVE } from "../../../../shared/water";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  drawFloodBars,
  hideFloodBars,
  liftFloor,
  planFloodLift,
  type FloodLift,
} from "../../floodLift";

const KEY = "risingTide";
// the water starts this far below the screen and ends this far above it
const BELOW = 80;
const ABOVE = 120;

interface RunningTide {
  floor: Floor;
  lift: FloodLift;
  // local to the clicked floor
  left: number;
  right: number;
  fromY: number;
  toY: number;
  startedAt: number;
}

let running: RunningTide | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.risingTideEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      planFloodLift(floor, context) !== null,
    arm: startTide,
  },
  { label: "Rising Tide", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Rising Tide
export function forceRisingTideEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the surface's height ms in, easing in and out of its rise
function surfaceY(tide: RunningTide, ms: number): number {
  const u = Math.min(1, Math.max(0, ms / CONFIG.risingTideEvent.riseMs));
  const e = (1 - Math.cos(Math.PI * u)) / 2;
  return tide.fromY + (tide.toY - tide.fromY) * e;
}

// when the surface reaches local height y
function reachAt(tide: RunningTide, y: number): number {
  const e = (tide.fromY - y) / (tide.fromY - tide.toY);
  return (CONFIG.risingTideEvent.riseMs * Math.acos(1 - 2 * e)) / Math.PI;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const tide = running;
  if (!tide) return;
  const now = performance.now();
  const ms = now - tide.startedAt;
  drawFloodBars(ctx, getFloorRect, tide.lift, now);
  const rect = getFloorRect(tide.floor);
  if (!rect) return;
  const { riseMs, fadeMs } = CONFIG.risingTideEvent;
  const surface = surfaceY(tide, ms);
  ctx.save();
  ctx.translate(rect.left, rect.top);
  drawWater(
    ctx,
    {
      origin: { x: tide.left, y: 0 },
      along: { x: 1, y: 0 },
      inward: { x: 0, y: 1 },
      length: tide.right - tide.left,
    },
    () => surface,
    Math.max(0, tide.fromY - surface) + WATER_WAVE,
    Math.max(0, 1 - Math.max(0, ms - riseMs) / fadeMs),
    now,
  );
  ctx.restore();
}

function startTide(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const area = context.getScreenAreaLocal?.(floor);
  const lift = planFloodLift(floor, context);
  if (!area || !lift) return;
  const { riseMs, fadeMs, holdMs } = CONFIG.risingTideEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const tide: RunningTide = {
    floor,
    lift,
    left: area.left,
    right: area.right,
    fromY: area.bottom + BELOW,
    toY: area.top - ABOVE,
    startedAt: performance.now(),
  };
  running = tide;
  const isLive = () => running === tide;
  hideFloodBars(lift);
  freezeScreen(drawOverlay);
  playSwoosh();
  const stopSound = startWaterLoop();

  for (const lifted of lift.floors)
    if (lifted.raises)
      setTimeout(() => {
        if (isLive()) liftFloor(lifted, lift.target);
      }, reachAt(tide, lifted.bar.y));

  setTimeout(stopSound, riseMs);
  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      hideFloodBars(null);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    riseMs + fadeMs + holdMs,
  );
}
