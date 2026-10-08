// a covered-crit event (see crits/animatedCrits/eventProcs' EventCritCover): the crit's click
// freezes the screen and plays a coin or glimmer stream + the same sfx as the
// other events,
// from the floor's button into one of its own widgets, which flashes white and
// wiggles as the coins land. Once the stream ends the event reveals and pays
// the crit's tier through onEnd
import type { Floor } from "../../../../gameState";
import { playBoostEventStream } from "../../../../sound";
import { createEventFx, type EventFx } from "../../../../shared/eventFx";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import { pickCritTierByOdds, type CritTier } from "../../../critTypes";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  drawStreamOverlay,
  EVENT_STREAM_DURATION_MS,
  type StreamKind,
} from "../../../../shared/eventStream";
import { streamFromButton } from "../boostEvent/buttonStream";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventCritCover,
  type EventProcContext,
} from "../../eventProcs";

export interface StreamTargetEventDef {
  key: string;
  cover: EventCritCover;
  // coins when it hands the target free money, glimmers when it raises a tier
  stream: StreamKind;
  chance: () => number;
  // the floor holding the widget, when it isn't the clicked floor itself;
  // null when there's none to target
  targetFloor?(floor: Floor, context: EventProcContext): Floor | null;
  // point the coins fly into, local to the target floor
  target(floor: Floor, isGroundFloor: boolean): { x: number; y: number };
  canStart(floor: Floor, context: EventProcContext): boolean;
  // leaves the target floor's widget out of the captured frame (null shows it again)
  setHidden(floor: Floor | null): void;
  // the target's part name for its end slam (see shared/eventEndSlam), if it
  // still exists once the event ends
  slamPart?: string;
  drawTarget(
    ctx: CanvasRenderingContext2D,
    floor: Floor,
    isGroundFloor: boolean,
    whiteAlpha: number,
    rotation: number,
  ): void;
  onEnd(
    floor: Floor,
    tier: CritTier,
    context: EventProcContext,
    targetFloor: Floor,
  ): void;
}

// registers the event and returns its dev test hook: arms a crit on floor
// (tier by the crit odds) that carries it
export function registerStreamTargetEvent(
  def: StreamTargetEventDef,
): (floor: Floor) => void {
  let running: {
    floor: Floor;
    isGroundFloor: boolean;
    center: { x: number; y: number }; // the target, local to its own floor
    fx: EventFx;
  } | null = null;

  // the target floor and the stream's end point in the clicked floor's space
  function resolveTarget(floor: Floor, context: EventProcContext) {
    const { getOnScreenFloors, floors } = context;
    if (!getOnScreenFloors) return null;
    const target = def.targetFloor ? def.targetFloor(floor, context) : floor;
    if (!target) return null;
    const onScreen = getOnScreenFloors();
    const source = onScreen.find((f) => f.floor === floor);
    const entry = onScreen.find((f) => f.floor === target);
    const isGroundFloor = floors.indexOf(target) === 0;
    const point = def.target(target, isGroundFloor);
    if (!source || !entry || !isVisibleOnFloor(entry, point.y)) return null;
    return {
      floor: target,
      isGroundFloor,
      center: point,
      point: { x: point.x, y: point.y + entry.top - source.top },
    };
  }

  function canStart(floor: Floor, context: EventProcContext): boolean {
    return (
      !running &&
      !isScreenFrozen() &&
      resolveTarget(floor, context) !== null &&
      def.canStart(floor, context)
    );
  }

  function drawOverlay(
    ctx: CanvasRenderingContext2D,
    getFloorRect: FloorRectResolver,
  ): void {
    const event = running;
    if (!event) return;
    drawStreamOverlay(
      ctx,
      getFloorRect,
      event.floor,
      event.fx,
      event.center.x,
      event.center.y,
      (tension) =>
        def.drawTarget(
          ctx,
          event.floor,
          event.isGroundFloor,
          tension.white,
          tension.rotation,
        ),
    );
  }

  function start(floor: Floor, context: EventProcContext): void {
    const target = resolveTarget(floor, context);
    if (!target || !canStart(floor, context)) return;
    const tier = context.critTier ?? pickCritTierByOdds();
    // the target floor's widget is what the overlay draws
    const event = {
      floor: target.floor,
      isGroundFloor: target.isGroundFloor,
      center: target.center,
      fx: createEventFx(EVENT_STREAM_DURATION_MS),
    };
    running = event;
    def.setHidden(target.floor);
    freezeScreen(drawOverlay);
    playBoostEventStream();
    streamFromButton(
      def.stream,
      floor,
      context.isGroundFloor,
      target.point,
      EVENT_STREAM_DURATION_MS,
      () => running === event,
      () => event.fx.hit(performance.now()),
    );
    setTimeout(() => {
      if (running !== event) return;
      running = null;
      def.setHidden(null);
      unfreezeScreen();
      // the crit's tier is revealed as the target jumps
      const reveal = () => def.onEnd(floor, tier, context, target.floor);
      if (def.slamPart) triggerEventEndSlam(target.floor, def.slamPart, reveal);
      else reveal();
      endEventProc(def.key);
    }, EVENT_STREAM_DURATION_MS);
  }

  registerEventProc(
    {
      key: def.key,
      chance: def.chance,
      isInProgress: () => running !== null,
      canArm: canStart,
      arm: start,
    },
    def.cover,
  );

  return (floor) => {
    forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
    forceClaimEventProc(def.key, floor);
  };
}
