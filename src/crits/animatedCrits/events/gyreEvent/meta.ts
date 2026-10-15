import type { EventMeta } from "../../eventMeta";

// spirals of wisps screw down on workers
export default {
  label: "Gyre",
  style: "wisp",
  reward: "worker perma tiers",
  chance: 0.01,
  values: {
    dropsMs: [600, 380] as [number, number],
    overlap: 0.55, // share of a drop before the next starts
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
