import type { EventMeta } from "../../eventMeta";

// bell wisps ring a peal, then crash onto the bars
export default {
  label: "Bell Ringers",
  style: "wisp",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 280,
    changesMs: [160, 90] as [number, number], // between clangs, quickening
    overMs: 110, // between bells going over the top
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
