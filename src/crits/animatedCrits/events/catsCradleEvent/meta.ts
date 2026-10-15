import type { EventMeta } from "../../eventMeta";

// beams strung between wisps like a cat's cradle
export default {
  label: "Cat's Cradle",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    stringsMs: [280, 140] as [number, number], // between strings, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
