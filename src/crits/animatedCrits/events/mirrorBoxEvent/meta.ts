import type { EventMeta } from "../../eventMeta";

// the screen mirrors and flips
export default {
  label: "Mirror Box",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    swingsMs: [320, 160] as [number, number], // between mirror swings, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
