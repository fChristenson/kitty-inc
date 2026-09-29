// the shared "floor event" framework behind Sale/Overtime/Frozen: a temporary,
// per-floor window that can take over the upgrade button's color/label/wiggle
// while active, plus the timing their event-click coins fly on and every
// event's start and end cues. Adding an event
// is a new file owning its own trigger/isActive (createTimedFloorEvent covers
// the plain "runs for N ms" shape) that calls registerEventButton once
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { snapshotMap } from "../snapshotState";
import { LONG_PRESS_COIN_ARRIVE_MS } from "../pressAndHold";
import { isDetachedJobRunning, liveEffect } from "../detachedJob";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../eventEndSlam";
import { playEventEnded } from "../../sound";
import {
  addTargetStream,
  createEventFx,
  removeTargetStream,
  type EventFx,
} from "../eventFx";

// a manual event's coins build their target up like a freeze event's stream,
// but only while the player keeps pressing (see createEventFx); null in
// detached runs. A full build-up takes as long as a Sale
export function startPressedStream(
  owner: object,
  part: string,
  buildUp?: () => number,
): EventFx | null {
  if (isDetachedJobRunning()) return null;
  const fx = createEventFx(CONFIG.sale.durationMs, undefined, true, buildUp);
  addTargetStream(owner, part, fx, true);
  return fx;
}

export interface TimedFloorEvent {
  trigger(floor: Floor): void;
  isActive(floor: Floor, now: number): boolean;
}

// onEnd fires once the window runs out on its own; re-triggering an active
// event extends it, so only the latest trigger's expiry counts. An event whose
// coins fly into the total builds that readout up like a freeze event's stream
export function createTimedFloorEvent(
  durationMs: number,
  onEnd?: (floor: Floor) => void,
  streamsIntoTotal = false,
): TimedFloorEvent {
  const startedAt = snapshotMap<Floor, number>();
  return {
    trigger(floor: Floor): void {
      const at = Date.now();
      startedAt.set(floor, at);
      const fx = streamsIntoTotal
        ? startPressedStream(GLOBAL_SLAM, "total")
        : null;
      setTimeout(() => {
        if (fx) removeTargetStream(fx);
        if (startedAt.get(floor) === at) onEnd?.(floor);
      }, durationMs);
    },
    isActive(floor: Floor, now: number): boolean {
      const t = startedAt.get(floor);
      return t !== undefined && now - t < durationMs;
    },
  };
}

export interface EventButtonDef {
  // unique per event
  key: string;
  // the button's fill color while this event is the active one
  color: string;
  // free clicks (Sale/Overtime) never dim for unaffordability and always count
  // as clickable; an event that still charges real money keeps normal dimming
  freeClick: boolean;
  // key of the event this one carries on from (an armed Swarm's sale), so
  // the pair plays one start cue
  continues?: string;
  isActive(floor: Floor, now: number): boolean;
  // `critMultiplier` is an also-armed plain crit's multiplier (5/25/125), else null
  label(critMultiplier: number | null): string;
}

const eventButtons: EventButtonDef[] = [];

// call once per event module at module-eval time — registration order is the
// tie-break when more than one event is active on the same floor
export function registerEventButton(def: EventButtonDef): void {
  eventButtons.push(def);
}

// the one event (if any) currently governing this floor's button appearance
export function getActiveEventButton(
  floor: Floor,
  now: number,
): EventButtonDef | null {
  for (const def of eventButtons) {
    if (def.isActive(floor, now)) return def;
  }
  return null;
}

// each floor's event whose first click has happened, and when
const eventStartHeard = new WeakMap<Floor, { key: string; at: number }>();
// an event ending this soon after its first click ends silently
const END_CUE_MIN_EVENT_MS = 2000;

// call on every upgrade-button click: notes an event button's first click;
// a click with no event active readies the next one
export const announceEventStartClick = liveEffect(
  (floor: Floor, now: number) => {
    const def = getActiveEventButton(floor, now);
    if (!def) {
      eventStartHeard.delete(floor);
      return;
    }
    const heard = eventStartHeard.get(floor);
    if (heard && (heard.key === def.key || heard.key === def.continues)) {
      heard.key = def.key;
      return;
    }
    eventStartHeard.set(floor, { key: def.key, at: Date.now() });
  },
);

// an event running out: the notification cue, with whatever its coins flew
// into slamming as it starts
export const announceEventEnded = liveEffect(
  (floor: Floor, target: "total" | "bar") => {
    const heard = eventStartHeard.get(floor);
    if (!heard || Date.now() - heard.at >= END_CUE_MIN_EVENT_MS)
      playEventEnded();
    eventStartHeard.delete(floor);
    if (target === "total") triggerEventEndSlam(GLOBAL_SLAM, "total");
    else triggerEventEndSlam(floor, "bar");
  },
);

export function isFreeClickEventActive(floor: Floor, now: number): boolean {
  return eventButtons.some((def) => def.freeClick && def.isActive(floor, now));
}

// coin physics advance in ~16.67ms frames; every event-click coin pops out
// briefly, then lands exactly LONG_PRESS_COIN_ARRIVE_MS after its click
const COIN_FRAME_MS = 16.67;
const COIN_ARRIVE_TICKS = LONG_PRESS_COIN_ARRIVE_MS / COIN_FRAME_MS;
export const EVENT_COIN_TIMING = {
  burstTicks: [COIN_ARRIVE_TICKS * 0.22, COIN_ARRIVE_TICKS * 0.45] as [
    number,
    number,
  ],
  arriveTicks: COIN_ARRIVE_TICKS,
};
