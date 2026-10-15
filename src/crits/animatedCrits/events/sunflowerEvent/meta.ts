import type { EventMeta } from "../../eventMeta";

// a chain of blasts races round a sunflower spiral of bombs into its heart
export default {
  label: "Sunflower",
  style: "explosion",
  reward: "levels",
  chance: 0.01,
  values: {
    growMs: 360, // the seeds popping out
    chainMs: [55, 22] as [number, number], // between blasts, quickening
    levelShare: 0.05,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
