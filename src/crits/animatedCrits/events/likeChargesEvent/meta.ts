import type { EventMeta } from "../../eventMeta";

// repelling charges spread out, then discharge onto the bars
export default {
  label: "Like Charges",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    spreadMs: 800, // the charges shoving apart
    firesMs: [180, 90] as [number, number], // between discharges, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
