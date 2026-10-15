import type { EventMeta } from "../../eventMeta";

// shells burst over the bars
export default {
  label: "Airburst",
  style: "explosion",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    gapsMs: [480, 320] as [number, number], // between shells, quickening
    climbMs: 380, // each shell's climb
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
