// the "Hunt" event: once its button (see upgradeButton/hunt.ts) is clicked,
// the screen freezes and the same coin stream + sfx as the Boost event
// (floors/boostEvent) flies from the button into the on-screen mouse. When it
// ends the mouse grows, turns red and restarts its time on screen; clicking
// it then (see src/mouse) also multiplies the player's total income
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { playBoostEventStream } from "../../sound";
import { LONG_PRESS_COIN_ARRIVE_MS } from "../../shared/pressAndHold";
import { mergeFlashWhite } from "../../shared/mergeFlash";
import { getWiggleRotation } from "../../shared/wiggle";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  drawHuntTargetStill,
  getHuntTarget,
  markHuntTarget,
} from "../../shared/huntTarget";
import { drawCoins } from "../coins";
import { armHuntEvent, isHuntEventArmed } from "../upgradeButton";
import { EVENT_STREAM_DURATION_MS, streamEventCoins } from "../boostEvent";
import { registerEventProc, type OnScreenFloors } from "../eventProcs";

let running: { floor: Floor; firstCoinsAt: number } | null = null;

function isTargetOnScreen(getOnScreenFloors: OnScreenFloors | undefined) {
  const target = getHuntTarget();
  if (!target || !getOnScreenFloors) return null;
  const onScreen = getOnScreenFloors();
  const top = onScreen.find((f) => f.floor === target.floor)?.top;
  return top === undefined ? null : { target, top, onScreen };
}

// only while the mouse is on screen
registerEventProc({
  key: "hunt",
  chance: () => CONFIG.huntEvent.chance,
  isArmed: isHuntEventArmed,
  canArm: (_floor, getOnScreenFloors) =>
    isTargetOnScreen(getOnScreenFloors) !== null,
  arm: armHuntEvent,
});

// dev test hook: arms the mouse's own floor, ignoring chance and cooldown
export function forceHuntEvent(): Floor | null {
  const target = getHuntTarget();
  if (!target) return null;
  armHuntEvent(target.floor);
  return target.floor;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  if (!running) return;
  const rect = getFloorRect(running.floor);
  if (rect) {
    const now = performance.now();
    // same flash/wiggle as the Boost event's worker, once the first coins land
    const envelope = now >= running.firstCoinsAt ? 1 : 0;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    drawHuntTargetStill(
      ctx,
      running.floor,
      mergeFlashWhite(envelope, now),
      getWiggleRotation(now) * envelope,
    );
    ctx.restore();
  }
  drawCoins(ctx, getFloorRect, undefined, "overlay");
}

// starts the freeze sequence from sourceFloor's button; false (nothing
// happens) when the mouse is no longer on screen
export function startHuntEvent(
  sourceFloor: Floor,
  isGroundFloor: boolean,
  getOnScreenFloors: OnScreenFloors | undefined,
): boolean {
  if (running || isScreenFrozen()) return false;
  const found = isTargetOnScreen(getOnScreenFloors);
  if (!found) return false;
  const sourceTop = found.onScreen.find((f) => f.floor === sourceFloor)?.top;
  if (sourceTop === undefined) return false;
  const { target, top } = found;

  const durationMs = EVENT_STREAM_DURATION_MS;
  const hunt = {
    floor: target.floor,
    firstCoinsAt: performance.now() + LONG_PRESS_COIN_ARRIVE_MS,
  };
  running = hunt;
  freezeScreen(drawOverlay);
  playBoostEventStream();
  streamEventCoins(
    sourceFloor,
    isGroundFloor,
    { x: target.x, y: target.y + top - sourceTop },
    durationMs,
    () => running === hunt,
  );

  setTimeout(() => {
    if (running !== hunt) return;
    running = null;
    markHuntTarget();
    unfreezeScreen();
  }, durationMs);
  return true;
}
