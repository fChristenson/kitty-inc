import type { EventMeta } from "../../eventMeta";

// a frog wisp hops across lanes of cash traffic
export default {
  label: "Lane Hopper",
  style: "experiment",
  reward: "hires + cash",
  chance: 0.01,
  values: {
    hopsMs: [150, 90] as [number, number], // each hop, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
