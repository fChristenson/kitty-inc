import type { EventMeta } from "../../eventMeta";

// a charged hammer smashes the bars
export default {
  label: "Mjolnir",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    chargesMs: [600, 380] as [number, number], // each charge-up, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
