// the "Boost" event: once its button (see upgradeButton/boost.ts) is clicked,
// the whole screen freezes (shared/screenFreeze), a stream of coins flies from
// the button into one random on-screen worker (or manager) not yet at the top
// crit tier, and that worker flashes white, wiggles and its glow crossfades
// into the next crit tier's color over CONFIG.boostEvent.durationMs. It then
// unfreezes with the normal worker boost jump, one crit tier higher for good:
// while boosted it multiplies its floor's speed by that tier's crit multiplier
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { randomInt } from "../../utils";
import { isFloorLocked } from "../../shared/detachedJob";
import { EVENT_COIN_TIMING } from "../../shared/floorEvents";
import {
  LONG_PRESS_COIN_ARRIVE_MS,
  LONG_PRESS_TICK_MS,
} from "../../shared/pressAndHold";
import { mergeFlashWhite } from "../../shared/mergeFlash";
import { getWiggleRotation } from "../../shared/wiggle";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { drawCoins, spawnHomingCoinBurst } from "../coins";
import {
  BTN_W,
  BTN_H,
  armBoostEvent,
  getButtonCenter,
  isBoostEventArmed,
} from "../upgradeButton";
import {
  celebrateWorkerBoost,
  clearWorkerSpotlight,
  drawWorkerSpotlight,
  getBoostEventCandidates,
  getWorkerCenter,
  promoteWorkerPermaTier,
  setWorkerSpotlight,
} from "../worker";

// which floors currently intersect the viewport, each with its world-space top
// (the same space gameCanvas's getFloorRect reports)
export type OnScreenFloors = () => { floor: Floor; top: number }[];

interface RunningBoost {
  floor: Floor;
  workerIndex: number;
  growStartAt: number; // performance.now() the first coins land
}

let running: RunningBoost | null = null;
let lastProcAt = -Infinity;

// arms the button on a qualifying upgrade click, at CONFIG.boostEvent.chance,
// only while this floor still has a worker the event could pick
export function maybeArmBoostEvent(floor: Floor): void {
  if (isBoostEventArmed(floor)) return;
  const now = Date.now();
  if (now - lastProcAt < CONFIG.boostEvent.cooldownMs) return;
  if (getBoostEventCandidates(floor).length === 0) return;
  if (Math.random() < CONFIG.boostEvent.chance) {
    lastProcAt = now;
    armBoostEvent(floor);
  }
}

// dev test hook: arms the first unlocked floor that still has a worker to pick,
// ignoring chance and cooldown and never starting the cooldown itself
export function forceBoostEvent(floors: Floor[]): Floor | null {
  const floor = floors.find(
    (f) => f.unlocked && getBoostEventCandidates(f).length > 0,
  );
  if (!floor) return null;
  armBoostEvent(floor);
  return floor;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  if (!running) return;
  const now = performance.now();
  const rect = getFloorRect(running.floor);
  if (rect) {
    const { durationMs } = CONFIG.boostEvent;
    const growMs = durationMs - LONG_PRESS_COIN_ARRIVE_MS;
    const t = Math.min(1, Math.max(0, (now - running.growStartAt) / growMs));
    const eased = t * t * (3 - 2 * t);
    const envelope = now >= running.growStartAt ? 1 : 0;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawWorkerSpotlight(
      ctx,
      running.floor,
      running.workerIndex,
      eased,
      mergeFlashWhite(envelope, now),
      getWiggleRotation(now) * envelope,
    );
    ctx.restore();
  }
  drawCoins(ctx, getFloorRect, undefined, "overlay");
}

// starts the freeze sequence from sourceFloor's button; false (nothing
// happens) when no on-screen floor has a worker left to pick
export function startBoostEvent(
  sourceFloor: Floor,
  isGroundFloor: boolean,
  getOnScreenFloors: OnScreenFloors | undefined,
  persist: () => void,
): boolean {
  if (running || isScreenFrozen() || !getOnScreenFloors) return false;
  const onScreen = getOnScreenFloors();
  const sourceTop = onScreen.find((f) => f.floor === sourceFloor)?.top;
  if (sourceTop === undefined) return false;
  const candidates: {
    floor: Floor;
    top: number;
    workerIndex: number;
    center: { x: number; y: number };
  }[] = [];
  for (const { floor, top } of onScreen) {
    if (!floor.unlocked || isFloorLocked(floor)) continue;
    for (const workerIndex of getBoostEventCandidates(floor)) {
      const center = getWorkerCenter(floor, workerIndex);
      if (center) candidates.push({ floor, top, workerIndex, center });
    }
  }
  if (candidates.length === 0) return false;
  const target = candidates[randomInt(0, candidates.length - 1)];
  const { center } = target;

  const { durationMs } = CONFIG.boostEvent;
  const startedAt = performance.now();
  const boost: RunningBoost = {
    floor: target.floor,
    workerIndex: target.workerIndex,
    growStartAt: startedAt + LONG_PRESS_COIN_ARRIVE_MS,
  };
  running = boost;
  setWorkerSpotlight(target.floor, target.workerIndex);
  freezeScreen(drawOverlay);

  // coins are spawned on (and drawn through) the button's own floor, so the
  // worker's spot is converted into that floor's local coordinates
  const coinTarget = { x: center.x, y: center.y + target.top - sourceTop };
  const button = getButtonCenter(isGroundFloor);
  // one burst per press-and-hold tick, like holding the button the whole
  // time, stopping early enough that the last coins land as the freeze ends
  const coinBursts =
    Math.floor((durationMs - LONG_PRESS_COIN_ARRIVE_MS) / LONG_PRESS_TICK_MS) +
    1;
  for (let i = 0; i < coinBursts; i++) {
    setTimeout(() => {
      if (running !== boost) return;
      spawnHomingCoinBurst(
        sourceFloor,
        button.x + (Math.random() - 0.5) * (BTN_W * 0.75),
        button.y + (Math.random() - 0.5) * (BTN_H / 2),
        {
          ...EVENT_COIN_TIMING,
          target: coinTarget,
          layer: "overlay",
        },
      );
    }, i * LONG_PRESS_TICK_MS);
  }

  setTimeout(() => {
    if (running !== boost) return;
    running = null;
    clearWorkerSpotlight();
    promoteWorkerPermaTier(boost.floor, boost.workerIndex);
    unfreezeScreen();
    celebrateWorkerBoost(boost.floor, boost.workerIndex, Date.now());
    persist();
  }, durationMs);
  return true;
}
