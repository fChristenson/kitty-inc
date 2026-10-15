import type { EventMeta } from "../../eventMeta";

// charged wisps streak across, sparking onto every bar their tracks cross
export default {
  label: "Spark Chamber",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    trackMs: [700, 420] as [number, number], // each particle's streak, quickening
    gapMs: 120, // between particles
    levelShare: 0.02, // per spark
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
