import type { EventMeta } from "../../eventMeta";

// wisps pass loads of cash up to the total
export default {
  label: "Bucket Brigade",
  style: "mix",
  reward: "cash",
  chance: 0.01,
  values: {
    lineUpMs: 300, // the line forming
    gapsMs: [220, 90] as [number, number], // between loads, quickening
    hopMs: 80, // each hand to hand
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
