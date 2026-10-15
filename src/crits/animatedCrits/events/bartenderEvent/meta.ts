import type { EventMeta } from "../../eventMeta";

// two wisps flair-toss a slug of cash, then pour it on the bars
export default {
  label: "Bartender",
  style: "mix",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    tossesMs: [380, 200] as [number, number], // each toss, quickening
    pourMs: 350, // each pour onto its bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
