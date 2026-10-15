import type { EventMeta } from "../../eventMeta";

// two beams cross on each bar
export default {
  label: "Cross-Cut",
  style: "beam",
  reward: "tiers",
  chance: 0.01,
  values: {
    sweepsMs: [420, 260] as [number, number], // each sweep, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
