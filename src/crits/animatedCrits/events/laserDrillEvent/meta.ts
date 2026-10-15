import type { EventMeta } from "../../eventMeta";

// a drill beam bores up floor by floor into the lock
export default {
  label: "Laser Drill",
  style: "beam",
  reward: "a free floor",
  chance: 0.01,
  values: {
    punchesMs: [320, 150] as [number, number], // each floor, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
