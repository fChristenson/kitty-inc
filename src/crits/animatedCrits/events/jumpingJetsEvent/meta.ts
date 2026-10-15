import type { EventMeta } from "../../eventMeta";

// jets of cash leap bar to bar
export default {
  label: "Jumping Jets",
  style: "money",
  reward: "crit tiers + cash",
  chance: 0.01,
  values: {
    flightMs: [420, 300] as [number, number], // each leap, quickening
    leapsMs: [80, 30] as [number, number], // from a splashdown to the next leap
    slugMs: 150,
    gushMs: 380, // the last leap into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
