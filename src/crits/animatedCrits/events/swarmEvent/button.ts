// "Swarm" event button: crits/animatedCrits/events/swarmEvent's proc animation arms it; clicking it
// is free and starts a timed swarm sale, during which every click on this
// button pays a Sale payout from it and each of its mirrored clones (see floorInteractions)
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { CONFIG } from "../../../../config";
import {
  createTimedFloorEvent,
  registerEventButton,
  announceEventEnded,
} from "../../../../shared/floorEvents";
import { snapshotSet } from "../../../../shared/snapshotState";

import { endEventProc } from "../../eventProcs";

const armed = snapshotSet<Floor>();

export function armSwarmEvent(floor: Floor): void {
  armed.add(floor);
}

export function disarmSwarmEvent(floor: Floor): void {
  armed.delete(floor);
}

export function isSwarmEventArmed(floor: Floor, _now?: number): boolean {
  return armed.has(floor);
}

const swarmSale = createTimedFloorEvent(
  CONFIG.swarmEvent.durationMs,
  (floor) => {
    announceEventEnded(floor, "total");
    endEventProc("swarm");
  },
  true,
);

export function triggerSwarmSale(floor: Floor): void {
  swarmSale.trigger(floor);
}

export function isSwarmSaleActive(floor: Floor, now: number): boolean {
  return swarmSale.isActive(floor, now);
}

registerEventButton({
  key: "swarm",
  color: COLOR.purple,
  freeClick: true,
  isActive: isSwarmEventArmed,
  label: () => "Swarm",
});

registerEventButton({
  key: "swarmSale",
  color: COLOR.purple,
  freeClick: true,
  continues: "swarm",
  isActive: isSwarmSaleActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Swarm x${critMultiplier}` : "Swarm",
});
