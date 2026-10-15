import type { EventMeta } from "../../eventMeta";

// a rivet gun hops along the bars firing rivets into them
export default {
  label: "Riveter",
  style: "gunfire",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    rivetsMs: [140, 70] as [number, number], // between rivets, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
