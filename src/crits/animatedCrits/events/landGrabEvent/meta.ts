import type { EventMeta } from "../../eventMeta";

// cut lines claim regions of coins
export default {
  label: "Land Grab",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    cutsMs: [280, 160] as [number, number], // each cut, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
