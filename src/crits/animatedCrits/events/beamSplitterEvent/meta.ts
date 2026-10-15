import type { EventMeta } from "../../eventMeta";

// a beam splits into a tree of beams onto the bars
export default {
  label: "Beam Splitter",
  style: "beam",
  reward: "tiers",
  chance: 0.01,
  values: {
    genMs: [320, 180] as [number, number], // each generation, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
