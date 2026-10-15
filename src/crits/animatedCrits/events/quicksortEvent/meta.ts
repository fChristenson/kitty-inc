import type { EventMeta } from "../../eventMeta";

// quicksort sorts gold columns into a staircase
export default {
  label: "Quicksort",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    swapsMs: [70, 18] as [number, number], // between swaps, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
