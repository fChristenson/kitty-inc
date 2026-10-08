// the "Swarm" event: a rare upgrade click (crits/animatedCrits/eventProcs' shared pool)
// freezes the screen and plays a coin stream + the same sfx as the Boost/Hunt
// events, from that button into the closest unlocked floor's button above and
// below it (one stream at an end of the building). Those buttons become exact
// live clones of the pressed one (state, text, crits, press animations and
// clicks, see upgradeButton/shared.ts's mirrorUpgradeButton), which flashes
// white and wiggles as the coins land and is left armed as the "Swarm" event
// button (see upgradeButton/swarm.ts)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { LONG_PRESS_COIN_ARRIVE_MS } from "../../../../shared/pressAndHold";
import { createEventFx, type EventFx } from "../../../../shared/eventFx";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import { isFloorLocked } from "../../../../shared/detachedJob";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getButtonCenter,
  mirrorUpgradeButton,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import { armSwarmEvent, isSwarmEventArmed, isSwarmSaleActive } from "./button";
import {
  drawEventStreams,
  EVENT_STREAM_DURATION_MS,
} from "../../../../shared/eventStream";
import { streamFromButton } from "../boostEvent/buttonStream";
import { registerEventProc, trackEventProc } from "../../eventProcs";

interface SwarmTarget {
  floor: Floor;
  isGroundFloor: boolean;
  point: { x: number; y: number }; // its button center, in the source floor's local space
}

interface RunningSwarm {
  // the pressed button first, then every button that gets a stream (with the
  // effects around it)
  buttons: { floor: Floor; isGroundFloor: boolean; fx?: EventFx }[];
}

let running: RunningSwarm | null = null;

registerEventProc({
  key: "swarm",
  chance: () => CONFIG.swarmEvent.chance,
  isInProgress: (floor) =>
    running !== null ||
    isSwarmEventArmed(floor) ||
    isSwarmSaleActive(floor, Date.now()),
  canArm: (floor, { floors, getOnScreenFloors, getFloorRect }) =>
    !running &&
    !isScreenFrozen() &&
    getOnScreenFloors !== undefined &&
    getOnScreenFloors().some((f) => f.floor === floor) &&
    findTargets(floor, floors, getFloorRect).length > 0,
  arm: (floor, { floors, isGroundFloor, getFloorRect }) =>
    startSwarmEvent(floor, isGroundFloor, floors, getFloorRect),
});

function isOpenFloor(floor: Floor): boolean {
  return floor.unlocked && !isFloorLocked(floor);
}

// the closest open floor above and below the source
function findTargets(
  source: Floor,
  floors: Floor[],
  getFloorRect: FloorRectResolver | undefined,
): SwarmTarget[] {
  const index = floors.indexOf(source);
  const sourceTop = getFloorRect?.(source)?.top;
  if (index < 0 || sourceTop === undefined) return [];
  const neighbours: number[] = [];
  const above = floors.findIndex((f, i) => i > index && isOpenFloor(f));
  if (above >= 0) neighbours.push(above);
  for (let i = index - 1; i >= 0; i--) {
    if (!isOpenFloor(floors[i])) continue;
    neighbours.push(i);
    break;
  }
  const targets: SwarmTarget[] = [];
  for (const i of neighbours) {
    const top = getFloorRect?.(floors[i])?.top;
    if (top === undefined) continue;
    const center = getButtonCenter(i === 0);
    targets.push({
      floor: floors[i],
      isGroundFloor: i === 0,
      point: { x: center.x, y: center.y + top - sourceTop },
    });
  }
  return targets;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  if (!running) return;
  // the pressed button flashes along with the streams it sends out
  const lead = running.buttons.find((button) => button.fx)?.fx;
  const leadWhite = lead?.tension(performance.now()).white ?? 0;
  for (const { floor, isGroundFloor, fx } of running.buttons) {
    const rect = getFloorRect(floor);
    if (!rect) continue;
    ctx.save();
    ctx.translate(rect.left, rect.top);
    const draw = (whiteAlpha: number) =>
      drawUpgradeButtonSpotlight(ctx, floor, isGroundFloor, whiteAlpha);
    if (fx) {
      const center = getButtonCenter(isGroundFloor);
      fx.draw(ctx, center.x, center.y, (tension) => draw(tension.white));
    } else draw(leadWhite);
    ctx.restore();
  }
  drawEventStreams(ctx, getFloorRect);
}

// also the dev test hook (ignores chance and cooldown); false while another
// freeze is running or no other open floor is there to stream into
export function startSwarmEvent(
  source: Floor,
  isGroundFloor: boolean,
  floors: Floor[],
  getFloorRect: FloorRectResolver | undefined,
): boolean {
  if (running || isScreenFrozen()) return false;
  const targets = findTargets(source, floors, getFloorRect);
  if (targets.length === 0) return false;
  const receivers = targets.map((target) => ({
    ...target,
    fx: createEventFx(EVENT_STREAM_DURATION_MS),
  }));
  const swarm: RunningSwarm = {
    buttons: [{ floor: source, isGroundFloor }, ...receivers],
  };
  running = swarm;
  trackEventProc("swarm", source);
  // the receiving buttons become exact live clones of the pressed one for as
  // long as its Swarm lasts
  mirrorUpgradeButton(
    source,
    targets,
    () =>
      running === swarm ||
      isSwarmEventArmed(source) ||
      isSwarmSaleActive(source, Date.now()),
  );
  setUpgradeButtonSpotlights(swarm.buttons.map((b) => b.floor));
  freezeScreen(drawOverlay);
  playBoostEventStream();
  for (const target of receivers) {
    streamFromButton(
      "coins",
      source,
      isGroundFloor,
      target.point,
      EVENT_STREAM_DURATION_MS,
      () => running === swarm,
      () => target.fx.hit(performance.now()),
    );
  }

  // armed as the first coins land, so the white flash plays on wiggling Swarm buttons
  setTimeout(() => {
    if (running === swarm) armSwarmEvent(source);
  }, LONG_PRESS_COIN_ARRIVE_MS);
  setTimeout(() => {
    if (running !== swarm) return;
    running = null;
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    for (const target of targets) triggerEventEndSlam(target.floor, "button");
  }, EVENT_STREAM_DURATION_MS);
  return true;
}
