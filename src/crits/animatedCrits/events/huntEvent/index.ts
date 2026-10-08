// the "Hunt" event: once its button (see upgradeButton/hunt.ts) is clicked,
// the screen freezes and the same glimmer stream + sfx as the Boost event
// (crits/animatedCrits/events/boostEvent) flies from the button into the on-screen mouse. When it
// ends the mouse grows, turns red and restarts its time on screen; clicking
// it then (see src/mouse) also multiplies the player's total income
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { createEventFx, type EventFx } from "../../../../shared/eventFx";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  drawHuntTargetStill,
  getHuntTarget,
  isHuntTargetHunted,
  markHuntTarget,
  onHuntTargetGone,
} from "../../../../shared/huntTarget";
import { armHuntEvent, isHuntEventArmed } from "./button";
import {
  drawStreamOverlay,
  EVENT_STREAM_DURATION_MS,
} from "../../../../shared/eventStream";
import { streamFromButton } from "../boostEvent/buttonStream";
import {
  endEventProc,
  isVisibleOnFloor,
  registerEventProc,
  trackEventProc,
  type OnScreenFloors,
} from "../../eventProcs";

interface RunningHunt {
  floor: Floor;
  center: { x: number; y: number };
  fx: EventFx;
}

let running: RunningHunt | null = null;

function isTargetOnScreen(getOnScreenFloors: OnScreenFloors | undefined) {
  const target = getHuntTarget();
  if (!target || !getOnScreenFloors) return null;
  const onScreen = getOnScreenFloors();
  const entry = onScreen.find((f) => f.floor === target.floor);
  if (!entry || !isVisibleOnFloor(entry, target.y)) return null;
  return { target, top: entry.top, onScreen };
}

// only while the mouse is on screen; in progress until the hunted mouse is gone
registerEventProc({
  key: "hunt",
  chance: () => CONFIG.huntEvent.chance,
  isInProgress: (floor) =>
    running !== null || isHuntEventArmed(floor) || isHuntTargetHunted(),
  canArm: (_floor, { getOnScreenFloors }) =>
    isTargetOnScreen(getOnScreenFloors) !== null,
  arm: armHuntEvent,
});
onHuntTargetGone(() => endEventProc("hunt"));

// dev test hook: arms the mouse's own floor, ignoring chance and cooldown
export function forceHuntEvent(): Floor | null {
  const target = getHuntTarget();
  if (!target) return null;
  armHuntEvent(target.floor);
  trackEventProc("hunt", target.floor);
  return target.floor;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const hunt = running;
  if (!hunt) return;
  drawStreamOverlay(
    ctx,
    getFloorRect,
    hunt.floor,
    hunt.fx,
    hunt.center.x,
    hunt.center.y,
    (tension) =>
      drawHuntTargetStill(ctx, hunt.floor, tension.white, tension.rotation),
  );
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
  const hunt: RunningHunt = {
    floor: target.floor,
    center: { x: target.x, y: target.y },
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  };
  running = hunt;
  freezeScreen(drawOverlay);
  playBoostEventStream();
  streamFromButton(
    "glimmers",
    sourceFloor,
    isGroundFloor,
    { x: target.x, y: target.y + top - sourceTop },
    durationMs,
    () => running === hunt,
    () => hunt.fx.hit(performance.now()),
  );

  setTimeout(() => {
    if (running !== hunt) return;
    running = null;
    markHuntTarget();
    unfreezeScreen();
    triggerEventEndSlam(hunt.floor, "mouse");
  }, durationMs);
  return true;
}
