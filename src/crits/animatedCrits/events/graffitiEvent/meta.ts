import type { EventMeta } from "../../eventMeta";

// a nozzle tags the lock in zigzags of gold mist
export default {
  label: "Graffiti",
  style: "spray",
  reward: "a free floor",
  chance: 0.01,
  values: {
    strokesMs: [200, 90] as [number, number], // each stroke, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
