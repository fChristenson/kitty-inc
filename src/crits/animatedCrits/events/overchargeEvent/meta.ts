import type { EventMeta } from "../../eventMeta";

// the bars fire bolts into the lock
export default {
  label: "Overcharge",
  style: "lightning",
  reward: "a free floor",
  chance: 0.01,
  values: {
    firesMs: [320, 160] as [number, number], // between bolts, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
