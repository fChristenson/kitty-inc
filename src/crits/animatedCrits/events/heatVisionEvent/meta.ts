import type { EventMeta } from "../../eventMeta";

// twin eye beams scorch workers
export default {
  label: "Heat Vision",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    aimMs: 120, // the aim lasers flickering
    fireMs: 160, // the beams searing
    gapsMs: [80, 30] as [number, number], // between workers, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
