import type { EventMeta } from "../../eventMeta";

// a laser engraver rasters the bars
export default {
  label: "Engraver",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    moveMs: 220, // the head moving to a bar
    rastersMs: [600, 380] as [number, number], // each bar's raster, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
