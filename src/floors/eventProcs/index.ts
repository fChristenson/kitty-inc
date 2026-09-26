// the floor view's one pool of event-button procs (Boost, Hunt, ...): each
// event module registers itself, and a qualifying upgrade click calls
// maybeArmEventProc once, sharing CONFIG.eventProcs.cooldownMs across them all
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import {
  createEventProcPool,
  type EventProcDef,
} from "../../shared/eventProcPool";

// which floors currently intersect the viewport, each with its world-space top
// (the same space gameCanvas's getFloorRect reports)
export type OnScreenFloors = () => { floor: Floor; top: number }[];

type FloorEventProc = EventProcDef<Floor, OnScreenFloors | undefined>;

const pool = createEventProcPool<Floor, OnScreenFloors | undefined>(
  () => CONFIG.eventProcs.cooldownMs,
);

export function registerEventProc(def: FloorEventProc): void {
  pool.register(def);
}

export function maybeArmEventProc(
  floor: Floor,
  getOnScreenFloors: OnScreenFloors | undefined,
): void {
  pool.maybeArm(floor, getOnScreenFloors);
}
