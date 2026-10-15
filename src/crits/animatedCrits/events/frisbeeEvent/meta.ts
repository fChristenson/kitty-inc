import type { EventMeta } from "../../eventMeta";

// a frisbee curves between catchers
export default {
  label: "Frisbee",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    throwsMs: [320, 180] as [number, number], // each throw, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
