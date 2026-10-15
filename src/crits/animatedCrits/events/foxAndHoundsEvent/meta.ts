import type { EventMeta } from "../../eventMeta";

// hounds chase a darting fox
export default {
  label: "Fox and Hounds",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    dartsMs: [240, 120] as [number, number], // each dart, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
