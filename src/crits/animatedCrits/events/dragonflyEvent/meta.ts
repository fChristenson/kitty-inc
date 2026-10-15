import type { EventMeta } from "../../eventMeta";

// a dragonfly wisp darts and hovers from worker to worker
export default {
  label: "Dragonfly",
  style: "wisp",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    dartMs: 160, // each dart
    hoversMs: [280, 140] as [number, number], // each hover, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
