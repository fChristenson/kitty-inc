import type { EventMeta } from "../../eventMeta";

// an airbrush sprays a gold coat along each bar
export default {
  label: "Airbrush",
  style: "spray",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    passesMs: [260, 160] as [number, number], // each pass along a bar, the first bar to the last
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
