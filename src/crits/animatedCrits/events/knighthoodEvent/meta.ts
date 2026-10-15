import type { EventMeta } from "../../eventMeta";

// a blade of light dubs the workers
export default {
  label: "Knighthood",
  style: "beam",
  reward: "worker tiers",
  chance: 0.01,
  values: {
    knightsMs: [500, 260] as [number, number], // each dubbing, quickening
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
