import type { EventMeta } from "../../eventMeta";

// a whirling cloud of cash tears into puffs onto the bars
export default {
  label: "Cotton Candy",
  style: "money",
  reward: "crit tiers and cash",
  chance: 0.01,
  values: {
    spinMs: 900, // spinning the cloud up
    puffsMs: [260, 160] as [number, number], // between puffs tearing off
    flyMs: 380, // a puff's flight onto its bar
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
