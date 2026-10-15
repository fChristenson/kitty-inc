import type { EventMeta } from "../../eventMeta";

// a hexagon web cinched on each bar
export default {
  label: "Laser Web",
  style: "beam",
  reward: "tiers",
  chance: 0.01,
  values: {
    websMs: [560, 380] as [number, number], // each web, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
