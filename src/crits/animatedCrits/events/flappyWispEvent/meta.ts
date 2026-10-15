import type { EventMeta } from "../../eventMeta";

// a wisp flaps through gaps in pillars of light
export default {
  label: "Flappy Wisp",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    pillarsMs: [320, 180] as [number, number], // between pillars, quickening
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
