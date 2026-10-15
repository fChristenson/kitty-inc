import type { EventMeta } from "../../eventMeta";

// a folding rule of beams unfolds along each bar
export default {
  label: "Folding Rule",
  style: "beam",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    hingesMs: [110, 60] as [number, number], // each hinge opening, the first bar to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
