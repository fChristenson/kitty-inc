// Hands the perf rig (perf/index.html) the live game objects it drives. Only
// exposed outside production builds.
import type { Floor } from "../../gameState";

export interface PerfBridge {
  getActiveFloors: () => Floor[];
  // a floor-local point on the game canvas, in client px; null off the building
  floorToClient: (
    floor: Floor,
    x: number,
    y: number,
  ) => { x: number; y: number } | null;
  // centers a floor, or lands its upgrade button buttonAt (0..1) down the screen
  scrollToFloor: (floor: Floor, buttonAt?: number) => void;
  // swaps the per-frame redraw for wrap(redraw), so the rig can time it
  wrapRedraw: (wrap: (redraw: () => void) => () => void) => void;
  // the active company's buildings, and moving between them and companies
  buildingCount: () => number;
  goToBuilding: (index: number) => Promise<void>;
  activeCompany: () => number;
  switchCompany: (index: number) => Promise<void>;
}

let bridge: PerfBridge | null = null;
const waiting: ((bridge: PerfBridge) => void)[] = [];

export function exposePerfBridge(exposed: PerfBridge): void {
  bridge = exposed;
  for (const resolve of waiting.splice(0)) resolve(exposed);
}

export function whenPerfBridge(): Promise<PerfBridge> {
  return bridge
    ? Promise.resolve(bridge)
    : new Promise((resolve) => waiting.push(resolve));
}
