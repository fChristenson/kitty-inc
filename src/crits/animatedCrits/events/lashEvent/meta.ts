import type { EventMeta } from "../../eventMeta";

// a whip of lightning cracks on the bars
export default {
  label: "Lash",
  style: "lightning",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    windMs: 400, // the wind-up
    cracksMs: [340, 170] as [number, number], // between cracks, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
