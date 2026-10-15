import type { EventMeta } from "../../eventMeta";

// firework shells burst into drooping bomb stars over the bars
export default {
  label: "Willow",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    riseMs: [480, 300] as [number, number], // each shell's climb, quickening
    droopMs: 420, // the stars drooping onto the bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
