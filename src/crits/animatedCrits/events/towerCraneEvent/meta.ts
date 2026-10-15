import type { EventMeta } from "../../eventMeta";

// a crane of beams rips the lock out
export default {
  label: "Tower Crane",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    raiseMs: 300,
    swingMs: 260,
    dropMs: 260,
    heavesMs: [300, 200] as [number, number], // between heaves, quickening
    ripMs: 180,
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
