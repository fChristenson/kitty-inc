import type { EventMeta } from "../../eventMeta";

// birds dip into a river of cash, then plunge
export default {
  label: "Drinking Bird",
  style: "mix",
  reward: "worker perma tiers and cash",
  chance: 0.01,
  values: {
    pourMs: 300, // the river pouring in before the first dip
    dipsMs: [340, 200] as [number, number], // between dips, quickening
    staggerMs: 80, // between birds
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
