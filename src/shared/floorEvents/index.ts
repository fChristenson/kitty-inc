// the shared "floor event" framework behind Sale/Overtime/Frozen: a temporary,
// per-floor window that can take over the upgrade button's color/label/wiggle
// while active, plus the timing their event-click coins fly on. Adding an event
// is a new file owning its own trigger/isActive (createTimedFloorEvent covers
// the plain "runs for N ms" shape) that calls registerEventButton once
import type { Floor } from "../../gameState";
import { snapshotMap } from "../snapshotState";
import { LONG_PRESS_COIN_ARRIVE_MS } from "../pressAndHold";

export interface TimedFloorEvent {
  trigger(floor: Floor): void;
  isActive(floor: Floor, now: number): boolean;
}

// onEnd fires once the window runs out on its own; re-triggering an active
// event extends it, so only the latest trigger's expiry counts
export function createTimedFloorEvent(
  durationMs: number,
  onEnd?: (floor: Floor) => void,
): TimedFloorEvent {
  const startedAt = snapshotMap<Floor, number>();
  return {
    trigger(floor: Floor): void {
      const at = Date.now();
      startedAt.set(floor, at);
      if (!onEnd) return;
      setTimeout(() => {
        if (startedAt.get(floor) === at) onEnd(floor);
      }, durationMs);
    },
    isActive(floor: Floor, now: number): boolean {
      const t = startedAt.get(floor);
      return t !== undefined && now - t < durationMs;
    },
  };
}

export interface EventButtonDef {
  // unique per event, used only for the odd bit of debugging/logging
  key: string;
  // the button's fill color while this event is the active one
  color: string;
  // free clicks (Sale/Overtime) never dim for unaffordability and always count
  // as clickable; an event that still charges real money keeps normal dimming
  freeClick: boolean;
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
