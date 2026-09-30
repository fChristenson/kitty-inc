// the "Kickback" event: it covers its crit, whose click freezes the screen and
// streams coins from a random 1..maxParticipants on-screen workers/managers into
// the total-income readout, all of them flashing white and wiggling. Once the
// stream ends the total is multiplied by one more than how many took part (a
// lone worker doubles it) and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { isFloorLocked } from "../../shared/detachedJob";
import { playBoostEventStream, playSold } from "../../sound";
import {
  addTargetStream,
  createEventFx,
  removeTargetStream,
  type EventFx,
} from "../../shared/eventFx";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { multiply } from "../../shared/bigNumber";
import { pickAtMost, pickCritTierByOdds } from "../../shared/critTypes";
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
import { addTotalIncome, getTotalIncome } from "../../totalIncome";
import { drawCoins } from "../coins";
import { forceTestCrit } from "../upgradeButton";
import {
  EVENT_STREAM_DURATION_MS,
  streamCoins,
} from "../boostEvent/coinStream";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
  type OnScreenFloors,
} from "../eventProcs";
import {
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getRenderedWorkerCount,
  getWorkerCenter,
  setWorkerSpotlights,
} from "../worker";

interface Participant {
  floor: Floor;
  workerIndex: number;
  center: { x: number; y: number };
}

interface RunningKickback {
  participants: Participant[];
  fx: EventFx;
}

let running: RunningKickback | null = null;

// every worker and manager whose center is in view on an open floor
function findParticipants(
  getOnScreenFloors: OnScreenFloors | undefined,
): Participant[] {
  if (!getOnScreenFloors) return [];
  const result: Participant[] = [];
  for (const entry of getOnScreenFloors()) {
    const { floor } = entry;
    if (!floor.unlocked || isFloorLocked(floor)) continue;
    for (let i = 0; i < getRenderedWorkerCount(floor); i++) {
      const center = getWorkerCenter(floor, i);
      if (center && isVisibleOnFloor(entry, center.y))
        result.push({ floor, workerIndex: i, center });
    }
  }
  return result;
}

registerEventProc(
  {
    key: "kickback",
    chance: () => CONFIG.kickbackEvent.chance,
    isInProgress: () => running !== null,
    canArm: (_floor, { getOnScreenFloors }) =>
      !running &&
      !isScreenFrozen() &&
      findParticipants(getOnScreenFloors).length > 0,
    arm: startKickback,
  },
  { label: "Kickback", color: COLOR.blue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Kickback
export function forceKickbackEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc("kickback", floor);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  totalTarget: { x: number; y: number },
): void {
  if (!running) return;
  const now = performance.now();
  const { white, rotation } = running.fx.tension(now);
  for (const { floor, workerIndex } of running.participants) {
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(ctx, floor, workerIndex, 0, white, rotation);
    ctx.restore();
  }
  // the spotlit total, with its lights and beats, is drawn live on top by the game canvas
  drawCoins(ctx, getFloorRect, totalTarget, "overlay");
}

function startKickback(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const candidates = findParticipants(context.getOnScreenFloors);
  if (candidates.length === 0) return;
  const tier = context.critTier ?? pickCritTierByOdds();
  const participants = pickAtMost(
    candidates,
    randomInt(
      1,
      Math.min(CONFIG.kickbackEvent.maxParticipants, candidates.length),
    ),
  );
  const kickback: RunningKickback = {
    participants,
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  };
  running = kickback;
  addTargetStream(GLOBAL_SLAM, "total", kickback.fx, true);
  setWorkerSpotlights(
    participants.map(({ floor, workerIndex }) => ({
      floor,
      workerIndexes: [workerIndex],
    })),
  );
  freezeScreen(drawOverlay, { spotlightTotal: true });
  playBoostEventStream();

  // no target: the coins fly into the total (drawOverlay's totalTarget)
  streamCoins(
    participants.map(({ floor: source, center }) => ({
      floor: source,
      x: center.x,
      y: center.y,
    })),
    {
      durationMs: EVENT_STREAM_DURATION_MS,
      isRunning: () => running === kickback,
      onEachArrive: pulseHudTotalFlash,
    },
  );

  setTimeout(() => {
    if (running !== kickback) return;
    running = null;
    removeTargetStream(kickback.fx);
    clearWorkerSpotlight();
    unfreezeScreen();
    addTotalIncome(multiply(getTotalIncome(), participants.length));
    triggerHudTotalFlash();
    // the covered crit's own tier, revealed as the total jumps
    triggerEventEndSlam(GLOBAL_SLAM, "total", () =>
      context.applyTierCrit?.(floor, tier),
    );
    playSold();
    endEventProc("kickback");
  }, EVENT_STREAM_DURATION_MS);
}
