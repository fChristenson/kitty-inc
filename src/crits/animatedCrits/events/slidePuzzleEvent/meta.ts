import type { EventMeta } from "../../eventMeta";

// the screen as a slide puzzle
export default {
  label: "Slide Puzzle",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    slidesMs: [150, 80] as [number, number], // each slide, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
