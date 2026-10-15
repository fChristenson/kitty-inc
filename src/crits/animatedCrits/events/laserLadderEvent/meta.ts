import type { EventMeta } from "../../eventMeta";

// rungs of beams climb to the lock
export default {
  label: "Laser Ladder",
  style: "beam",
  reward: "unlock",
  chance: 0.01,
  values: {
    rungsMs: [150, 70] as [number, number], // between rungs, quickening
    fireMs: 300, // the whole ladder firing into the lock
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
